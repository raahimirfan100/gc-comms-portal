"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Reminder = {
  type: string;
  hours_before_sunset: number;
  template: string;
};

export default function ReminderSettingsPage() {
  const supabase = createClient();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "reminder_defaults")
        .single();
      if (data?.value) {
        const config = data.value as { reminders: Reminder[] };
        setReminders(config.reminders || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("app_config")
      .update({ value: { reminders } })
      .eq("key", "reminder_defaults");
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Default reminders saved");
  }

  function addReminder() {
    setReminders([
      ...reminders,
      {
        type: `reminder_${reminders.length + 1}`,
        hours_before_sunset: 2,
        template: "Reminder: {name}, you are assigned to {duty} for {drive_name}.",
      },
    ]);
  }

  function updateReminder(i: number, field: string, value: string | number) {
    const updated = [...reminders];
    (updated[i] as any)[field] = value;
    setReminders(updated);
  }

  function removeReminder(i: number) {
    setReminders(reminders.filter((_, idx) => idx !== i));
  }

  if (loading) {
    return (
      <div className="space-y-8 page-fade-in max-w-4xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 page-fade-in max-w-4xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Default Reminders</h1>
          <p className="text-muted-foreground">
            Default templates applied to new drives. Variables: {"{name}"},{" "}
            {"{duty}"}, {"{drive_name}"}, {"{sunset_time}"}, {"{location}"}
          </p>
        </div>
        <Button className="self-start sm:self-auto" onClick={addReminder}>
          <Plus className="mr-2 h-4 w-4" />
          Add Template
        </Button>
      </div>

      <div className="space-y-4">
        {reminders.map((r, i) => (
          <Card key={i} className="stagger-item">
            <CardContent className="space-y-3 pt-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex-1 space-y-1">
                  <Label>Type</Label>
                  <Input
                    value={r.type}
                    onChange={(e) => updateReminder(i, "type", e.target.value)}
                  />
                </div>
                <div className="space-y-1 sm:w-40">
                  <Label>Hours before sunset</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={r.hours_before_sunset}
                    onChange={(e) =>
                      updateReminder(
                        i,
                        "hours_before_sunset",
                        parseFloat(e.target.value),
                      )
                    }
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-2 sm:mt-5"
                  onClick={() => removeReminder(i)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="space-y-1">
                <Label>Message Template</Label>
                <Textarea
                  value={r.template}
                  onChange={(e) =>
                    updateReminder(i, "template", e.target.value)
                  }
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="border-t border-border pt-6">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Defaults
        </Button>
      </div>
    </div>
  );
}
