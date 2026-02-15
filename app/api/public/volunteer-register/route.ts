import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/utils";
import { autoAssignVolunteer } from "@/lib/assignment/auto-assign";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      phone,
      name,
      email,
      gender,
      organization,
      driveIds,
    } = body as {
      phone?: string;
      name?: string;
      email?: string | null;
      gender?: "male" | "female";
      organization?: string | null;
      driveIds?: string[];
    };

    const emailTrimmed = typeof email === "string" ? email.trim() : "";
    const organizationTrimmed =
      typeof organization === "string" ? organization.trim() : "";

    if (
      !phone ||
      !name ||
      !gender ||
      !emailTrimmed ||
      !organizationTrimmed ||
      !Array.isArray(driveIds) ||
      driveIds.length === 0
    ) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const normalizedPhone = normalizePhone(phone);

    const { data: volunteerRow, error: volError } = await supabase
      .from("volunteers")
      .upsert(
        {
          phone: normalizedPhone,
          name: name.trim(),
          email: emailTrimmed,
          gender,
          organization: organizationTrimmed,
          source: "in_app_form" as const,
        },
        { onConflict: "phone" },
      )
      .select("id")
      .single();

    if (volError || !volunteerRow) {
      return NextResponse.json(
        { error: volError?.message || "Failed to save volunteer" },
        { status: 400 },
      );
    }

    for (const driveId of driveIds) {
      await supabase
        .from("volunteer_availability")
        .upsert(
          {
            volunteer_id: volunteerRow.id,
            drive_id: driveId,
            source: "in_app_form" as const,
          },
          { onConflict: "volunteer_id,drive_id" },
        );
    }

    const assignments: Array<{ drive: string; duty: string }> = [];

    for (const driveId of driveIds) {
      const result = await autoAssignVolunteer(
        supabase,
        volunteerRow.id,
        driveId,
      );

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

    // Fire-and-forget: add volunteer to WhatsApp group + announce
    addToWhatsAppGroup(normalizedPhone, name.trim(), assignments).catch((err) =>
      console.error("[volunteer-register] WhatsApp group add failed:", err),
    );

    return NextResponse.json({
      volunteerId: volunteerRow.id,
      assignments,
    });
  } catch (err) {
    Sentry.captureException(err);
    console.error("[volunteer-register]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to register volunteer",
      },
      { status: 500 },
    );
  }
}

async function addToWhatsAppGroup(
  phone: string,
  name: string,
  assignments: Array<{ drive: string; duty: string }>,
) {
  const railwayUrl = process.env.RAILWAY_SERVICE_URL;
  const railwaySecret = process.env.RAILWAY_API_SECRET;
  if (!railwayUrl || !railwaySecret) return;

  const supabase = createAdminClient();
  const { data: config } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "whatsapp")
    .single();

  const groupJid = (config?.value as any)?.volunteer_group_jid;
  if (!groupJid) return;

  await fetch(`${railwayUrl}/api/whatsapp/group/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${railwaySecret}`,
    },
    body: JSON.stringify({ phone, groupJid, name, assignments }),
  });
}

