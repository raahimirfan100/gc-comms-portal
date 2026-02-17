import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/utils";
import * as Sentry from "@sentry/nextjs";
import { rateLimit } from "@/lib/rate-limit";

type WindowConfig = {
  mode: "next_n_days" | "next_m_drives" | "manual";
  days?: number;
  drive_count?: number;
  start_date?: string;
  end_date?: string;
};

const DEFAULT_WINDOW: WindowConfig = { mode: "next_n_days", days: 7 };

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, 30, 60_000);
  if (limited) return limited;
  try {
    const { searchParams } = new URL(request.url);
    const phoneRaw = searchParams.get("phone");
    const supabase = createAdminClient();

    const { data: configRow } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "signup_form_window")
      .single();

    const windowConfig: WindowConfig = configRow?.value
      ? { ...DEFAULT_WINDOW, ...(configRow.value as object) }
      : DEFAULT_WINDOW;

    const { data: season } = await supabase
      .from("seasons")
      .select("id")
      .eq("is_active", true)
      .single();

    if (!season) {
      return NextResponse.json({
        drives: [],
        volunteer: null,
        existingDriveIds: [],
      });
    }

    const today = new Date().toISOString().slice(0, 10);

    let query = supabase
      .from("drives")
      .select(
        "id, name, drive_date, location_name, location_address, location_lat, location_lng, sunset_time, iftaar_time, notes",
      )
      .eq("season_id", season.id)
      .in("status", ["open", "in_progress"])
      .gte("drive_date", today)
      .order("drive_date", { ascending: true });

    if (windowConfig.mode === "next_n_days" && windowConfig.days) {
      const end = new Date();
      end.setDate(end.getDate() + windowConfig.days);
      const endStr = end.toISOString().slice(0, 10);
      query = query.lte("drive_date", endStr);
    } else if (windowConfig.mode === "manual" && windowConfig.start_date && windowConfig.end_date) {
      query = query
        .gte("drive_date", windowConfig.start_date)
        .lte("drive_date", windowConfig.end_date);
    }

    const { data: drivesData } = await query;

    let drives = drivesData ?? [];

    if (windowConfig.mode === "next_m_drives" && windowConfig.drive_count) {
      drives = drives.slice(0, windowConfig.drive_count);
    }

    const driveIds = drives.map((d) => d.id);

    if (!phoneRaw || driveIds.length === 0) {
      return NextResponse.json({
        drives,
        volunteer: null,
        existingDriveIds: [],
      });
    }

    const phone = normalizePhone(phoneRaw);
    const { data: volunteer } = await supabase
      .from("volunteers")
      .select("id, name, email, gender, organization")
      .eq("phone", phone)
      .single();

    if (!volunteer) {
      return NextResponse.json({
        drives,
        volunteer: null,
        existingDriveIds: [],
      });
    }

    const { data: availability } = await supabase
      .from("volunteer_availability")
      .select("drive_id")
      .eq("volunteer_id", volunteer.id)
      .in("drive_id", driveIds);

    const existingDriveIds =
      availability?.map((a) => a.drive_id) ?? [];

    return NextResponse.json({
      drives,
      volunteer: {
        name: volunteer.name,
        email: volunteer.email ?? null,
        gender: volunteer.gender,
        organization: volunteer.organization ?? null,
      },
      existingDriveIds,
    });
  } catch (err) {
    Sentry.captureException(err);
    console.error("[signup-context]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load signup context" },
      { status: 500 },
    );
  }
}
