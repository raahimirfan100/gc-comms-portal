/**
 * UC6: Run promoteWaitlist for a drive (no UI for this).
 * Usage: npx tsx tests/uc6-promote.ts
 * Set driveId in code or pass as env DRIVE_ID.
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { promoteWaitlist } from "@/lib/assignment/auto-assign";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const driveId = process.env.DRIVE_ID || "0e72227c-0183-4faa-ae8f-568690011311";

promoteWaitlist(supabase as any, driveId).then((r) => {
  console.log("Promoted:", JSON.stringify(r, null, 2));
});
