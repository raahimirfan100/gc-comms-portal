"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Bell, CheckCircle2, Plus, Trash2 } from "lucide-react";
import type { Tables } from "@/lib/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function RemindersPage() {
  const { id: driveId } = useParams<{ id: string }>();
  const supabase = createClient();
  const [reminders, setReminders] = useState<Tables<"reminder_schedules">[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReminders();
  }, [driveId]);

  async function loadReminders() {
    const { data } = await supabase
      .from("reminder_schedules")
      .select("*")
      .eq("drive_id", driveId)
      .order("hours_before_sunset", { ascending: false });
    if (data) setReminders(data);
    setLoading(false);
  }

  async function addReminder() {
    const { error } = await supabase.from("reminder_schedules").insert({
      drive_id: driveId,
      reminder_type: "custom",
      hours_before_sunset: 2,
      message_template:
        "Reminder: {name}, you are assigned to {duty} for {drive_name} at {location}. Sunset at {sunset_time}.",
    });
    if (error) toast.error(error.message);
    else loadReminders();
  }

  async function updateReminder(
    id: string,
    field: string,
    value: string | number,
  ) {
    await supabase
      .from("reminder_schedules")
      .update({ [field]: value })
      .eq("id", id);
    toast.success("Updated");
    loadReminders();
  }

  async function deleteReminder(id: string) {
    await supabase.from("reminder_schedules").delete().eq("id", id);
    toast.success("Deleted");
    loadReminders();
  }

  if (loading) {
    return (
      <div className="space-y-6 page-fade-in">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-8 w-36" />
            </div>
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-10 w-full max-w-2xl rounded-lg" />
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const variableHint = "{name}, {duty}, {drive_name}, {location}, {sunset_time}";

  return (
    <div className="space-y-6 page-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 shrink-0 text-primary" />
            <h1 className="text-2xl font-bold">Reminders</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Schedule WhatsApp reminders relative to sunset for this drive
          </p>
        </div>
        <Button className="self-start sm:self-auto" onClick={addReminder}>
          <Plus className="mr-2 h-4 w-4" />
          Add Reminder
        </Button>
      </div>

      <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Template variables:</span>{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
            {variableHint}
          </code>
        </p>
      </div>

      <div className="space-y-4">
        {reminders.length === 0 ? (
          <Card className="stagger-item">
            <CardContent className="empty-state py-12 text-center text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <div className="empty-state-icon text-4xl">🔔</div>
                <p className="text-base font-medium">No reminders configured</p>
                <p className="text-sm">
                  Click &quot;Add Reminder&quot; to schedule a WhatsApp reminder
                  for this drive
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          reminders.map((r) => (
            <Card key={r.id} className="stagger-item">
              <CardContent className="p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Input
                    type="number"
                    step="0.5"
                    min={0}
                    className="h-8 w-14 shrink-0 text-center text-sm"
                    defaultValue={r.hours_before_sunset ?? 0}
                    onBlur={(e) =>
                      updateReminder(
                        r.id,
                        "hours_before_sunset",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                  />
                  <span className="text-sm text-muted-foreground shrink-0">
                    hrs before sunset
                  </span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {r.reminder_type}
                  </Badge>
                  {r.is_sent && (
                    <Badge
                      variant="secondary"
                      className="gap-1 text-xs bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Sent
                    </Badge>
                  )}
                  {r.scheduled_at && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.scheduled_at).toLocaleString("en-PK", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 ml-auto shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteReminder(r.id)}
                    aria-label="Delete reminder"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Textarea
                  defaultValue={r.message_template || ""}
                  rows={2}
                  className="resize-none font-mono text-sm border-border/80"
                  placeholder="Message: e.g. Reminder: {name}, you are assigned to {duty} for {drive_name}..."
                  onBlur={(e) =>
                    updateReminder(r.id, "message_template", e.target.value)
                  }
                />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
