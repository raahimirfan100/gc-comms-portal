"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn, getStatusBadgeVariant } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Radio,
  RefreshCw,
  UserX,
  Users,
  Car,
  Clock,
  Percent,
  PhoneOff,
  UserCheck,
} from "lucide-react";
import { SkeletonStatCard } from "@/components/ui/skeleton-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountUp } from "@/lib/hooks/use-count-up";

type AssignmentWithVolunteer = {
  id: string;
  status: string;
  duty_id: string;
  volunteers: { name: string; phone: string } | null;
  duties: { name: string } | null;
};

export default function LiveDashboardPage() {
  const { id: driveId } = useParams<{ id: string }>();
  const supabase = createClient();
  const [assignments, setAssignments] = useState<AssignmentWithVolunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [deficitAlert, setDeficitAlert] = useState(false);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("live-dashboard")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "assignments",
          filter: `drive_id=eq.${driveId}`,
        },
        () => loadData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driveId]);

  async function loadData() {
    const { data } = await supabase
      .from("assignments")
      .select("*, volunteers(name, phone), duties(name)")
      .eq("drive_id", driveId)
      .neq("status", "waitlisted")
      .order("created_at");

    if (data) {
      setAssignments(data as unknown as AssignmentWithVolunteer[]);
      // Check deficit
      const total = data.length;
      const problematic = data.filter(
        (a) =>
          a.status === "cancelled" ||
          a.status === "no_show" ||
          a.status === "assigned",
      ).length;
      setDeficitAlert(total > 0 && (problematic / total) * 100 > 20);
    }
    setLoading(false);
  }

  const statusCounts: Record<string, number> = {};
  assignments.forEach((a) => {
    statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
  });

  const total = assignments.length;
  const confirmed = statusCounts["confirmed"] || 0;
  const enRoute = statusCounts["en_route"] || 0;
  const arrived = statusCounts["arrived"] || 0;
  const cancelled = statusCounts["cancelled"] || 0;
  const unconfirmed = statusCounts["assigned"] || 0;
  const noShow = statusCounts["no_show"] || 0;

  const countTotal = useCountUp(total);
  const countConfirmed = useCountUp(confirmed);
  const countEnRoute = useCountUp(enRoute);
  const countArrived = useCountUp(arrived);
  const countCancelled = useCountUp(cancelled);
  const countUnconfirmed = useCountUp(unconfirmed);
  const countNoShow = useCountUp(noShow);

  const pctConfirmed = total > 0 ? Math.round((confirmed / total) * 100) : 0;
  const pctArrived = total > 0 ? Math.round((arrived / total) * 100) : 0;

  if (loading) {
    return (
      <div className="space-y-6 page-fade-in">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-8 w-48" />
            </div>
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonStatCard key={i} variant="live" />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonStatCard key={i} variant="live" />
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-md" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
      {
        label: "Total",
        value: countTotal,
        icon: Users,
        iconClass: "text-primary",
        borderClass: "border-l-primary/60",
      },
      {
        label: "Confirmed",
        value: countConfirmed,
        icon: CheckCircle2,
        iconClass: "text-green-600 dark:text-green-400",
        borderClass: "border-l-green-500/60",
      },
      {
        label: "En Route",
        value: countEnRoute,
        icon: Car,
        iconClass: "text-amber-600 dark:text-amber-400",
        borderClass: "border-l-amber-500/60",
      },
      {
        label: "Arrived",
        value: countArrived,
        icon: MapPin,
        iconClass: "text-emerald-600 dark:text-emerald-400",
        borderClass: "border-l-emerald-500/60",
      },
      {
        label: "Cancelled",
        value: countCancelled,
        icon: UserX,
        iconClass: "text-red-600 dark:text-red-400",
        borderClass: "border-l-red-500/60",
      },
    ];

    const extraMetrics = [
      {
        label: "Unconfirmed",
        value: countUnconfirmed,
        icon: Clock,
        iconClass: "text-amber-600 dark:text-amber-400",
        borderClass: "border-l-amber-500/60",
      },
      {
        label: "No-show",
        value: countNoShow,
        icon: PhoneOff,
        iconClass: "text-red-600 dark:text-red-400",
        borderClass: "border-l-red-500/60",
      },
      {
        label: "% Confirmed",
        value: `${pctConfirmed}%`,
        icon: UserCheck,
        iconClass: "text-green-600 dark:text-green-400",
        borderClass: "border-l-green-500/60",
      },
      {
        label: "% On site",
        value: `${pctArrived}%`,
        icon: Percent,
        iconClass: "text-emerald-600 dark:text-emerald-400",
        borderClass: "border-l-emerald-500/60",
      },
    ];

    function getStatusBorderClass(status: string): string {
      const map: Record<string, string> = {
        assigned: "border-l-primary/60",
        confirmed: "border-l-green-500/60",
        en_route: "border-l-amber-500/60",
        arrived: "border-l-emerald-500/60",
        cancelled: "border-l-red-500/60",
        no_show: "border-l-red-500/60",
      };
      return map[status] ?? "border-l-border";
    }

    return (
      <div className="space-y-6 page-fade-in">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 shrink-0 text-red-500 animate-pulse" aria-hidden />
              <h1 className="text-2xl font-bold">Live Dashboard</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Real-time volunteer check-in status for drive day
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadData()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {deficitAlert && (
          <div
            className="stagger-item flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 dark:bg-amber-500/5"
            role="alert"
          >
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="min-w-0">
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Volunteer deficit
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                More than 20% are unconfirmed or cancelled. Consider calling
                remaining volunteers or activating waitlist.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {statCards.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={cn(
                  "stagger-item rounded-xl border border-border/60 bg-muted/60 px-3 py-4 border-l-4",
                  stat.borderClass,
                )}
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{stat.label}</span>
                  <Icon className={cn("h-3.5 w-3.5", stat.iconClass)} />
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums">{stat.value}</p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {extraMetrics.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={cn(
                  "stagger-item rounded-xl border border-border/60 bg-muted/60 px-3 py-4 border-l-4",
                  stat.borderClass,
                )}
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{stat.label}</span>
                  <Icon className={cn("h-3.5 w-3.5", stat.iconClass)} />
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums">{stat.value}</p>
              </div>
            );
          })}
        </div>

        <Card className="stagger-item">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              All Volunteers
            </CardTitle>
            <CardDescription>
              Assigned volunteers and their current check-in status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {assignments.length === 0 ? (
                <div className="col-span-full empty-state py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <div className="empty-state-icon text-4xl">👥</div>
                    <p className="text-base font-medium">No volunteers assigned</p>
                    <p className="text-sm">
                      Assign volunteers to this drive to see them here
                    </p>
                  </div>
                </div>
              ) : (
                assignments.map((a) => (
                  <div
                    key={a.id}
                    className={cn(
                      "stagger-item list-item flex items-center justify-between rounded-md border border-border/80 bg-card p-3 border-l-4",
                      getStatusBorderClass(a.status),
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-sm">
                        {a.volunteers?.name ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.duties?.name ?? "—"}
                      </p>
                    </div>
                    <Badge
                      variant={getStatusBadgeVariant(a.status).variant}
                      className="ml-2 shrink-0 capitalize"
                    >
                      {a.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
