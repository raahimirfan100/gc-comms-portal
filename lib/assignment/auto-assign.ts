import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type SupabaseClient = ReturnType<typeof createSupabaseClient<Database>>;

/** One entry from Settings → Priority numbers (app_config key: priority_duty_entries). */
export interface PriorityDutyEntry {
  id: string;
  phone_digits: string;
  name: string;
  duty_slug: string;
  overflow_behavior: "unassign_one" | "reassign_to_duty" | "allow_overflow";
  reassign_duty_slug?: string | null;
}

function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "").replace(/^0+/, "") || "";
}

/** Canonical form for comparison: strip leading 92 (Pakistan) or 1 (US) so stored +92XXXXXXXXXX matches list entry XXXXXXXXXX. */
function canonicalDigits(digits: string): string {
  if (digits.length === 12 && digits.startsWith("92")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

function findPriorityEntry(
  phone: string | null | undefined,
  entries: PriorityDutyEntry[],
): PriorityDutyEntry | undefined {
  const digits = normalizePhone(phone);
  if (!digits.length || !entries.length) return undefined;
  const canonical = canonicalDigits(digits);
  return entries.find((e) => {
    const entryCanonical = canonicalDigits(e.phone_digits);
    return (
      canonical === entryCanonical ||
      canonical.endsWith(entryCanonical) ||
      entryCanonical.endsWith(canonical)
    );
  });
}

interface AssignmentResult {
  volunteerId: string;
  driveId: string;
  dutyId: string;
  dutyName: string;
  status: "assigned" | "waitlisted";
}

interface DriveDutyWithDetails {
  id: string;
  drive_id: string;
  duty_id: string;
  calculated_capacity: number;
  manual_capacity_override: number | null;
  current_assigned: number;
  duties: {
    name: string;
    slug: string;
    gender_restriction: "male" | "female" | null;
  } | null;
}

export async function autoAssignVolunteer(
  supabase: SupabaseClient,
  volunteerId: string,
  driveId: string,
  assignedBy: string = "auto",
): Promise<AssignmentResult | null> {
  // Check if already assigned
  const { data: existing } = await supabase
    .from("assignments")
    .select("id")
    .eq("volunteer_id", volunteerId)
    .eq("drive_id", driveId)
    .single();

  if (existing) return null;

  // Get volunteer info
  const { data: volunteer } = await supabase
    .from("volunteers")
    .select("id, gender, phone")
    .eq("id", volunteerId)
    .single();

  if (!volunteer) return null;

  // Get drive duties with capacity info
  const { data: driveDuties } = await supabase
    .from("drive_duties")
    .select("*, duties(name, slug, gender_restriction)")
    .eq("drive_id", driveId);

  if (!driveDuties || driveDuties.length === 0) return null;

  // Get assignment rules config
  const { data: configRow } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "assignment_rules")
    .single();

  const config = (configRow?.value as {
    history_lookback?: string;
    male_priority_order?: string[];
    female_priority_order?: string[];
    waitlist_auto_fill?: boolean;
  }) || {};

  // Priority duty entries (Settings → Priority numbers)
  const { data: priorityEntriesRow } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "priority_duty_entries")
    .maybeSingle();

  let priorityEntries: PriorityDutyEntry[] = [];
  if (priorityEntriesRow?.value != null) {
    const raw = priorityEntriesRow.value;
    priorityEntries = Array.isArray(raw)
      ? raw
      : typeof raw === "string"
        ? (() => {
            try {
              const parsed = JSON.parse(raw) as unknown;
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })()
        : [];
  }

  // Get volunteer's duty history
  const { data: history } = await supabase
    .from("assignments")
    .select("duty_id, duties(slug)")
    .eq("volunteer_id", volunteerId)
    .not("status", "in", '("cancelled","no_show","waitlisted")');

  // Helper: check if a duty has capacity
  function hasCapacity(dd: DriveDutyWithDetails): boolean {
    const cap = dd.manual_capacity_override ?? dd.calculated_capacity;
    return dd.current_assigned < cap;
  }

  // Helper: check gender restriction
  function genderAllowed(dd: DriveDutyWithDetails): boolean {
    const restriction = dd.duties?.gender_restriction;
    if (!restriction) return true;
    return restriction === volunteer!.gender;
  }

  // Helper: try to assign to a specific duty
  async function tryAssign(
    dd: DriveDutyWithDetails,
  ): Promise<AssignmentResult | null> {
    if (!genderAllowed(dd) || !hasCapacity(dd)) return null;

    const { error } = await supabase.from("assignments").insert({
      volunteer_id: volunteerId,
      drive_id: driveId,
      duty_id: dd.duty_id,
      status: "assigned",
      assigned_by: assignedBy,
    });

    if (error) return null;

    return {
      volunteerId,
      driveId,
      dutyId: dd.duty_id,
      dutyName: dd.duties?.name || "Unknown",
      status: "assigned",
    };
  }

  // Helper: assign to a duty ignoring capacity (used for daig priority phones)
  async function tryAssignAllowOverflow(
    dd: DriveDutyWithDetails,
  ): Promise<AssignmentResult | null> {
    if (!genderAllowed(dd)) return null;

    const { error } = await supabase.from("assignments").insert({
      volunteer_id: volunteerId,
      drive_id: driveId,
      duty_id: dd.duty_id,
      status: "assigned",
      assigned_by: assignedBy,
    });

    if (error) return null;

    return {
      volunteerId,
      driveId,
      dutyId: dd.duty_id,
      dutyName: dd.duties?.name || "Unknown",
      status: "assigned",
    };
  }

  // Step 0: Priority duty entries (Settings → Priority numbers) — assign to configured duty, apply overflow behavior
  const priorityEntry = findPriorityEntry(
    (volunteer as { phone?: string }).phone,
    priorityEntries,
  );
  if (priorityEntry) {
    const priorityDuty = driveDuties.find(
      (d) => d.duties?.slug === priorityEntry.duty_slug,
    ) as DriveDutyWithDetails | undefined;
    if (priorityDuty) {
      const result = await tryAssignAllowOverflow(priorityDuty);
      if (result) {
        if (priorityEntry.overflow_behavior === "allow_overflow") {
          return result;
        }
        // unassign_one or reassign_to_duty: free one slot by moving one volunteer
        const { data: otherAssignments } = await supabase
          .from("assignments")
          .select("id, volunteer_id")
          .eq("drive_id", driveId)
          .eq("duty_id", priorityDuty.duty_id)
          .neq("volunteer_id", volunteerId)
          .limit(1);

        if (otherAssignments?.length) {
          const row = otherAssignments[0];
          await supabase.from("assignments").delete().eq("id", row.id);
          if (priorityEntry.overflow_behavior === "reassign_to_duty" && priorityEntry.reassign_duty_slug) {
            const targetDd = driveDuties.find(
              (d) => d.duties?.slug === priorityEntry.reassign_duty_slug,
            ) as DriveDutyWithDetails | undefined;
            const { data: displacedVol } = await supabase
              .from("volunteers")
              .select("gender")
              .eq("id", row.volunteer_id)
              .single();
            const displacedGenderAllowed =
              !targetDd?.duties?.gender_restriction ||
              targetDd.duties.gender_restriction === displacedVol?.gender;
            if (targetDd && hasCapacity(targetDd) && displacedGenderAllowed) {
              await supabase.from("assignments").insert({
                volunteer_id: row.volunteer_id,
                drive_id: driveId,
                duty_id: targetDd.duty_id,
                status: "assigned",
                assigned_by: assignedBy,
              });
            } else {
              await autoAssignVolunteer(supabase, row.volunteer_id, driveId, assignedBy);
            }
          } else {
            await autoAssignVolunteer(supabase, row.volunteer_id, driveId, assignedBy);
          }
        }
        return result;
      }
    }
  }

  // Step 1: If repeat volunteer, try past duties by frequency
  if (history && history.length > 0) {
    const dutyFrequency: Record<string, number> = {};
    history.forEach((h) => {
      dutyFrequency[h.duty_id] = (dutyFrequency[h.duty_id] || 0) + 1;
    });

    const sortedDutyIds = Object.entries(dutyFrequency)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);

    for (const dutyId of sortedDutyIds) {
      const dd = driveDuties.find(
        (d) => d.duty_id === dutyId,
      ) as DriveDutyWithDetails | undefined;
      if (!dd) continue;
      const result = await tryAssign(dd);
      if (result) return result;
    }
  }

  // Step 2: First-timer path or all past duties full
  const priorityOrder =
    volunteer.gender === "female"
      ? config.female_priority_order || [
          "thaal",
          "female-provider",
          "female-dari",
          "provider",
          "dari",
          "sherbet",
        ]
      : config.male_priority_order || [
          "provider",
          "dari",
          "traffic",
          "daig",
          "thaal",
          "sherbet",
        ];

  for (const slug of priorityOrder) {
    const dd = driveDuties.find(
      (d) => d.duties?.slug === slug,
    ) as DriveDutyWithDetails | undefined;
    if (!dd) continue;
    const result = await tryAssign(dd);
    if (result) return result;
  }

  // Step 3: All duties full — add to waitlist
  const { data: waitlistCount } = await supabase
    .from("assignments")
    .select("id", { count: "exact" })
    .eq("drive_id", driveId)
    .eq("status", "waitlisted");

  const firstDuty = driveDuties.find((d) =>
    genderAllowed(d as DriveDutyWithDetails),
  );

  if (firstDuty) {
    await supabase.from("assignments").insert({
      volunteer_id: volunteerId,
      drive_id: driveId,
      duty_id: firstDuty.duty_id,
      status: "waitlisted",
      assigned_by: assignedBy,
      waitlist_position: (waitlistCount?.length || 0) + 1,
    });

    return {
      volunteerId,
      driveId,
      dutyId: firstDuty.duty_id,
      dutyName: (firstDuty as DriveDutyWithDetails).duties?.name || "Unknown",
      status: "waitlisted",
    };
  }

  return null;
}

export async function batchAutoAssign(
  supabase: SupabaseClient,
  driveId: string,
  assignedBy: string = "auto",
): Promise<AssignmentResult[]> {
  // Get all volunteers available for this drive who don't have an assignment yet
  const { data: available } = await supabase
    .from("volunteer_availability")
    .select("volunteer_id")
    .eq("drive_id", driveId);

  if (!available) return [];

  const { data: existingAssignments } = await supabase
    .from("assignments")
    .select("volunteer_id")
    .eq("drive_id", driveId);

  const assignedIds = new Set(
    existingAssignments?.map((a) => a.volunteer_id) || [],
  );
  const unassigned = available.filter(
    (a) => !assignedIds.has(a.volunteer_id),
  );

  const results: AssignmentResult[] = [];
  for (const { volunteer_id } of unassigned) {
    const result = await autoAssignVolunteer(
      supabase,
      volunteer_id,
      driveId,
      assignedBy,
    );
    if (result) results.push(result);
  }

  return results;
}

export async function promoteWaitlist(
  supabase: SupabaseClient,
  driveId: string,
): Promise<AssignmentResult[]> {
  // Get waitlisted volunteers ordered by position
  const { data: waitlisted } = await supabase
    .from("assignments")
    .select("id, volunteer_id, duty_id")
    .eq("drive_id", driveId)
    .eq("status", "waitlisted")
    .order("waitlist_position");

  if (!waitlisted || waitlisted.length === 0) return [];

  const results: AssignmentResult[] = [];

  for (const entry of waitlisted) {
    // Delete the waitlist entry
    await supabase.from("assignments").delete().eq("id", entry.id);

    // Re-run assignment logic
    const result = await autoAssignVolunteer(
      supabase,
      entry.volunteer_id,
      driveId,
      "waitlist_promotion",
    );
    if (result && result.status === "assigned") {
      results.push(result);
    }
  }

  return results;
}
