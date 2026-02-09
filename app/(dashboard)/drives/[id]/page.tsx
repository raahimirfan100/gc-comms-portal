"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatTime, getStatusColor } from "@/lib/utils";
import { MapPin, Calendar, Utensils, Sun, Loader2 } from "lucide-react";
import { DriveStatusControl } from "./drive-status-control";

export default function DriveDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const [drive, setDrive] = useState<any>(null);
  const [driveDuties, setDriveDuties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: driveData } = await supabase
        .from("drives")
        .select("*, seasons(name)")
        .eq("id", id)
        .single();

      if (driveData) setDrive(driveData);

      const { data: dutiesData } = await supabase
        .from("drive_duties")
        .select("*, duties(name, slug, gender_restriction)")
        .eq("drive_id", id)
        .order("created_at");

      if (dutiesData) setDriveDuties(dutiesData);

      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!drive) {
    return <div className="py-12 text-center">Drive not found</div>;
  }

  const totalCapacity =
    driveDuties.reduce(
      (sum, dd) => sum + (dd.manual_capacity_override ?? dd.calculated_capacity),
      0,
    );
  const totalAssigned = driveDuties.reduce(
    (sum, dd) => sum + dd.current_assigned,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{drive.name}</h1>
            <Badge className={getStatusColor(drive.status)}>
              {drive.status.replace("_", " ")}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {drive.seasons?.name}
          </p>
        </div>
        <DriveStatusControl driveId={drive.id} currentStatus={drive.status} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Date</span>
            </div>
            <p className="mt-1 font-medium">{formatDate(drive.drive_date)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Sunset</span>
            </div>
            <p className="mt-1 font-medium">{formatTime(drive.sunset_time)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Utensils className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Daigs</span>
            </div>
            <p className="mt-1 font-medium">{drive.daig_count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Volunteers</span>
            </div>
            <p className="mt-1 font-medium">
              {totalAssigned}/{totalCapacity}
            </p>
          </CardContent>
        </Card>
      </div>

      {drive.location_name && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          {drive.location_name}
          {drive.location_address && ` — ${drive.location_address}`}
        </div>
      )}

      <div className="flex gap-2">
        <Link href={`/drives/${id}/assignments`}>
          <Button>Duty Board</Button>
        </Link>
        <Link href={`/drives/${id}/live`}>
          <Button variant="outline">Live Dashboard</Button>
        </Link>
        <Link href={`/drives/${id}/reminders`}>
          <Button variant="outline">Reminders</Button>
        </Link>
        <Link href={`/drives/${id}/calls`}>
          <Button variant="outline">Call Center</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Duty Capacity Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {driveDuties.map((dd) => {
              const capacity =
                dd.manual_capacity_override ?? dd.calculated_capacity;
              const pct =
                capacity > 0
                  ? Math.round((dd.current_assigned / capacity) * 100)
                  : 0;
              const duty = dd.duties;

              return (
                <div key={dd.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">
                      {duty?.name}
                      {duty?.gender_restriction && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {duty.gender_restriction}
                        </Badge>
                      )}
                    </span>
                    <span className="text-muted-foreground">
                      {dd.current_assigned}/{capacity}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
