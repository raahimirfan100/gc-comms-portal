"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  MapPin,
  Calendar,
  Utensils,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  MoonStar,
  PlayCircle,
  XCircle,
  Users,
  Sun,
} from "lucide-react";
import { formatDate, formatTime, getStatusColor } from "@/lib/utils";
import { checkAndUpdateDriveStatuses } from "./actions";

const LocationMap = dynamic(
  () =>
    import("@/components/dashboard/location-map").then((m) => m.LocationMap),
  { ssr: false },
);

type DriveStatus = "draft" | "open" | "in_progress" | "completed" | "cancelled";

function getStatusBadgeConfig(status: string): {
  label: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  iconClass: string;
  borderClass: string;
} {
  const statusMap: Record<
    string,
    {
      label: string;
      Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
      iconClass: string;
      borderClass: string;
    }
  > = {
    draft: {
      label: "Planning",
      Icon: MoonStar,
      iconClass: "text-amber-500",
      borderClass: "border-amber-500/50",
    },
    open: {
      label: "Scheduled",
      Icon: Users,
      iconClass: "text-emerald-500",
      borderClass: "border-emerald-500/50",
    },
    in_progress: {
      label: "In progress",
      Icon: PlayCircle,
      iconClass: "text-sky-500",
      borderClass: "border-sky-500/50",
    },
    completed: {
      label: "Completed",
      Icon: CheckCircle2,
      iconClass: "text-emerald-500",
      borderClass: "border-emerald-500/50",
    },
    cancelled: {
      label: "Cancelled",
      Icon: XCircle,
      iconClass: "text-red-500",
      borderClass: "border-red-500/50",
    },
  };

  return (
    statusMap[status] ?? {
      label: status.replace("_", " "),
      Icon: Calendar,
      iconClass: "text-muted-foreground",
      borderClass: "border-muted-foreground/50",
    }
  );
}

type DriveWithDuties = {
  id: string;
  name: string;
  drive_date: string;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  daig_count: number;
  sunset_time: string | null;
  status: string;
  volunteer_target: number | null;
  drive_duties: Array<{
    id: string;
    calculated_capacity: number;
    manual_capacity_override: number | null;
    current_assigned: number;
  }>;
};

export default function DrivesPage() {
  const supabase = createClient();
  const [drives, setDrives] = useState<DriveWithDuties[]>([]);
  const [loading, setLoading] = useState(true);
  const [noSeason, setNoSeason] = useState(false);

  useEffect(() => {
    async function load() {
      // Check and update drive statuses based on date
      await checkAndUpdateDriveStatuses();

      const { data: activeSeason } = await supabase
        .from("seasons")
        .select("id")
        .eq("is_active", true)
        .single();

      if (!activeSeason) {
        setNoSeason(true);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("drives")
        .select(
          `*, drive_duties(id, calculated_capacity, manual_capacity_override, current_assigned)`,
        )
        .eq("season_id", activeSeason.id)
        .order("drive_date", { ascending: true });

      if (data) setDrives(data as unknown as DriveWithDuties[]);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (noSeason) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <h2 className="text-xl font-semibold">No Active Season</h2>
        <p className="text-muted-foreground">
          Create a season in Settings to get started.
        </p>
        <Link href="/settings/general">
          <Button>Go to Settings</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Iftaar Drives</h1>
          <p className="text-muted-foreground">
            Manage all iftaar drives for the current season
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Link href="/drives/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Drive
            </Button>
          </Link>
        </div>
      </div>

      {drives.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              No drives yet for this season.
            </p>
            <Link href="/drives/new">
              <Button variant="outline">Create Your First Drive</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {drives.map((drive) => {
            const totalCapacity =
              drive.drive_duties?.reduce(
                (sum, dd) =>
                  sum + (dd.manual_capacity_override ?? dd.calculated_capacity),
                0,
              ) || 0;
            const totalAssigned =
              drive.drive_duties?.reduce(
                (sum, dd) => sum + dd.current_assigned,
                0,
              ) || 0;
            const fillPercent =
              totalCapacity > 0
                ? Math.round((totalAssigned / totalCapacity) * 100)
                : 0;
            const hasTarget =
              typeof drive.volunteer_target === "number" &&
              drive.volunteer_target > 0;
            const capacityMismatch =
              hasTarget && drive.volunteer_target !== totalCapacity;

            const statusConfig = getStatusBadgeConfig(drive.status);
            const StatusIcon = statusConfig.Icon;

            const hasLocation =
              typeof drive.location_lat === "number" &&
              typeof drive.location_lng === "number";

            const isInProgress = drive.status === "in_progress";
            const isCompleted = drive.status === "completed";

            return (
              <Link key={drive.id} href={`/drives/${drive.id}`}>
                <Card
                  className={`group cursor-pointer overflow-hidden rounded-2xl border shadow-sm transition-all ${
                    isInProgress
                      ? "border-sky-500/60 bg-sky-500/5 hover:border-sky-500/80 hover:shadow-lg hover:shadow-sky-500/20"
                      : isCompleted
                        ? "border-primary/5 bg-card/60 opacity-70 hover:border-primary/20 hover:opacity-90"
                        : "border-primary/10 bg-card/90 hover:border-primary/40 hover:shadow-lg"
                  }`}
                >
                  <CardContent className="p-0">
                    {/* Map at top - clicks stay on map (open directions), don't navigate */}
                    <div
                      className="border-b border-border"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {hasLocation ? (
                        <LocationMap
                          lat={drive.location_lat}
                          lng={drive.location_lng}
                          readOnly
                          compact
                        />
                      ) : (
                        <div className="flex h-28 w-full items-center justify-center rounded-t-2xl border-b border-border bg-muted/30 text-xs text-muted-foreground">
                          No location set
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <CardTitle className="line-clamp-1 text-base font-semibold leading-tight">
                            {drive.name}
                          </CardTitle>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(drive.drive_date)}</span>
                            </span>
                            {drive.location_name && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span className="max-w-[140px] truncate">
                                  {drive.location_name}
                                </span>
                              </span>
                            )}
                          </div>
                          {hasTarget && (
                            <p className="text-[11px] text-muted-foreground">
                              Target{" "}
                              <span className="font-semibold">
                                {drive.volunteer_target}
                              </span>{" "}
                              • Capacity{" "}
                              <span className="font-semibold">
                                {totalCapacity}
                              </span>
                            </p>
                          )}
                        </div>
                        <Badge
                          className={`flex shrink-0 items-center gap-1.5 border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${statusConfig.borderClass} ${getStatusColor(
                            drive.status,
                          )}`}
                        >
                          <StatusIcon
                            className={`h-3 w-3 ${statusConfig.iconClass}`}
                          />
                          <span className="hidden sm:inline">
                            {statusConfig.label}
                          </span>
                          <span className="sm:hidden">
                            {statusConfig.label.split(" ")[0]}
                          </span>
                        </Badge>
                      </div>

                      {/* Concise inline row: Date • Sunset • Volunteers • Daigs */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px]">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDate(drive.drive_date)}
                        </span>
                        {drive.sunset_time && (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Sun className="h-3 w-3" />
                            {formatTime(drive.sunset_time)}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {totalAssigned}/{totalCapacity}
                          <span className="text-muted-foreground font-normal">
                            ({fillPercent}%)
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Utensils className="h-3 w-3 text-muted-foreground" />
                          {drive.daig_count} daigs
                        </span>
                        {capacityMismatch && (
                          <span className="inline-flex items-center gap-1 text-amber-400">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>Target {drive.volunteer_target}</span>
                          </span>
                        )}
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{
                            width: `${Math.min(fillPercent, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
