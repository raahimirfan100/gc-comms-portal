"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createDrive(formData: FormData) {
  const supabase = await createClient();

  const seasonId = formData.get("season_id") as string;
  const name = formData.get("name") as string;
  const driveDate = formData.get("drive_date") as string;
  const locationName = formData.get("location_name") as string;
  const locationAddress = formData.get("location_address") as string;
  const daigCount = parseInt(formData.get("daig_count") as string) || 0;
  const sunsetTime = formData.get("sunset_time") as string | null;
  const sunsetSource = (formData.get("sunset_source") as string) || "aladhan";
  const status = (formData.get("status") as string) || "draft";

  const { data: drive, error } = await supabase
    .from("drives")
    .insert({
      season_id: seasonId,
      name,
      drive_date: driveDate,
      location_name: locationName || null,
      location_address: locationAddress || null,
      daig_count: daigCount,
      sunset_time: sunsetTime || null,
      sunset_source: sunsetSource,
      status: status as "draft" | "open",
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Auto-create drive_duties from active duties with calculated capacities
  const { data: duties } = await supabase
    .from("duties")
    .select("id, slug")
    .eq("is_active", true)
    .order("display_order");

  if (duties && duties.length > 0) {
    const { data: rules } = await supabase
      .from("duty_capacity_rules")
      .select("*");

    const driveDuties = duties.map((duty) => {
      const rule = rules?.find((r) => r.duty_id === duty.id);
      let calculatedCapacity = 0;

      if (rule) {
        if (rule.capacity_mode === "linear") {
          calculatedCapacity =
            (rule.base_count || 0) +
            Math.ceil((rule.per_daig_count || 0) * daigCount);
        }
      }

      return {
        drive_id: drive.id,
        duty_id: duty.id,
        capacity_mode: (rule?.capacity_mode || "linear") as "linear" | "tiered",
        calculated_capacity: calculatedCapacity,
      };
    });

    await supabase.from("drive_duties").insert(driveDuties);
  }

  // Create default reminder schedules
  const { data: reminderConfig } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "reminder_defaults")
    .single();

  if (reminderConfig?.value && sunsetTime) {
    const config = reminderConfig.value as {
      reminders: Array<{
        type: string;
        hours_before_sunset: number;
        template: string;
      }>;
    };

    if (config.reminders) {
      const [hours, minutes] = sunsetTime.split(":").map(Number);
      const reminders = config.reminders.map((r) => {
        const sunsetMinutes = hours * 60 + minutes;
        const reminderMinutes = sunsetMinutes - r.hours_before_sunset * 60;
        const rHours = Math.floor(reminderMinutes / 60);
        const rMins = reminderMinutes % 60;
        const scheduledDate = new Date(`${driveDate}T${String(rHours).padStart(2, "0")}:${String(rMins).padStart(2, "0")}:00+05:00`);

        return {
          drive_id: drive.id,
          reminder_type: r.type,
          hours_before_sunset: r.hours_before_sunset,
          message_template: r.template,
          scheduled_at: scheduledDate.toISOString(),
        };
      });

      await supabase.from("reminder_schedules").insert(reminders);
    }
  }

  revalidatePath("/drives");
  return { data: drive };
}

export async function updateDrive(id: string, formData: FormData) {
  const supabase = await createClient();

  const updates: Record<string, unknown> = {};
  const fields = [
    "name",
    "drive_date",
    "location_name",
    "location_address",
    "sunset_time",
    "sunset_source",
    "iftaar_time",
    "status",
    "notes",
  ];
  for (const field of fields) {
    const value = formData.get(field);
    if (value !== null) updates[field] = value || null;
  }
  const daigCount = formData.get("daig_count");
  if (daigCount !== null) updates.daig_count = parseInt(daigCount as string) || 0;

  const { error } = await supabase.from("drives").update(updates).eq("id", id);
  if (error) return { error: error.message };

  // Recalculate capacities if daig_count changed
  if (daigCount !== null) {
    const newDaigCount = parseInt(daigCount as string) || 0;
    const { data: driveDuties } = await supabase
      .from("drive_duties")
      .select("id, duty_id, capacity_mode, manual_capacity_override")
      .eq("drive_id", id);

    if (driveDuties) {
      const { data: rules } = await supabase
        .from("duty_capacity_rules")
        .select("*");

      for (const dd of driveDuties) {
        if (dd.manual_capacity_override !== null) continue;
        const rule = rules?.find((r) => r.duty_id === dd.duty_id);
        if (!rule) continue;

        let capacity = 0;
        if (rule.capacity_mode === "linear") {
          capacity =
            (rule.base_count || 0) +
            Math.ceil((rule.per_daig_count || 0) * newDaigCount);
        } else if (rule.capacity_mode === "tiered") {
          const tierRule = rules?.find(
            (r) =>
              r.duty_id === dd.duty_id &&
              r.capacity_mode === "tiered" &&
              (r.tier_min_daigs || 0) <= newDaigCount &&
              (r.tier_max_daigs === null || (r.tier_max_daigs || 0) >= newDaigCount),
          );
          capacity = tierRule?.tier_capacity || 0;
        }

        await supabase
          .from("drive_duties")
          .update({ calculated_capacity: capacity })
          .eq("id", dd.id);
      }
    }
  }

  revalidatePath("/drives");
  revalidatePath(`/drives/${id}`);
  return { success: true };
}

export async function deleteDrive(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("drives").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/drives");
  return { success: true };
}

export async function fetchSunsetTime(date: string): Promise<string | null> {
  try {
    // Karachi coordinates
    const lat = 24.8607;
    const lng = 67.0011;
    const [year, month, day] = date.split("-");
    const res = await fetch(
      `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${lat}&longitude=${lng}&method=1`,
    );
    const data = await res.json();
    if (data?.data?.timings?.Sunset) {
      return data.data.timings.Sunset; // "HH:MM" format
    }
    return null;
  } catch {
    return null;
  }
}
