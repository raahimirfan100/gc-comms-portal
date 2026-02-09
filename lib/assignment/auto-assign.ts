import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type SupabaseClient = ReturnType<typeof createSupabaseClient<Database>>;

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
    .select("id, gender")
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
