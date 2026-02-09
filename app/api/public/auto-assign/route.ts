import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { autoAssignVolunteer } from "@/lib/assignment/auto-assign";

export async function POST(request: NextRequest) {
  const { volunteerId, driveIds } = await request.json();

  if (!volunteerId || !driveIds || !Array.isArray(driveIds)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const assignments: Array<{ drive: string; duty: string }> = [];

  for (const driveId of driveIds) {
    const result = await autoAssignVolunteer(supabase, volunteerId, driveId);
    if (result) {
      const { data: drive } = await supabase
        .from("drives")
        .select("name")
        .eq("id", driveId)
        .single();

      assignments.push({
        drive: drive?.name || driveId,
        duty:
          result.status === "waitlisted"
            ? `Waitlisted (${result.dutyName})`
            : result.dutyName,
      });
    }
  }

  return NextResponse.json({ assignments });
}
