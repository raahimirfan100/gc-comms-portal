import dotenv from "dotenv";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { autoAssignVolunteer, batchAutoAssign, promoteWaitlist } from "@/lib/assignment/auto-assign";
import type { Database } from "@/lib/supabase/types";

type SupabaseClient = ReturnType<typeof createSupabaseClient<Database>>;

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "[auto-assign tests] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createSupabaseClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY);

async function getOrCreateActiveSeason(supabase: SupabaseClient) {
  const { data: existing, error } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .limit(1);

  if (error) {
    throw error;
  }

  if (existing && existing.length > 0) {
    return existing[0];
  }

  const today = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 30);

  const { data: created, error: insertError } = await supabase
    .from("seasons")
    .insert({
      name: "Test Season (Auto-Assign)",
      start_date: today.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10),
      hijri_year: null,
      is_active: true,
    })
    .select()
    .single();

  if (insertError || !created) {
    throw insertError || new Error("Failed to create test season");
  }

  return created;
}

async function createDriveWithDuties(
  supabase: SupabaseClient,
  seasonId: string,
  name: string,
) {
  const today = new Date();
  today.setDate(today.getDate() + 1);

  const { data: drive, error: driveError } = await supabase
    .from("drives")
    .insert({
      season_id: seasonId,
      name,
      drive_date: today.toISOString().slice(0, 10),
      daig_count: 5,
      status: "open",
      location_name: "Test Location",
    })
    .select()
    .single();

  if (driveError || !drive) {
    throw driveError || new Error("Failed to create test drive");
  }

  const { data: duties, error: dutiesError } = await supabase
    .from("duties")
    .select("id, slug, gender_restriction")
    .eq("is_active", true);

  if (dutiesError || !duties) {
    throw dutiesError || new Error("Failed to fetch duties");
  }

  for (const duty of duties) {
    const { error: ddError } = await supabase.from("drive_duties").insert({
      drive_id: drive.id,
      duty_id: duty.id,
      capacity_mode: "linear",
      calculated_capacity: 10,
      current_assigned: 0,
    });

    if (ddError) {
      throw ddError;
    }
  }

  const { data: driveDuties, error: driveDutiesError } = await supabase
    .from("drive_duties")
    .select("id, drive_id, duty_id, calculated_capacity, manual_capacity_override, current_assigned, duties(name, slug, gender_restriction)")
    .eq("drive_id", drive.id);

  if (driveDutiesError || !driveDuties) {
    throw driveDutiesError || new Error("Failed to fetch drive_duties");
  }

  return { drive, duties, driveDuties };
}

async function upsertVolunteer(
  supabase: SupabaseClient,
  {
    phone,
    name,
    gender,
  }: { phone: string; name: string; gender: "male" | "female" },
) {
  const { data, error } = await supabase
    .from("volunteers")
    .upsert(
      {
        phone,
        name,
        gender,
        source: "in_app_form",
      },
      { onConflict: "phone" },
    )
    .select()
    .single();

  if (error || !data) {
    throw error || new Error("Failed to upsert volunteer");
  }

  return data;
}

async function clearAssignmentsForDriveAndVolunteers(
  supabase: SupabaseClient,
  driveId: string,
  volunteerIds: string[],
) {
  if (volunteerIds.length === 0) return;
  await supabase
    .from("assignments")
    .delete()
    .eq("drive_id", driveId)
    .in("volunteer_id", volunteerIds);
}

async function scenarioFirstTimers(supabase: SupabaseClient, seasonId: string) {
  console.log("\n=== Scenario 1: First-time male and female volunteers ===");

  const { drive, duties, driveDuties } = await createDriveWithDuties(
    supabase,
    seasonId,
    "AutoAssign Test – First Timers",
  );

  const male = await upsertVolunteer(supabase, {
    phone: "+923001111111",
    name: "Test Male FirstTimer",
    gender: "male",
  });
  const female = await upsertVolunteer(supabase, {
    phone: "+923001111112",
    name: "Test Female FirstTimer",
    gender: "female",
  });

  await clearAssignmentsForDriveAndVolunteers(supabase, drive.id, [
    male.id,
    female.id,
  ]);

  const dutyById = new Map(
    duties.map((d) => [d.id, d.slug as string]),
  );

  const maleResult = await autoAssignVolunteer(
    supabase,
    male.id,
    drive.id,
    "test_first_timer",
  );
  const maleSlug = maleResult ? dutyById.get(maleResult.dutyId) : null;

  const femaleResult = await autoAssignVolunteer(
    supabase,
    female.id,
    drive.id,
    "test_first_timer",
  );
  const femaleSlug = femaleResult ? dutyById.get(femaleResult.dutyId) : null;

  console.log("Male volunteer assigned duty slug:", maleSlug);
  console.log("Female volunteer assigned duty slug:", femaleSlug);

  console.log("Expected male priority (first available): provider");
  console.log("Expected female priority (first available): thaal");

  const batchAvailability = [
    { volunteerId: male.id, label: "male" },
    { volunteerId: female.id, label: "female" },
  ];

  for (const entry of batchAvailability) {
    await supabase.from("volunteer_availability").upsert(
      {
        volunteer_id: entry.volunteerId,
        drive_id: drive.id,
        source: "in_app_form",
      },
      { onConflict: "volunteer_id,drive_id" },
    );
  }

  const batchResults = await batchAutoAssign(
    supabase,
    drive.id,
    "test_batch",
  );

  console.log(
    "Batch auto-assign produced results count:",
    batchResults.length,
  );
}

async function scenarioReturningVolunteerDutyFull(
  supabase: SupabaseClient,
  seasonId: string,
) {
  console.log(
    "\n=== Scenario 2: Returning male volunteer with preferred duty at full capacity ===",
  );

  const { drive, duties } = await createDriveWithDuties(
    supabase,
    seasonId,
    "AutoAssign Test – Returning Duty Full",
  );

  const providerDuty = duties.find((d) => d.slug === "provider");
  const dariDuty = duties.find((d) => d.slug === "dari");

  if (!providerDuty || !dariDuty) {
    console.log(
      "Provider or Dari duty not found; skipping Scenario 2 (schema mismatch).",
    );
    return;
  }

  const { data: providerDriveDuty } = await supabase
    .from("drive_duties")
    .select("id, duty_id, manual_capacity_override, calculated_capacity")
    .eq("drive_id", drive.id)
    .eq("duty_id", providerDuty.id)
    .single();

  const { data: dariDriveDuty } = await supabase
    .from("drive_duties")
    .select("id, duty_id, manual_capacity_override, calculated_capacity")
    .eq("drive_id", drive.id)
    .eq("duty_id", dariDuty.id)
    .single();

  if (!providerDriveDuty || !dariDriveDuty) {
    console.log(
      "Drive_duties rows missing; skipping Scenario 2.",
    );
    return;
  }

  await supabase
    .from("drive_duties")
    .update({ manual_capacity_override: 0 })
    .eq("id", providerDriveDuty.id);

  await supabase
    .from("drive_duties")
    .update({ manual_capacity_override: 5 })
    .eq("id", dariDriveDuty.id);

  const returning = await upsertVolunteer(supabase, {
    phone: "+923001111113",
    name: "Test Male Returning",
    gender: "male",
  });

  await clearAssignmentsForDriveAndVolunteers(supabase, drive.id, [
    returning.id,
  ]);

  const { data: existingHistory } = await supabase
    .from("assignments")
    .select("id")
    .eq("volunteer_id", returning.id)
    .eq("duty_id", providerDuty.id)
    .limit(1);

  if (!existingHistory || existingHistory.length === 0) {
    const { data: historyDrive, error: historyDriveError } = await supabase
      .from("drives")
      .insert({
        season_id: seasonId,
        name: "AutoAssign History Drive",
        drive_date: new Date().toISOString().slice(0, 10),
        daig_count: 3,
        status: "completed",
      })
      .select()
      .single();

    if (historyDriveError || !historyDrive) {
      throw historyDriveError || new Error("Failed to create history drive");
    }

    await supabase.from("assignments").insert({
      volunteer_id: returning.id,
      drive_id: historyDrive.id,
      duty_id: providerDuty.id,
      status: "completed",
    });
  }

  const result = await autoAssignVolunteer(
    supabase,
    returning.id,
    drive.id,
    "test_returning_full",
  );

  const assignedDutySlug = result
    ? duties.find((d) => d.id === result.dutyId)?.slug
    : null;

  console.log("Returning volunteer assigned duty slug:", assignedDutySlug);
  console.log(
    "Expected: falls back from 'provider' (full) to next priority 'dari'.",
  );
}

async function scenarioWaitlistAndPromotion(
  supabase: SupabaseClient,
  seasonId: string,
) {
  console.log(
    "\n=== Scenario 3: Waitlisting when all duties full and promotion when capacity opens ===",
  );

  const { drive, duties, driveDuties } = await createDriveWithDuties(
    supabase,
    seasonId,
    "AutoAssign Test – Waitlist",
  );

  for (const dd of driveDuties) {
    await supabase
      .from("drive_duties")
      .update({ manual_capacity_override: 0 })
      .eq("id", dd.id);
  }

  const waitlistedVolunteer = await upsertVolunteer(supabase, {
    phone: "+923001111114",
    name: "Test Waitlisted Volunteer",
    gender: "male",
  });

  await clearAssignmentsForDriveAndVolunteers(supabase, drive.id, [
    waitlistedVolunteer.id,
  ]);

  const waitlistResult = await autoAssignVolunteer(
    supabase,
    waitlistedVolunteer.id,
    drive.id,
    "test_waitlist",
  );

  console.log("Waitlist result status:", waitlistResult?.status);

  const { data: waitlistRow } = await supabase
    .from("assignments")
    .select("id, status, waitlist_position")
    .eq("volunteer_id", waitlistedVolunteer.id)
    .eq("drive_id", drive.id)
    .single();

  console.log("Database waitlist row:", waitlistRow);

  const providerDuty = duties.find((d) => d.slug === "provider");
  if (!providerDuty) {
    console.log(
      "Provider duty not found; skipping promotion part of Scenario 3.",
    );
    return;
  }

  const { data: providerDriveDuty } = await supabase
    .from("drive_duties")
    .select("id")
    .eq("drive_id", drive.id)
    .eq("duty_id", providerDuty.id)
    .single();

  if (!providerDriveDuty) {
    console.log(
      "Provider drive_duty not found; skipping promotion part of Scenario 3.",
    );
    return;
  }

  await supabase
    .from("drive_duties")
    .update({ manual_capacity_override: 5 })
    .eq("id", providerDriveDuty.id);

  const promoted = await promoteWaitlist(supabase, drive.id);

  console.log("PromoteWaitlist results:", promoted);
}

async function main() {
  console.log("Starting auto-assignment integration tests against Supabase...");

  const season = await getOrCreateActiveSeason(supabase);
  console.log("Using active season:", season.name, season.id);

  await scenarioFirstTimers(supabase, season.id);
  await scenarioReturningVolunteerDutyFull(supabase, season.id);
  await scenarioWaitlistAndPromotion(supabase, season.id);

  console.log("\nAll scenarios executed. Review the logs above for behavior details.");
}

main().catch((err) => {
  console.error("Auto-assignment tests failed:", err);
  process.exit(1);
});

