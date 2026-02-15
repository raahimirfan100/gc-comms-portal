import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { autoAssignVolunteer } from "@/lib/assignment/auto-assign";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: NextRequest) {
  try {
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
  } catch (err) {
    Sentry.captureException(err);
    console.error("[auto-assign]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Auto-assign failed" },
      { status: 400 },
    );
  }
}
