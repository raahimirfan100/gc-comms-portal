import { CronJob } from "cron";
import { SupabaseClient } from "@supabase/supabase-js";
import { WhatsAppManager } from "../whatsapp/connection";
import { GoogleSheetsSync } from "../sheets/sync";
import { RetellClient } from "../calling/retell-client";

export function setupCronJobs(
  supabase: SupabaseClient,
  whatsapp: WhatsAppManager,
  sheetsSync: GoogleSheetsSync,
  retell: RetellClient,
): void {
  // Google Sheets sync - every 5 minutes
  new CronJob("*/5 * * * *", async () => {
    console.log("[CRON] Google Sheets sync");
    try {
      const result = await sheetsSync.syncAll();
      if (result.synced > 0) {
        console.log(`[CRON] Synced ${result.synced} new volunteers`);
      }
    } catch (error) {
      console.error("[CRON] Sheets sync error:", error);
    }
  }).start();

  // Send reminders - every minute
  new CronJob("* * * * *", async () => {
    try {
      const now = new Date().toISOString();
      const { data: pendingReminders } = await supabase
        .from("reminder_schedules")
        .select("*, drives(name, location_name, sunset_time)")
        .eq("is_sent", false)
        .lte("scheduled_at", now);

      if (!pendingReminders || pendingReminders.length === 0) return;

      for (const reminder of pendingReminders) {
        const drive = reminder.drives as any;
        const { data: assignments } = await supabase
          .from("assignments")
          .select("volunteer_id, duty_id, volunteers(name, phone), duties(name)")
          .eq("drive_id", reminder.drive_id)
          .in("status", ["assigned", "confirmed"]);

        if (!assignments) continue;

        for (const assignment of assignments) {
          const volunteer = assignment.volunteers as any;
          const duty = assignment.duties as any;
          if (!volunteer?.phone) continue;

          let message = reminder.message_template || "";
          message = message
            .replace(/{name}/g, volunteer.name || "")
            .replace(/{duty}/g, duty?.name || "")
            .replace(/{drive_name}/g, drive?.name || "")
            .replace(/{sunset_time}/g, drive?.sunset_time || "")
            .replace(/{location}/g, drive?.location_name || "");

          try {
            await whatsapp.sendMessage(volunteer.phone, message);

            await supabase.from("communication_log").insert({
              volunteer_id: assignment.volunteer_id,
              drive_id: reminder.drive_id,
              channel: "whatsapp",
              direction: "outbound",
              content: message,
              sent_at: new Date().toISOString(),
            });
          } catch (error) {
            console.error(
              `[CRON] Failed to send reminder to ${volunteer.phone}:`,
              error,
            );
          }
        }

        // Mark reminder as sent
        await supabase
          .from("reminder_schedules")
          .update({ is_sent: true, sent_at: new Date().toISOString() })
          .eq("id", reminder.id);
      }
    } catch (error) {
      console.error("[CRON] Reminder send error:", error);
    }
  }).start();

  // Trigger AI calls - every minute
  new CronJob("* * * * *", async () => {
    try {
      const { data: config } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "ai_calling")
        .single();

      const aiConfig = config?.value as {
        enabled: boolean;
        auto_call_hours_before_sunset: number;
      } | null;
      if (!aiConfig?.enabled) return;

      const today = new Date().toISOString().split("T")[0];
      const { data: drives } = await supabase
        .from("drives")
        .select("id, sunset_time")
        .eq("drive_date", today)
        .in("status", ["open", "in_progress"]);

      if (!drives) return;

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      for (const drive of drives) {
        if (!drive.sunset_time) continue;
        const [h, m] = drive.sunset_time.split(":").map(Number);
        const sunsetMinutes = h * 60 + m;
        const callMinutes =
          sunsetMinutes - aiConfig.auto_call_hours_before_sunset * 60;

        // Check if it's time to call (within 1-minute window)
        if (
          currentMinutes >= callMinutes &&
          currentMinutes < callMinutes + 1
        ) {
          const { data: unconfirmed } = await supabase
            .from("assignments")
            .select("volunteer_id")
            .eq("drive_id", drive.id)
            .eq("status", "assigned");

          if (unconfirmed && unconfirmed.length > 0) {
            console.log(
              `[CRON] Auto-calling ${unconfirmed.length} unconfirmed for drive ${drive.id}`,
            );
            await retell.batchCall(
              drive.id,
              unconfirmed.map((a) => a.volunteer_id),
            );
          }
        }
      }
    } catch (error) {
      console.error("[CRON] AI call trigger error:", error);
    }
  }).start();

  // Update sunset times - daily at 2 AM PKT (21:00 UTC previous day)
  new CronJob("0 21 * * *", async () => {
    console.log("[CRON] Updating sunset times");
    try {
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      const { data: drives } = await supabase
        .from("drives")
        .select("id, drive_date, sunset_source")
        .gte("drive_date", today.toISOString().split("T")[0])
        .lte("drive_date", nextWeek.toISOString().split("T")[0])
        .neq("sunset_source", "manual");

      if (!drives) return;

      for (const drive of drives) {
        try {
          const [year, month, day] = drive.drive_date.split("-");
          const res = await fetch(
            `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=24.8607&longitude=67.0011&method=1`,
          );
          const data = await res.json() as { data?: { timings?: { Sunset?: string } } };
          const sunset = data?.data?.timings?.Sunset;

          if (sunset) {
            await supabase
              .from("drives")
              .update({ sunset_time: sunset, sunset_source: "aladhan" })
              .eq("id", drive.id);
          }
        } catch {
          // Skip if Aladhan API fails
        }
      }
    } catch (error) {
      console.error("[CRON] Sunset update error:", error);
    }
  }).start();

  // Waitlist promotion - every 2 minutes
  new CronJob("*/2 * * * *", async () => {
    try {
      const { data: config } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "assignment_rules")
        .single();

      const rules = config?.value as { waitlist_auto_fill?: boolean } | null;
      if (!rules?.waitlist_auto_fill) return;

      // Find drives with waitlisted volunteers
      const { data: waitlisted } = await supabase
        .from("assignments")
        .select("drive_id")
        .eq("status", "waitlisted");

      if (!waitlisted) return;

      const driveIds = [...new Set(waitlisted.map((w) => w.drive_id))];

      for (const driveId of driveIds) {
        // Check for open capacity
        const { data: driveDuties } = await supabase
          .from("drive_duties")
          .select("duty_id, calculated_capacity, manual_capacity_override, current_assigned")
          .eq("drive_id", driveId);

        const hasCapacity = driveDuties?.some((dd) => {
          const cap = dd.manual_capacity_override ?? dd.calculated_capacity;
          return dd.current_assigned < cap;
        });

        if (!hasCapacity) continue;

        // Get waitlisted volunteers in order
        const { data: waitlist } = await supabase
          .from("assignments")
          .select("id, volunteer_id")
          .eq("drive_id", driveId)
          .eq("status", "waitlisted")
          .order("waitlist_position");

        if (!waitlist) continue;

        for (const entry of waitlist) {
          // Delete waitlist entry and re-run assignment
          await supabase.from("assignments").delete().eq("id", entry.id);

          // Simple re-assignment: try first available duty
          const { data: volunteer } = await supabase
            .from("volunteers")
            .select("gender")
            .eq("id", entry.volunteer_id)
            .single();

          if (!volunteer) continue;

          for (const dd of driveDuties!) {
            const cap = dd.manual_capacity_override ?? dd.calculated_capacity;
            if (dd.current_assigned >= cap) continue;

            await supabase.from("assignments").insert({
              volunteer_id: entry.volunteer_id,
              drive_id: driveId,
              duty_id: dd.duty_id,
              status: "assigned",
              assigned_by: "waitlist_promotion",
            });
            break;
          }
        }
      }
    } catch (error) {
      console.error("[CRON] Waitlist promotion error:", error);
    }
  }).start();

  // Send scheduled WhatsApp messages - every minute
  new CronJob("* * * * *", async () => {
    try {
      const now = new Date().toISOString();
      const { data: pending } = await supabase
        .from("scheduled_messages")
        .select("*")
        .eq("status", "pending")
        .lte("scheduled_at", now)
        .order("scheduled_at")
        .limit(20);

      if (!pending || pending.length === 0) return;

      for (const msg of pending) {
        try {
          if (msg.group_jid) {
            // Send to group
            await whatsapp.sendGroupMessage(msg.group_jid, msg.message);
          } else if (msg.volunteer_id) {
            // Send to individual volunteer
            const { data: volunteer } = await supabase
              .from("volunteers")
              .select("phone, name")
              .eq("id", msg.volunteer_id)
              .single();

            if (!volunteer?.phone) {
              await supabase
                .from("scheduled_messages")
                .update({ status: "failed", error: "Volunteer phone not found" })
                .eq("id", msg.id);
              continue;
            }

            // Replace template variables if a drive is linked
            let text = msg.message;
            if (msg.drive_id) {
              const { data: drive } = await supabase
                .from("drives")
                .select("name, location_name, sunset_time")
                .eq("id", msg.drive_id)
                .single();

              const { data: assignment } = await supabase
                .from("assignments")
                .select("duties(name)")
                .eq("volunteer_id", msg.volunteer_id)
                .eq("drive_id", msg.drive_id)
                .limit(1)
                .single();

              text = text
                .replace(/{name}/g, volunteer.name || "")
                .replace(/{drive_name}/g, (drive as any)?.name || "")
                .replace(/{location}/g, (drive as any)?.location_name || "")
                .replace(/{sunset_time}/g, (drive as any)?.sunset_time || "")
                .replace(/{duty}/g, (assignment?.duties as any)?.name || "");
            } else {
              text = text.replace(/{name}/g, volunteer.name || "");
            }

            await whatsapp.sendMessage(volunteer.phone, text);

            // Log to communication_log
            await supabase.from("communication_log").insert({
              volunteer_id: msg.volunteer_id,
              drive_id: msg.drive_id,
              channel: "whatsapp",
              direction: "outbound",
              content: text,
              sent_at: new Date().toISOString(),
            });
          }

          // Mark as sent
          await supabase
            .from("scheduled_messages")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", msg.id);
        } catch (error: any) {
          console.error(`[CRON] Failed to send scheduled message ${msg.id}:`, error);
          await supabase
            .from("scheduled_messages")
            .update({ status: "failed", error: error.message || "Send failed" })
            .eq("id", msg.id);
        }
      }
    } catch (error) {
      console.error("[CRON] Scheduled message send error:", error);
    }
  }).start();

  // WhatsApp health check - every 5 minutes
  new CronJob("*/5 * * * *", async () => {
    if (whatsapp.getStatus() === "disconnected") {
      console.log("[CRON] WhatsApp disconnected, attempting reconnect...");
      try {
        await whatsapp.autoReconnect();
      } catch {
        // Will retry next cycle
      }
    }
  }).start();

  // Drive status transitions - hourly
  new CronJob("0 * * * *", async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000)
        .toISOString()
        .split("T")[0];

      // Open → In Progress (on drive day)
      await supabase
        .from("drives")
        .update({ status: "in_progress" })
        .eq("status", "open")
        .eq("drive_date", today);

      // In Progress → Completed (next day)
      await supabase
        .from("drives")
        .update({ status: "completed" })
        .eq("status", "in_progress")
        .lt("drive_date", today);
    } catch (error) {
      console.error("[CRON] Drive status transition error:", error);
    }
  }).start();

  console.log("[CRON] All cron jobs scheduled");
}
