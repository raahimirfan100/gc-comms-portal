/**
 * UC5–UC8 auto-assignment use case tests.
 * Run: npx tsx tests/uc5-uc8-auto-assign.ts
 * Append results to docs/testing/PLAYWRITER_AUTO_ASSIGN_TEST_REPORT.md
 */
import dotenv from "dotenv";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  autoAssignVolunteer,
  batchAutoAssign,
  promoteWaitlist,
} from "@/lib/assignment/auto-assign";
import type { Database } from "@/lib/supabase/types";

type SupabaseClient = ReturnType<typeof createSupabaseClient<Database>>;

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createSupabaseClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY);

interface TestResult {
  uc: string;
  name: string;
  pass: boolean;
  expected: string;
  actual: string;
  details?: string;
}

const results: TestResult[] = [];

async function getActiveSeason(): Promise<{ id: string }> {
  const { data } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .single();
  if (!data) throw new Error("No active season");
  return data;
}

async function upsertVolunteer(
  phone: string,
  name: string,
  gender: "male" | "female"
) {
  const { data, error } = await supabase
    .from("volunteers")
    .upsert(
      { phone, name, gender, source: "in_app_form" },
      { onConflict: "phone" }
    )
    .select("id")
    .single();
  if (error || !data) throw error || new Error("Failed to upsert volunteer");
  return data;
}

// UC5: Male on female-only duties drive
async function runUC5(supabase: SupabaseClient, seasonId: string) {
  const femaleProvider = (
    await supabase.from("duties").select("id").eq("slug", "female-provider").single()
  ).data;
  const femaleDari = (
    await supabase.from("duties").select("id").eq("slug", "female-dari").single()
  ).data;
  if (!femaleProvider || !femaleDari) {
    results.push({
      uc: "UC5",
      name: "Male on female-only duties drive",
      pass: false,
      expected: "assignments: []",
      actual: "female-provider/female-dari duties not found",
    });
    return;
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const { data: drive, error: driveErr } = await supabase
    .from("drives")
    .insert({
      season_id: seasonId,
      name: "UC5 – Female Only Duties",
      drive_date: tomorrow.toISOString().slice(0, 10),
      daig_count: 2,
      status: "open",
      location_name: "Test",
    })
    .select("id")
    .single();
  if (driveErr || !drive) {
    results.push({
      uc: "UC5",
      name: "Male on female-only duties drive",
      pass: false,
      expected: "assignments: []",
      actual: driveErr?.message || "Failed to create drive",
    });
    return;
  }

  await supabase.from("drive_duties").insert([
    { drive_id: drive.id, duty_id: femaleProvider.id, manual_capacity_override: 2, current_assigned: 0 },
    { drive_id: drive.id, duty_id: femaleDari.id, manual_capacity_override: 2, current_assigned: 0 },
  ]);

  const volunteer = await upsertVolunteer(
    "+923009999101",
    "Test Male UC5",
    "male"
  );
  await supabase.from("volunteer_availability").upsert(
    { volunteer_id: volunteer.id, drive_id: drive.id, source: "in_app_form" },
    { onConflict: "volunteer_id,drive_id" }
  );

  const result = await autoAssignVolunteer(
    supabase,
    volunteer.id,
    drive.id,
    "test_uc5"
  );

  const passed = result === null;
  results.push({
    uc: "UC5",
    name: "Male on female-only duties drive",
    pass: passed,
    expected: "assignments: [] (null)",
    actual: result ? `assigned to ${result.dutyName}` : "null",
    details: "Drive has only female-provider and female-dari; male has no gender-allowed duty.",
  });
}

// UC6: Waitlist promotion order
async function runUC6(supabase: SupabaseClient, seasonId: string) {
  const provider = (
    await supabase.from("duties").select("id").eq("slug", "provider").single()
  ).data;
  const dari = (
    await supabase.from("duties").select("id").eq("slug", "dari").single()
  ).data;
  if (!provider || !dari) {
    results.push({
      uc: "UC6",
      name: "Waitlist promotion order",
      pass: false,
      expected: "First two promoted in waitlist order",
      actual: "Provider/Dari duty not found",
    });
    return;
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const { data: drive, error: driveErr } = await supabase
    .from("drives")
    .insert({
      season_id: seasonId,
      name: "UC6 – Waitlist Promotion",
      drive_date: tomorrow.toISOString().slice(0, 10),
      daig_count: 2,
      status: "open",
      location_name: "Test",
    })
    .select("id")
    .single();
  if (driveErr || !drive) {
    results.push({
      uc: "UC6",
      name: "Waitlist promotion order",
      pass: false,
      expected: "First two promoted in waitlist order",
      actual: driveErr?.message || "Failed to create drive",
    });
    return;
  }

  // All duties cap 0
  await supabase.from("drive_duties").insert([
    { drive_id: drive.id, duty_id: provider.id, manual_capacity_override: 0, current_assigned: 0 },
    { drive_id: drive.id, duty_id: dari.id, manual_capacity_override: 0, current_assigned: 0 },
  ]);

  const v1 = await upsertVolunteer("+923009999102", "UC6 Waitlist 1", "male");
  const v2 = await upsertVolunteer("+923009999103", "UC6 Waitlist 2", "male");
  const v3 = await upsertVolunteer("+923009999104", "UC6 Waitlist 3", "male");

  for (const v of [v1, v2, v3]) {
    await supabase.from("volunteer_availability").upsert(
      { volunteer_id: v.id, drive_id: drive.id, source: "in_app_form" },
      { onConflict: "volunteer_id,drive_id" }
    );
  }

  const batchResults = await batchAutoAssign(supabase, drive.id, "test_uc6");
  const waitlistedCount = batchResults.filter((r) => r.status === "waitlisted").length;

  // Set Provider cap to 2
  const { data: providerDD } = await supabase
    .from("drive_duties")
    .select("id")
    .eq("drive_id", drive.id)
    .eq("duty_id", provider.id)
    .single();
  if (providerDD) {
    await supabase
      .from("drive_duties")
      .update({ manual_capacity_override: 2 })
      .eq("id", providerDD.id);
  }

  const promoted = await promoteWaitlist(supabase, drive.id);
  const promotedIds = promoted.map((p) => p.volunteerId);

  const passed =
    waitlistedCount === 3 &&
    promoted.length === 2 &&
    promotedIds.includes(v1.id) &&
    promotedIds.includes(v2.id);
  results.push({
    uc: "UC6",
    name: "Waitlist promotion order",
    pass: passed,
    expected: "First two promoted in waitlist order",
    actual: `3 waitlisted, ${promoted.length} promoted (ids: ${promotedIds.join(", ")})`,
    details: `Promoted: ${promoted.map((p) => p.dutyName).join(", ")}`,
  });
}

// UC7: Volunteer with only cancelled/no-show history
async function runUC7(supabase: SupabaseClient, seasonId: string) {
  const provider = (
    await supabase.from("duties").select("id").eq("slug", "provider").single()
  ).data;
  const dari = (
    await supabase.from("duties").select("id").eq("slug", "dari").single()
  ).data;
  if (!provider || !dari) {
    results.push({
      uc: "UC7",
      name: "Volunteer with only cancelled/no-show history",
      pass: false,
      expected: "Treated as first-timer, assigned by priority",
      actual: "Provider/Dari duty not found",
    });
    return;
  }

  const volunteer = await upsertVolunteer(
    "+923009999105",
    "Test UC7 Cancelled Only",
    "male"
  );

  // Create past drive and cancelled/no-show assignments
  const { data: pastDrive } = await supabase
    .from("drives")
    .insert({
      season_id: seasonId,
      name: "UC7 Past Drive",
      drive_date: new Date().toISOString().slice(0, 10),
      daig_count: 2,
      status: "completed",
    })
    .select("id")
    .single();

  if (pastDrive) {
    await supabase.from("assignments").insert([
      {
        volunteer_id: volunteer.id,
        drive_id: pastDrive.id,
        duty_id: provider.id,
        status: "cancelled",
      },
      {
        volunteer_id: volunteer.id,
        drive_id: pastDrive.id,
        duty_id: dari.id,
        status: "no_show",
      },
    ]);
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 3);
  const { data: drive, error: driveErr } = await supabase
    .from("drives")
    .insert({
      season_id: seasonId,
      name: "UC7 – First Timer After Cancelled",
      drive_date: tomorrow.toISOString().slice(0, 10),
      daig_count: 2,
      status: "open",
      location_name: "Test",
    })
    .select("id")
    .single();
  if (driveErr || !drive) {
    results.push({
      uc: "UC7",
      name: "Volunteer with only cancelled/no-show history",
      pass: false,
      expected: "Treated as first-timer",
      actual: driveErr?.message || "Failed to create drive",
    });
    return;
  }

  await supabase.from("drive_duties").insert([
    { drive_id: drive.id, duty_id: provider.id, manual_capacity_override: 3, current_assigned: 0 },
    { drive_id: drive.id, duty_id: dari.id, manual_capacity_override: 3, current_assigned: 0 },
  ]);

  await supabase.from("volunteer_availability").upsert(
    { volunteer_id: volunteer.id, drive_id: drive.id, source: "in_app_form" },
    { onConflict: "volunteer_id,drive_id" }
  );

  const result = await autoAssignVolunteer(
    supabase,
    volunteer.id,
    drive.id,
    "test_uc7"
  );

  const assignedProvider = result && result.dutyName === "Provider";
  results.push({
    uc: "UC7",
    name: "Volunteer with only cancelled/no-show history",
    pass: !!assignedProvider,
    expected: "Treated as first-timer; assigned to Provider (male priority)",
    actual: result ? result.dutyName : "null",
    details: "auto-assign excludes cancelled/no_show from history; volunteer gets first-time logic.",
  });
}

// UC8: Drive with no duties
async function runUC8(supabase: SupabaseClient, seasonId: string) {
  const volunteer = await upsertVolunteer(
    "+923009999106",
    "Test UC8 No Duties",
    "male"
  );

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 4);
  const { data: drive, error: driveErr } = await supabase
    .from("drives")
    .insert({
      season_id: seasonId,
      name: "UC8 – No Duties",
      drive_date: tomorrow.toISOString().slice(0, 10),
      daig_count: 2,
      status: "open",
      location_name: "Test",
    })
    .select("id")
    .single();
  if (driveErr || !drive) {
    results.push({
      uc: "UC8",
      name: "Drive with no duties",
      pass: false,
      expected: "Returns null, no assignment",
      actual: driveErr?.message || "Failed to create drive",
    });
    return;
  }
  // Intentionally no drive_duties

  await supabase.from("volunteer_availability").upsert(
    { volunteer_id: volunteer.id, drive_id: drive.id, source: "in_app_form" },
    { onConflict: "volunteer_id,drive_id" }
  );

  const result = await autoAssignVolunteer(
    supabase,
    volunteer.id,
    drive.id,
    "test_uc8"
  );

  const { count } = await supabase
    .from("assignments")
    .select("id", { count: "exact", head: true })
    .eq("volunteer_id", volunteer.id)
    .eq("drive_id", drive.id);

  const passed = result === null && count === 0;
  results.push({
    uc: "UC8",
    name: "Drive with no duties",
    pass: passed,
    expected: "Returns null, no assignment created",
    actual: result ? `assigned to ${result.dutyName}` : `null, assignment count: ${count}`,
    details: "autoAssignVolunteer returns null when drive_duties is empty.",
  });
}

async function main() {
  console.log("Running UC5–UC8 auto-assignment tests...\n");

  const season = await getActiveSeason();

  await runUC5(supabase, season.id);
  await runUC6(supabase, season.id);
  await runUC7(supabase, season.id);
  await runUC8(supabase, season.id);

  console.log("\n--- Results ---\n");
  for (const r of results) {
    console.log(`${r.uc}: ${r.pass ? "✅ Pass" : "❌ Fail"}`);
    console.log(`  Expected: ${r.expected}`);
    console.log(`  Actual:   ${r.actual}`);
    if (r.details) console.log(`  Details:  ${r.details}`);
    console.log();
  }

  // Output markdown for report
  console.log("\n--- Markdown for report ---\n");
  const md = results
    .map(
      (r) =>
        `### ${r.uc}: ${r.name}\n\n` +
        `**Setup:** (see test script)\n\n` +
        `| Method | Action | Result |\n` +
        `|--------|--------|--------|\n` +
        `| Script | ${r.uc} flow | ${r.actual} |\n\n` +
        `**Conclusion:** ${r.pass ? "✅ Pass" : "❌ Fail"}. ${r.details || r.expected}\n`
    )
    .join("\n---\n\n");
  console.log(md);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
