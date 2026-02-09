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
            <div className="space-y-2">
              <Label htmlFor="name">Drive Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Iftaar Drive #1 - Saddar"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="drive_date">Date</Label>
                <Input
                  id="drive_date"
                  name="drive_date"
                  type="date"
                  value={driveDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="daig_count">Daig Count</Label>
                <Input
                  id="daig_count"
                  name="daig_count"
                  type="number"
                  min="0"
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sunset_time">
                  Sunset Time
                  {fetchingSunset && (
                    <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />
                  )}
                </Label>
                <Input
                  id="sunset_time"
                  type="time"
                  value={sunsetTime}
                  onChange={(e) => {
                    setSunsetTime(e.target.value);
                    setSunsetSource("manual");
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue="draft">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location_name">Location Name</Label>
              <Input
                id="location_name"
                name="location_name"
                placeholder="e.g., Saddar, Empress Market"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location_address">Location Address</Label>
              <Textarea
                id="location_address"
                name="location_address"
                placeholder="Full address..."
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-4">
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
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
