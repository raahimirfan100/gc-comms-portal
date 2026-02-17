"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  CalendarDays,
  Utensils,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { SkeletonChart } from "@/components/ui/skeleton-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCountUp } from "@/lib/hooks/use-count-up";
import { ProgressRing } from "@/components/analytics/progress-ring";
import { BarList, type BarListItem } from "@/components/analytics/bar-list";
import { DonutWithCenter, type DonutItem } from "@/components/analytics/donut-with-center";
import { AreaMinimal } from "@/components/analytics/area-minimal";
import { WhatsAppAnalyticsTab } from "@/components/analytics/whatsapp-tab";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#0891b2",
  "#ca8a04",
  "#6366f1",
];

const STATUS_LABELS: Record<string, string> = {
  assigned: "Assigned",
  confirmed: "Confirmed",
  en_route: "En route",
  arrived: "Arrived",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
  waitlisted: "Waitlisted",
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  google_form: "Google Form",
  in_app_form: "In-app Form",
  bulk_import: "Bulk Import",
};

type AssignmentRow = {
  id: string;
  status: string;
  duty_id: string;
  drive_id: string;
  duties: { name: string } | null;
  drives: { name: string } | null;
  volunteers?: { name: string; gender: string | null; source: string } | null;
};

export default function AnalyticsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [noSeason, setNoSeason] = useState(false);
  const [seasonName, setSeasonName] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalVolunteers: 0,
    totalDrives: 0,
    totalAssignments: 0,
    completedAssignments: 0,
    confirmedCount: 0,
    noShowCount: 0,
    reminderSent: 0,
    reminderTotal: 0,
  });
  const [assignmentStatusBreakdown, setAssignmentStatusBreakdown] = useState<DonutItem[]>([]);
  const [driveStatusBreakdown, setDriveStatusBreakdown] = useState<BarListItem[]>([]);
  const [dutyDistribution, setDutyDistribution] = useState<DonutItem[]>([]);
  const [driveStats, setDriveStats] = useState<BarListItem[]>([]);
  const [volunteerSourceDistribution, setVolunteerSourceDistribution] = useState<DonutItem[]>([]);
  const [genderDistribution, setGenderDistribution] = useState<DonutItem[]>([]);
  const [capacityFillByDrive, setCapacityFillByDrive] = useState<BarListItem[]>([]);
  const [drivesOverTime, setDrivesOverTime] = useState<
    Array<{ date: string; volunteers: number; drives?: number }>
  >([]);
  const [leaderboard, setLeaderboard] = useState<BarListItem[]>([]);
  const [driveIds, setDriveIds] = useState<string[]>([]);

  const countVolunteers = useCountUp(stats.totalVolunteers);
  const countDrives = useCountUp(stats.totalDrives);
  const countAssignments = useCountUp(stats.totalAssignments);
  const countCompleted = useCountUp(stats.completedAssignments);
  const countConfirmed = useCountUp(stats.confirmedCount);
  const countNoShow = useCountUp(stats.noShowCount);
  const countReminderSent = useCountUp(stats.reminderSent);
  const countReminderTotal = useCountUp(stats.reminderTotal);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    const { data: activeSeason } = await supabase
      .from("seasons")
      .select("id, name")
      .eq("is_active", true)
      .single();

    if (!activeSeason) {
      setNoSeason(true);
      setLoading(false);
      return;
    }

    setSeasonName(activeSeason.name);
    const driveIdsRes = await supabase
      .from("drives")
      .select("id, name, drive_date, status")
      .eq("season_id", activeSeason.id);
    const allDrives = driveIdsRes.data ?? [];
    const driveIds = allDrives.map((d) => d.id);
    setDriveIds(driveIds);

    const [volRes, assignRes, driveDutiesRes, reminderRes] = await Promise.all([
      supabase.from("volunteers").select("id", { count: "exact" }).eq("is_active", true),
      driveIds.length
        ? supabase
            .from("assignments")
            .select(
              "id, status, duty_id, drive_id, duties(name), drives(name), volunteers(name, gender, source)"
            )
            .in("drive_id", driveIds)
        : { data: [] as AssignmentRow[] },
      driveIds.length
        ? supabase
            .from("drive_duties")
            .select(
              "drive_id, calculated_capacity, manual_capacity_override, current_assigned, drives(name)"
            )
            .in("drive_id", driveIds)
        : { data: [] },
      supabase
        .from("reminder_schedules")
        .select("id, is_sent")
        .in("drive_id", driveIds.length ? driveIds : ["00000000-0000-0000-0000-000000000000"]),
    ]);

    const assignments = (assignRes.data ?? []) as AssignmentRow[];
    const nonWaitlisted = assignments.filter((a) => a.status !== "waitlisted");

    const dutyCount: Record<string, number> = {};
    nonWaitlisted.forEach((a) => {
      const name = (a.duties as { name?: string })?.name ?? "Unknown";
      dutyCount[name] = (dutyCount[name] || 0) + 1;
    });
    setDutyDistribution(
      Object.entries(dutyCount).map(([name, value]) => ({ name, value }))
    );

    const driveCount: Record<string, { name: string; count: number }> = {};
    nonWaitlisted.forEach((a) => {
      const driveName = (a.drives as { name?: string })?.name ?? a.drive_id;
      if (!driveCount[a.drive_id]) driveCount[a.drive_id] = { name: driveName, count: 0 };
      driveCount[a.drive_id].count++;
    });
    setDriveStats(
      Object.values(driveCount).map((d) => ({ name: d.name, value: d.count }))
    );

    const statusCount: Record<string, number> = {};
    nonWaitlisted.forEach((a) => {
      const label = STATUS_LABELS[a.status] ?? a.status;
      statusCount[label] = (statusCount[label] || 0) + 1;
    });
    setAssignmentStatusBreakdown(
      Object.entries(statusCount).map(([name, value]) => ({ name, value }))
    );

    const driveStatusCount: Record<string, number> = {};
    allDrives.forEach((d) => {
      const label = d.status.charAt(0).toUpperCase() + d.status.slice(1).replace("_", " ");
      driveStatusCount[label] = (driveStatusCount[label] || 0) + 1;
    });
    setDriveStatusBreakdown(
      Object.entries(driveStatusCount).map(([name, value]) => ({ name, value }))
    );

    const sourceCount: Record<string, number> = {};
    const genderCount: Record<string, number> = {};
    assignments.forEach((a) => {
      const v = a.volunteers as { source?: string; gender?: string } | null;
      const src = SOURCE_LABELS[v?.source ?? "manual"] ?? v?.source ?? "Manual";
      sourceCount[src] = (sourceCount[src] || 0) + 1;
      const g = v?.gender === "female" ? "Female" : "Male";
      genderCount[g] = (genderCount[g] || 0) + 1;
    });
    setVolunteerSourceDistribution(
      Object.entries(sourceCount).map(([name, value]) => ({ name, value }))
    );
    setGenderDistribution(
      Object.entries(genderCount).map(([name, value]) => ({ name, value }))
    );

    const dd = driveDutiesRes.data ?? [];
    const byDrive: Record<string, { name: string; filled: number; total: number }> = {};
    dd.forEach((row: { drive_id: string; current_assigned: number; manual_capacity_override: number | null; calculated_capacity: number; drives?: { name?: string } | { name?: string }[] | null }) => {
      const drives = row.drives;
      const name = Array.isArray(drives) ? drives[0]?.name : (drives as { name?: string })?.name;
      const driveName = name ?? row.drive_id;
      if (!byDrive[row.drive_id]) byDrive[row.drive_id] = { name: driveName, filled: 0, total: 0 };
      const cap = row.manual_capacity_override ?? row.calculated_capacity;
      byDrive[row.drive_id].filled += row.current_assigned;
      byDrive[row.drive_id].total += cap;
    });
    const capacityList = Object.entries(byDrive)
      .filter(([, v]) => v.total > 0)
      .map(([, v]) => ({
        name: v.name,
        value: Math.round((v.filled / v.total) * 100),
      }));
    setCapacityFillByDrive(capacityList);

    const sortedDrives = [...allDrives].sort(
      (a, b) =>
        new Date((a as { drive_date?: string }).drive_date ?? 0).getTime() -
        new Date((b as { drive_date?: string }).drive_date ?? 0).getTime()
    );
    const volunteersByDriveId: Record<string, number> = {};
    Object.entries(driveCount).forEach(([id, d]) => {
      volunteersByDriveId[id] = d.count;
    });
    const aggregated: Record<string, { drives: number; volunteers: number }> = {};
    sortedDrives.forEach((d) => {
      const date = (d as { drive_date?: string }).drive_date ?? "";
      if (!date) return;
      if (!aggregated[date]) aggregated[date] = { drives: 0, volunteers: 0 };
      aggregated[date].drives += 1;
      aggregated[date].volunteers += volunteersByDriveId[(d as { id?: string }).id ?? ""] ?? 0;
    });
    setDrivesOverTime(
      Object.entries(aggregated)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({
          date: date ? new Date(date + "T00:00:00").toLocaleDateString("en-AU", { month: "short", day: "numeric", year: "2-digit" }) : date,
          volunteers: v.volunteers,
          drives: v.drives,
        }))
    );

    const reminderData = reminderRes.data ?? [];
    const sent = reminderData.filter((r: { is_sent?: boolean }) => r.is_sent).length;

    setStats({
      totalVolunteers: volRes.count ?? 0,
      totalDrives: allDrives.length,
      totalAssignments: nonWaitlisted.length,
      completedAssignments: nonWaitlisted.filter((a) => a.status === "completed").length,
      confirmedCount: nonWaitlisted.filter((a) =>
        ["confirmed", "en_route", "arrived", "completed"].includes(a.status)
      ).length,
      noShowCount: nonWaitlisted.filter((a) => a.status === "no_show").length,
      reminderSent: sent,
      reminderTotal: reminderData.length,
    });

    const volunteerDriveCount: Record<string, number> = {};
    nonWaitlisted.forEach((a) => {
      if (!["completed", "arrived"].includes(a.status)) return;
      const v = a.volunteers as { name?: string } | null;
      const n = v?.name ?? "Unknown";
      volunteerDriveCount[n] = (volunteerDriveCount[n] || 0) + 1;
    });
    const leader = Object.entries(volunteerDriveCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    setLeaderboard(leader);

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="page-fade-in">
        <div className="mb-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 grid-flow-dense auto-rows-[minmax(160px,auto)]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-2.5 col-span-1 flex flex-col justify-center">
              <Skeleton className="h-2.5 w-14" />
              <Skeleton className="mt-1.5 h-6 w-10" />
            </div>
          ))}
          <Card className="col-span-2"><CardContent className="p-2 flex flex-row items-center gap-3 py-2"><Skeleton className="h-16 w-16 rounded-full shrink-0" /><div className="space-y-1"><Skeleton className="h-3 w-24" /><Skeleton className="h-2.5 w-28" /></div></CardContent></Card>
          <Card className="col-span-2"><CardContent className="p-2 flex flex-row items-center gap-3 py-2"><Skeleton className="h-16 w-16 rounded-full shrink-0" /><div className="space-y-1"><Skeleton className="h-3 w-24" /><Skeleton className="h-2.5 w-20" /></div></CardContent></Card>
          <Card className="col-span-2 md:row-span-2"><div className="p-2 border-b border-border/50"><Skeleton className="h-3 w-28" /></div><CardContent className="p-2 pt-2"><Skeleton className="h-44 w-full rounded" /></CardContent></Card>
          <Card className="col-span-2"><div className="p-2 border-b border-border/50"><Skeleton className="h-3 w-24" /></div><CardContent className="p-2 pt-2"><Skeleton className="h-28 w-full rounded" /></CardContent></Card>
          <Card className="col-span-2"><div className="p-2 border-b border-border/50"><Skeleton className="h-3 w-28" /></div><CardContent className="p-2 pt-2"><Skeleton className="h-20 w-full" /></CardContent></Card>
          <Card className="col-span-2 md:col-span-4"><div className="p-2 border-b border-border/50"><Skeleton className="h-3 w-32" /></div><CardContent className="p-2 pt-2"><Skeleton className="h-44 w-full rounded" /></CardContent></Card>
          <Card className="col-span-2"><div className="p-2 border-b border-border/50"><Skeleton className="h-3 w-20" /></div><CardContent className="p-2 pt-2"><Skeleton className="h-16 w-full" /></CardContent></Card>
          <Card className="col-span-2"><div className="p-2 border-b border-border/50"><Skeleton className="h-3 w-24" /></div><CardContent className="p-2 pt-2"><Skeleton className="h-24 w-full rounded" /></CardContent></Card>
          <Card className="col-span-2"><div className="p-2 border-b border-border/50"><Skeleton className="h-3 w-24" /></div><CardContent className="p-2 pt-2"><Skeleton className="h-24 w-full rounded" /></CardContent></Card>
          <Card className="col-span-2"><div className="p-2 border-b border-border/50"><Skeleton className="h-3 w-28" /></div><CardContent className="p-2 pt-2"><Skeleton className="h-16 w-full" /></CardContent></Card>
          <Card className="col-span-2"><div className="p-2 border-b border-border/50"><Skeleton className="h-3 w-36" /></div><CardContent className="p-2 pt-2"><Skeleton className="h-14 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (noSeason) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 page-fade-in">
        <h2 className="text-xl font-semibold">No Active Season</h2>
        <p className="text-muted-foreground text-center max-w-sm">
          Set an active season in Seasons to see analytics.
        </p>
        <Link href="/seasons">
          <Button>Go to Seasons</Button>
        </Link>
      </div>
    );
  }

  const confirmationRate =
    stats.totalAssignments > 0
      ? Math.round((stats.confirmedCount / stats.totalAssignments) * 100)
      : 0;
  const reminderRate =
    stats.reminderTotal > 0
      ? Math.round((stats.reminderSent / stats.reminderTotal) * 100)
      : 0;

  const head = "px-3 py-2 border-b border-border/50 shrink-0";
  const title = "text-sm font-medium text-foreground";
  const cell = "p-3";

  return (
    <div className="page-fade-in">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Analytics</h1>
        {seasonName && (
          <p id="overview-heading" className="mt-1 text-sm text-muted-foreground">{seasonName}</p>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-3 grid-flow-dense auto-rows-[minmax(0,auto)]"
        role="region"
        aria-label="Analytics dashboard"
      >
        {/* Row 1: 4 KPIs */}
        <div className="rounded-xl border bg-card col-span-1 flex items-center gap-3 p-3" role="listitem" aria-label={`Volunteers: ${countVolunteers}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Volunteers</p>
            <p className="text-lg font-semibold tabular-nums leading-tight">{countVolunteers}</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card col-span-1 flex items-center gap-3 p-3" role="listitem" aria-label={`Drives: ${countDrives}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-[hsl(var(--chart-2))]">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Drives</p>
            <p className="text-lg font-semibold tabular-nums leading-tight">{countDrives}</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card col-span-1 flex items-center gap-3 p-3" role="listitem" aria-label={`Assignments: ${countAssignments}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-[hsl(var(--chart-1))]">
            <Utensils className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assignments</p>
            <p className="text-lg font-semibold tabular-nums leading-tight">{countAssignments}</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card col-span-1 flex items-center gap-3 p-3" role="listitem" aria-label={`Completed: ${countCompleted}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-[hsl(var(--chart-2))]">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Completed</p>
            <p className="text-lg font-semibold tabular-nums leading-tight">{countCompleted}</p>
          </div>
        </div>

        {/* Row 2: Rate rings */}
        <Card className="col-span-2 overflow-hidden flex flex-col">
          <CardContent className={`${cell} flex flex-row items-center gap-3 flex-1 min-h-0`}>
            <ProgressRing value={confirmationRate} size={64} strokeWidth={6} color="hsl(var(--chart-2))" label={`${confirmationRate}%`} sublabel={`${countConfirmed}/${stats.totalAssignments}`} />
            <div className="min-w-0">
              <p className="text-sm font-medium">Confirmation rate</p>
              <p className="text-xs text-muted-foreground">Confirmed or showed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 overflow-hidden flex flex-col">
          <CardContent className={`${cell} flex flex-row items-center gap-3 flex-1 min-h-0`}>
            <ProgressRing value={reminderRate} size={64} strokeWidth={6} color="hsl(var(--chart-4))" label={`${countReminderSent}/${countReminderTotal}`} sublabel={stats.reminderTotal ? `${reminderRate}% sent` : "No reminders"} />
            <div className="min-w-0">
              <p className="text-sm font-medium">Reminders sent</p>
              <p className="text-xs text-muted-foreground">This season</p>
            </div>
          </CardContent>
        </Card>

        {/* Row 3–4: 4 donuts in 2x2 grid (larger charts) */}
        <Card id="assignments-heading" className="col-span-2 flex flex-col overflow-hidden">
          <div className={head}>
            <p className={title}>Assignment status</p>
          </div>
          <CardContent className={`pt-2 ${cell} flex-1 min-h-0 flex flex-col`}>
            {assignmentStatusBreakdown.length > 0 ? (
              <DonutWithCenter data={assignmentStatusBreakdown} centerLabel="Total" valueFormatter={(v) => String(v)} colors={CHART_COLORS} height={180} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>
        <Card className="col-span-2 flex flex-col overflow-hidden">
          <div className={head}>
            <p className={title}>Duty distribution</p>
          </div>
          <CardContent className={`pt-2 ${cell} flex-1 min-h-0`}>
            {dutyDistribution.length > 0 ? (
              <DonutWithCenter data={dutyDistribution} centerLabel="Assignments" valueFormatter={(v) => String(v)} colors={CHART_COLORS} height={180} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>
        <Card className="col-span-2 flex flex-col overflow-hidden">
          <div className={head}>
            <p className={title}>Sign-up source</p>
          </div>
          <CardContent className={`pt-2 ${cell} flex-1 min-h-0`}>
            {volunteerSourceDistribution.length > 0 ? (
              <DonutWithCenter data={volunteerSourceDistribution} centerLabel="Assignments" valueFormatter={(v) => String(v)} colors={CHART_COLORS} height={180} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>
        <Card className="col-span-2 flex flex-col overflow-hidden">
          <div className={head}>
            <p className={title}>Gender</p>
          </div>
          <CardContent className={`pt-2 ${cell} flex-1 min-h-0`}>
            {genderDistribution.length > 0 ? (
              <DonutWithCenter data={genderDistribution} centerLabel="Total" valueFormatter={(v) => String(v)} colors={CHART_COLORS.slice(0, 2)} height={180} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Row 5: Area chart (half width) + Volunteers per drive — line chart not full width */}
        {drivesOverTime.length > 0 && (
          <Card className="col-span-2 flex flex-col overflow-hidden">
            <div className={head}>
              <p className={title}>Volunteers over time</p>
            </div>
            <CardContent className={`pt-2 ${cell}`}>
              <AreaMinimal data={drivesOverTime} height={200} />
            </CardContent>
          </Card>
        )}
        <Card className={`${drivesOverTime.length > 0 ? "col-span-2" : "col-span-2 md:col-span-4"} flex flex-col overflow-hidden`}>
          <div className={head}>
            <p className={title}>Volunteers per drive</p>
          </div>
          <CardContent className={`pt-2 ${cell} flex-1 min-h-0`}>
            {driveStats.length > 0 ? <BarList data={driveStats} valueFormatter={(v) => `${v} vol`} barColor="hsl(var(--chart-1))" /> : <p className="py-4 text-center text-sm text-muted-foreground">No data</p>}
          </CardContent>
        </Card>

        {/* Row 6: Drive status + (Capacity fill OR Leaderboard so no gap when no capacity) — no scroll */}
        <Card className="col-span-2 flex flex-col overflow-hidden">
          <div className={head}>
            <p className={title}>Drive status</p>
          </div>
          <CardContent className={`pt-2 ${cell}`}>
            {driveStatusBreakdown.length > 0 ? <BarList data={driveStatusBreakdown} valueFormatter={(v) => `${v} drive${v !== 1 ? "s" : ""}`} barColor="hsl(var(--chart-2))" /> : <p className="py-4 text-center text-sm text-muted-foreground">No drives</p>}
          </CardContent>
        </Card>
        {capacityFillByDrive.length > 0 ? (
          <Card className="col-span-2 flex flex-col overflow-hidden">
            <div className={head}>
              <p className={title}>Capacity fill by drive</p>
            </div>
            <CardContent className={`pt-2 ${cell}`}>
              <BarList data={capacityFillByDrive} valueFormatter={(v) => `${v}%`} maxValue={100} barColor="hsl(var(--chart-3))" />
            </CardContent>
          </Card>
        ) : leaderboard.length > 0 ? (
          <Card className="col-span-2 flex flex-col overflow-hidden">
            <div className={head}>
              <p className={title}>Top volunteers</p>
            </div>
            <CardContent className={`pt-2 ${cell}`}>
              <BarList data={leaderboard} valueFormatter={(v) => `${v} drive${v !== 1 ? "s" : ""}`} barColor="hsl(var(--chart-4))" />
            </CardContent>
          </Card>
        ) : null}

        {/* Row 7: Leaderboard (only if already not in row 6) + No-shows — side by side when both, else full width */}
        {leaderboard.length > 0 && capacityFillByDrive.length > 0 && (
          <Card className={`${stats.noShowCount > 0 ? "col-span-2" : "col-span-2 md:col-span-4"} flex flex-col overflow-hidden`}>
            <div className={head}>
              <p className={title}>Top volunteers</p>
            </div>
            <CardContent className={`pt-2 ${cell}`}>
              <BarList data={leaderboard} valueFormatter={(v) => `${v} drive${v !== 1 ? "s" : ""}`} barColor="hsl(var(--chart-4))" />
            </CardContent>
          </Card>
        )}
        {stats.noShowCount > 0 && (
          <Card className={`${leaderboard.length > 0 ? "col-span-2" : "col-span-2 md:col-span-4"} border border-destructive/20 bg-destructive/5 flex flex-row items-center p-3`}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/15">
              <XCircle className="h-4 w-4 text-destructive" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">No-shows this season</p>
              <p className="text-xs text-muted-foreground">
                {countNoShow} assignment{stats.noShowCount !== 1 ? "s" : ""} marked no-show
              </p>
            </div>
          </Card>
        )}
      </div>
        </TabsContent>

        <TabsContent value="whatsapp">
          <WhatsAppAnalyticsTab driveIds={driveIds} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
