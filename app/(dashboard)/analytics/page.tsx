"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CalendarDays, Utensils, Award } from "lucide-react";
import { SkeletonStatCard, SkeletonChart } from "@/components/ui/skeleton-chart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = [
  "#2563eb",
  "#16a34a",
  "#ea580c",
  "#9333ea",
  "#e11d48",
  "#0891b2",
  "#ca8a04",
  "#6366f1",
];

export default function AnalyticsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVolunteers: 0,
    totalDrives: 0,
    totalAssignments: 0,
    completedAssignments: 0,
  });
  const [dutyDistribution, setDutyDistribution] = useState<
    Array<{ name: string; value: number }>
  >([]);
  const [driveStats, setDriveStats] = useState<
    Array<{ name: string; volunteers: number }>
  >([]);
  const [leaderboard, setLeaderboard] = useState<
    Array<{ name: string; drives: number }>
  >([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    const [volRes, driveRes, assignRes, dutiesRes] = await Promise.all([
      supabase.from("volunteers").select("id", { count: "exact" }),
      supabase.from("drives").select("id, name", { count: "exact" }),
      supabase
        .from("assignments")
        .select("id, status, duty_id, drive_id, duties(name), drives(name)")
        .not("status", "eq", "waitlisted"),
      supabase.from("duties").select("id, name"),
    ]);

    setStats({
      totalVolunteers: volRes.count || 0,
      totalDrives: driveRes.count || 0,
      totalAssignments: assignRes.data?.length || 0,
      completedAssignments:
        assignRes.data?.filter((a) => a.status === "completed").length || 0,
    });

    // Duty distribution
    const dutyCount: Record<string, number> = {};
    assignRes.data?.forEach((a) => {
      const name = (a.duties as any)?.name || "Unknown";
      dutyCount[name] = (dutyCount[name] || 0) + 1;
    });
    setDutyDistribution(
      Object.entries(dutyCount).map(([name, value]) => ({ name, value })),
    );

    // Per-drive volunteer count
    const driveCount: Record<string, { name: string; count: number }> = {};
    assignRes.data?.forEach((a) => {
      const driveName = (a.drives as any)?.name || a.drive_id;
      if (!driveCount[a.drive_id]) {
        driveCount[a.drive_id] = { name: driveName, count: 0 };
      }
      driveCount[a.drive_id].count++;
    });
    setDriveStats(
      Object.values(driveCount).map((d) => ({
        name: d.name,
        volunteers: d.count,
      })),
    );

    // Leaderboard
    const { data: topVolunteers } = await supabase
      .from("volunteers")
      .select("name, total_drives_attended")
      .gt("total_drives_attended", 0)
      .order("total_drives_attended", { ascending: false })
      .limit(10);

    setLeaderboard(
      topVolunteers?.map((v) => ({
        name: v.name,
        drives: v.total_drives_attended,
      })) || [],
    );

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="space-y-6 page-fade-in">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonChart />
          <SkeletonChart />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-md" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-fade-in">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="stagger-item">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Total Volunteers
              </span>
            </div>
            <p className="mt-1 text-3xl font-bold">{stats.totalVolunteers}</p>
          </CardContent>
        </Card>
        <Card className="stagger-item">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Total Drives
              </span>
            </div>
            <p className="mt-1 text-3xl font-bold">{stats.totalDrives}</p>
          </CardContent>
        </Card>
        <Card className="stagger-item">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-2">
              <Utensils className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Total Assignments
              </span>
            </div>
            <p className="mt-1 text-3xl font-bold">{stats.totalAssignments}</p>
          </CardContent>
        </Card>
        <Card className="stagger-item">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Completed</span>
            </div>
            <p className="mt-1 text-3xl font-bold">
              {stats.completedAssignments}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="stagger-item">
          <CardHeader>
            <CardTitle>Duty Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {dutyDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dutyDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) =>
                      `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                    }
                  >
                    {dutyDistribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No assignment data yet
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="stagger-item">
          <CardHeader>
            <CardTitle>Volunteers Per Drive</CardTitle>
          </CardHeader>
          <CardContent>
            {driveStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={driveStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="volunteers" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No drive data yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {leaderboard.length > 0 && (
        <Card className="stagger-item">
          <CardHeader>
            <CardTitle>Volunteer Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {leaderboard.map((v, i) => (
                <div
                  key={v.name}
                  className="stagger-item flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="font-medium">{v.name}</span>
                  </div>
                  <span className="font-bold">{v.drives} drives</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
