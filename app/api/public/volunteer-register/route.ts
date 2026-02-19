import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/utils";
import {
  upsertVolunteer,
  processRegistration,
  queueWhatsAppWelcome,
} from "@/lib/volunteer-pipeline";
import * as Sentry from "@sentry/nextjs";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 10, 60_000);
  if (limited) return limited;

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

    const { volunteerId } = await upsertVolunteer(supabase, {
      phone: normalizedPhone,
      name: name.trim(),
      email: emailTrimmed,
      gender,
      organization: organizationTrimmed,
      source: "in_app_form",
    });

    const assignments = await processRegistration(supabase, {
      volunteerId,
      driveIds,
      source: "in_app_form",
    });

    // Queue WhatsApp welcome DM + group-add (runs after response is sent)
    after(async () => {
      try {
        await queueWhatsAppWelcome(supabase, volunteerId, normalizedPhone, name.trim(), assignments);
      } catch (err) {
        console.error("[volunteer-register] WhatsApp welcome queue failed:", err);
      }
    });

    return NextResponse.json({
      volunteerId,
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
