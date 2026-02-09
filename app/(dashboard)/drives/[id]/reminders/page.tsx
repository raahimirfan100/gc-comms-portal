"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Plus, Send, Trash2 } from "lucide-react";
import type { Tables } from "@/lib/supabase/types";

export default function RemindersPage() {
  const { id: driveId } = useParams<{ id: string }>();
  const supabase = createClient();
  const [reminders, setReminders] = useState<Tables<"reminder_schedules">[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReminders();
  }, []);

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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reminders</h1>
          <p className="text-muted-foreground">
            Configure WhatsApp reminders for this drive. Variables: {"{name}"},{" "}
            {"{duty}"}, {"{drive_name}"}, {"{sunset_time}"}, {"{location}"}
          </p>
        </div>
        <Button onClick={addReminder}>
          <Plus className="mr-2 h-4 w-4" />
          Add Reminder
        </Button>
      </div>

      <div className="space-y-4">
        {reminders.map((r) => (
          <Card key={r.id}>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{r.reminder_type}</Badge>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Hours before sunset:</Label>
                    <Input
                      type="number"
                      step="0.5"
                      className="w-20"
                      defaultValue={r.hours_before_sunset || 0}
                      onBlur={(e) =>
                        updateReminder(
                          r.id,
                          "hours_before_sunset",
                          parseFloat(e.target.value),
                        )
                      }
                    />
                  </div>
                  {r.is_sent && (
                    <Badge className="bg-green-100 text-green-800">Sent</Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteReminder(r.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <Textarea
                defaultValue={r.message_template || ""}
                rows={3}
                onBlur={(e) =>
                  updateReminder(r.id, "message_template", e.target.value)
                }
              />
              {r.scheduled_at && (
                <p className="text-xs text-muted-foreground">
                  Scheduled: {new Date(r.scheduled_at).toLocaleString("en-PK")}
                </p>
              )}
            </CardContent>
          </Card>
        ))}

        {reminders.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No reminders configured. Click "Add Reminder" to create one.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
