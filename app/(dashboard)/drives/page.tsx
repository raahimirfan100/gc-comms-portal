"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Filter,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate, formatTime, getStatusBadgeVariant } from "@/lib/utils";
import { checkAndUpdateDriveStatuses } from "./actions";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

const LocationMap = dynamic(
  () =>
    import("@/components/dashboard/location-map").then((m) => m.LocationMap),
  { ssr: false },
);

type DriveStatus = "draft" | "open" | "in_progress" | "completed" | "cancelled";

const DRIVE_STATUS_ORDER: DriveStatus[] = [
  "in_progress",
  "open",
  "draft",
  "completed",
  "cancelled",
];

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

function getSectionTitle(status: DriveStatus): string {
  const titles: Record<DriveStatus, string> = {
    in_progress: "In progress",
    open: "Scheduled",
    draft: "Draft",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return titles[status] ?? status.replace("_", " ");
}

const MOBILE_CARD_WIDTH_FALLBACK = 280;

function ScrollableSection({
  children,
  title,
  icon: Icon,
  iconClass,
  count,
}: {
  children: React.ReactNode;
  title: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  iconClass: string;
  count: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [containerWidth, setContainerWidth] = useState(MOBILE_CARD_WIDTH_FALLBACK);

  const checkScrollability = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 1);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    const updateWidth = () => {
      const w = scrollElement.clientWidth;
      if (w > 0) setContainerWidth(w);
    };

    updateWidth();
    scrollElement.scrollLeft = 0;
    checkScrollability();

    scrollElement.addEventListener("scroll", checkScrollability);
    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
      checkScrollability();
    });
    resizeObserver.observe(scrollElement);

    return () => {
      scrollElement.removeEventListener("scroll", checkScrollability);
      resizeObserver.disconnect();
    };
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Icon className={`h-5 w-5 ${iconClass}`} />
          {title}
          <span className="text-muted-foreground font-normal">({count})</span>
        </h2>
        {(canScrollLeft || canScrollRight) && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
                canScrollLeft
                  ? "border-border bg-background hover:bg-accent cursor-pointer"
                  : "border-border/50 bg-background/50 cursor-not-allowed opacity-50"
              }`}
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
                canScrollRight
                  ? "border-border bg-background hover:bg-accent cursor-pointer"
                  : "border-border/50 bg-background/50 cursor-not-allowed opacity-50"
              }`}
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      <div
        ref={scrollRef}
        className="overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide snap-x snap-mandatory md:snap-none"
        style={
          {
            "--section-card-width": `${containerWidth}px`,
          } as React.CSSProperties
        }
        onWheel={(e) => {
          if (e.shiftKey && scrollRef.current) {
            e.preventDefault();
            scrollRef.current.scrollLeft += e.deltaY;
          }
        }}
      >
        <div className="flex gap-4 min-w-0" style={{ width: "max-content" }}>
          {React.Children.map(children, (child, index) => (
            <div
              key={(child as React.ReactElement)?.key ?? index}
              className="shrink-0 w-[var(--section-card-width)] min-w-[var(--section-card-width)] snap-start [scroll-snap-stop:always] md:w-auto md:min-w-0 md:[scroll-snap-align:unset] md:[scroll-snap-stop:normal]"
            >
              {child}
            </div>
          ))}
        </div>
      </div>
    </section>
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

function DriveCard({ drive }: { drive: DriveWithDuties }) {
  const totalCapacity =
    drive.drive_duties?.reduce(
      (sum, dd) =>
        sum + (dd.manual_capacity_override ?? dd.calculated_capacity),
      0,
    ) || 0;
  const totalAssigned =
    drive.drive_duties?.reduce((sum, dd) => sum + dd.current_assigned, 0) || 0;
  const fillPercent =
    totalCapacity > 0 ? Math.round((totalAssigned / totalCapacity) * 100) : 0;
  const hasTarget =
    typeof drive.volunteer_target === "number" && drive.volunteer_target > 0;
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
    <Link
      href={`/drives/${drive.id}`}
      className="block w-full shrink-0 md:w-[380px] md:min-w-[380px] lg:min-w-[400px] lg:w-[400px]"
    >
      <Card
        className={`stagger-item group cursor-pointer overflow-hidden rounded-2xl border shadow-sm transition-all h-full ${
          isInProgress
            ? "border-sky-500/60 bg-sky-500/5 hover:border-sky-500/80 hover:shadow-lg hover:shadow-sky-500/20"
            : isCompleted
              ? "border-primary/5 bg-card/60 opacity-70 hover:border-primary/20 hover:opacity-90"
              : "border-primary/10 bg-card/90 hover:border-primary/40 hover:shadow-lg"
        }`}
      >
        <CardContent className="p-0">
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
              <div className="space-y-1 min-w-0">
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
                    <span className="font-semibold">{totalCapacity}</span>
                  </p>
                )}
              </div>
              <Badge
                variant={getStatusBadgeVariant(drive.status).variant}
                className="flex shrink-0 items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
              >
                <StatusIcon
                  className={`h-3 w-3 ${statusConfig.iconClass}`}
                />
                <span className="hidden sm:inline">{statusConfig.label}</span>
                <span className="sm:hidden">
                  {statusConfig.label.split(" ")[0]}
                </span>
              </Badge>
            </div>
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
            <Progress value={Math.min(fillPercent, 100)} className="h-1.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DrivesPage() {
  const supabase = createClient();
  const [drives, setDrives] = useState<DriveWithDuties[]>([]);
  const [loading, setLoading] = useState(true);
  const [noSeason, setNoSeason] = useState(false);
  const [viewMode, setViewMode] = useState<"byStatus" | "showAll">("byStatus");
  const [statusFilter, setStatusFilter] = useState<Set<DriveStatus>>(
    () => new Set(DRIVE_STATUS_ORDER),
  );

  const drivesByStatus = useMemo(() => {
    const map: Record<DriveStatus, DriveWithDuties[]> = {
      in_progress: [],
      open: [],
      draft: [],
      completed: [],
      cancelled: [],
    };
    for (const drive of drives) {
      const s = drive.status as DriveStatus;
      if (map[s]) map[s].push(drive);
    }
    return map;
  }, [drives]);

  const filteredAndSortedDrives = useMemo(() => {
    if (viewMode !== "showAll") return [];
    const filtered = statusFilter.size
      ? drives.filter((d) => statusFilter.has(d.status as DriveStatus))
      : drives;
    return [...filtered].sort(
      (a, b) =>
        new Date(a.drive_date).getTime() - new Date(b.drive_date).getTime(),
    );
  }, [drives, viewMode, statusFilter]);

  function toggleStatusFilter(status: DriveStatus) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

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
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} variant="drive" />
          ))}
        </div>
      </div>
    );
  }

  if (noSeason) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 page-fade-in">
        <h2 className="text-xl font-semibold">No Active Season</h2>
        <p className="text-muted-foreground">
          Create a season to get started.
        </p>
        <Link href="/seasons">
          <Button>Go to Seasons</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Iftaar Drives</h1>
          <p className="text-muted-foreground">
            Manage all iftaar drives for the current season
          </p>
        </div>
        <Link href="/drives/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Drive
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
          <Button
            type="button"
            variant={viewMode === "byStatus" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 gap-1.5 px-2.5"
            onClick={() => setViewMode("byStatus")}
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">By status</span>
          </Button>
          <Button
            type="button"
            variant={viewMode === "showAll" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 gap-1.5 px-2.5"
            onClick={() => setViewMode("showAll")}
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Show all</span>
          </Button>
        </div>
        {viewMode === "showAll" && (
          <>
            <span className="text-muted-foreground/70 px-1" aria-hidden>
              |
            </span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5">
                  <Filter className="h-4 w-4" />
                  Filter by status
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                  Show drives with status
                </p>
                <div className="space-y-1.5">
                  {DRIVE_STATUS_ORDER.map((status) => {
                    const config = getStatusBadgeConfig(status);
                    const Icon = config.Icon;
                    return (
                      <label
                        key={status}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
                      >
                        <Checkbox
                          checked={statusFilter.has(status)}
                          onCheckedChange={() => toggleStatusFilter(status)}
                        />
                        <Icon
                          className={`h-4 w-4 shrink-0 ${config.iconClass}`}
                        />
                        <span className="text-sm">
                          {getSectionTitle(status)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
            <div className="flex flex-wrap items-center gap-1.5">
              {DRIVE_STATUS_ORDER.filter((s) => statusFilter.has(s)).map(
                (status) => {
                  const config = getStatusBadgeConfig(status);
                  const Icon = config.Icon;
                  return (
                    <Badge
                      key={status}
                      variant="secondary"
                      className="cursor-pointer gap-1 pr-1 text-xs font-medium hover:bg-secondary/80"
                      onClick={() => toggleStatusFilter(status)}
                    >
                      <Icon
                        className={`h-3 w-3 shrink-0 ${config.iconClass}`}
                      />
                      {getSectionTitle(status)}
                    </Badge>
                  );
                },
              )}
            </div>
          </>
        )}
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
      ) : viewMode === "showAll" ? (
        <div className="space-y-4">
          {filteredAndSortedDrives.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">
                  No drives match the selected status filter.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAndSortedDrives.map((drive) => (
                <DriveCard key={drive.id} drive={drive} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {DRIVE_STATUS_ORDER.map((status) => {
            const list = drivesByStatus[status];
            if (!list.length) return null;

            const sectionConfig = getStatusBadgeConfig(status);
            const SectionIcon = sectionConfig.Icon;

            return (
              <ScrollableSection
                key={status}
                title={getSectionTitle(status)}
                icon={SectionIcon}
                iconClass={sectionConfig.iconClass}
                count={list.length}
              >
                {list.map((drive) => (
                  <DriveCard key={drive.id} drive={drive} />
                ))}
              </ScrollableSection>
            );
          })}
        </div>
      )}
    </div>
  );
}
