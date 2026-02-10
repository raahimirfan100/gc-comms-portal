"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createDrive, fetchSunsetTime } from "../actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { FormActions } from "@/components/ui/form-actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function NewDrivePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingSunset, setFetchingSunset] = useState(false);
  const [seasonId, setSeasonId] = useState("");
  const [sunsetTime, setSunsetTime] = useState("");
  const [sunsetSource, setSunsetSource] = useState("aladhan");
  const [driveDate, setDriveDate] = useState("");

  useEffect(() => {
    async function loadActiveSeason() {
      const supabase = createClient();
      const { data } = await supabase
        .from("seasons")
        .select("id")
        .eq("is_active", true)
        .single();
      if (data) setSeasonId(data.id);
    }
    loadActiveSeason();
  }, []);

  async function handleDateChange(date: string) {
    setDriveDate(date);
    if (!date) return;

    setFetchingSunset(true);
    const time = await fetchSunsetTime(date);
    if (time) {
      setSunsetTime(time);
      setSunsetSource("aladhan");
      toast.success(`Sunset time fetched: ${time}`);
    } else {
      toast.error("Could not fetch sunset time. Enter manually.");
      setSunsetSource("manual");
    }
    setFetchingSunset(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("season_id", seasonId);
    formData.set("sunset_time", sunsetTime);
    formData.set("sunset_source", sunsetSource);

    const result = await createDrive(formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Drive created successfully!");
      router.push("/drives");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Create New Drive</CardTitle>
          <CardDescription>
            Set up an iftaar drive. Sunset time will be auto-fetched from
            Aladhan API for Karachi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              label="Drive Name"
              htmlFor="name"
              required
              description="Give this drive a clear, descriptive name."
            >
              <Input
                id="name"
                name="name"
                placeholder="e.g., Iftaar Drive #1 - Saddar"
                required
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Date" htmlFor="drive_date" required>
                <Input
                  id="drive_date"
                  name="drive_date"
                  type="date"
                  value={driveDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Daig Count" htmlFor="daig_count" required>
                <Input
                  id="daig_count"
                  name="daig_count"
                  type="number"
                  min="0"
                  placeholder="0"
                  required
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label={
                  <>
                    Sunset Time
                    {fetchingSunset && (
                      <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />
                    )}
                  </>
                }
                htmlFor="sunset_time"
              >
                <Input
                  id="sunset_time"
                  type="time"
                  value={sunsetTime}
                  onChange={(e) => {
                    setSunsetTime(e.target.value);
                    setSunsetSource("manual");
                  }}
                />
              </FormField>
              <FormField label="Status" htmlFor="status">
                <Select name="status" defaultValue="draft">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <FormField
              label="Location Name"
              htmlFor="location_name"
              description="Where will the drive take place?"
            >
              <Input
                id="location_name"
                name="location_name"
                placeholder="e.g., Saddar, Empress Market"
              />
            </FormField>

            <FormField
              label="Location Address"
              htmlFor="location_address"
              description="Add any additional details to help volunteers find the location."
            >
              <Textarea
                id="location_address"
                name="location_address"
                placeholder="Full address..."
                rows={2}
              />
            </FormField>

            <FormActions className="pt-4">
              <Button type="submit" disabled={loading || !seasonId}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Create Drive
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </FormActions>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
