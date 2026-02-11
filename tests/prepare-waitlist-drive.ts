import dotenv from "dotenv";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "[prepare-waitlist-drive] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createSupabaseClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  const { data: drive, error } = await supabase
    .from("drives")
    .select("id, name")
    .ilike("name", "AutoAssign Test – Waitlist%")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !drive) {
    console.error("[prepare-waitlist-drive] Test waitlist drive not found:", error);
    process.exit(1);
  }

  const { data: driveDuties, error: ddError } = await supabase
    .from("drive_duties")
    .select("id")
    .eq("drive_id", drive.id);

  if (ddError || !driveDuties) {
    console.error("[prepare-waitlist-drive] Failed to fetch drive_duties:", ddError);
    process.exit(1);
  }

  for (const dd of driveDuties) {
    await supabase
      .from("drive_duties")
      .update({ manual_capacity_override: 0 })
      .eq("id", dd.id);
  }

  console.log(
    `[prepare-waitlist-drive] Set manual_capacity_override=0 for ${driveDuties.length} drive_duties on drive "${drive.name}" (${drive.id}).`,
  );
}

main().catch((err) => {
  console.error("[prepare-waitlist-drive] Error:", err);
  process.exit(1);
});

