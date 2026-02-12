"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { getStatusColor, formatPhone } from "@/lib/utils";
import { AlertTriangle, Radio, Users } from "lucide-react";
import { SkeletonStatCard } from "@/components/ui/skeleton-chart";
import { Skeleton } from "@/components/ui/skeleton";

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

  if (loading) {
    return (
      <div className="space-y-6 page-fade-in">
        <div className="flex items-center gap-3">
          <Radio className="h-5 w-5 text-red-500 animate-pulse" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonStatCard key={i} variant="live" />
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
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
      <div className="flex items-center gap-3">
        <Radio className="h-5 w-5 text-red-500 animate-pulse" />
        <h1 className="text-2xl font-bold">Live Dashboard</h1>
      </div>

      {deficitAlert && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Volunteer Deficit Alert</AlertTitle>
          <AlertDescription>
            More than 20% of volunteers are unconfirmed or cancelled. Consider
            calling remaining volunteers or activating waitlist.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-5">
        {[
          { label: "Total", value: total, color: "bg-blue-500" },
          { label: "Confirmed", value: confirmed, color: "bg-green-500" },
          { label: "En Route", value: enRoute, color: "bg-yellow-500" },
          { label: "Arrived", value: arrived, color: "bg-emerald-500" },
          { label: "Cancelled", value: cancelled, color: "bg-red-500" },
        ].map((stat) => (
          <Card key={stat.label} className="stagger-item">
            <CardContent className="pt-6 text-center">
              <div
                className={`mx-auto mb-2 h-2 w-8 rounded-full ${stat.color}`}
              />
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="stagger-item">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            All Volunteers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {assignments.map((a) => (
              <div
                key={a.id}
                className="stagger-item flex items-center justify-between rounded-md border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">
                    {a.volunteers?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.duties?.name}
                  </p>
                </div>
                <Badge className={`ml-2 shrink-0 ${getStatusColor(a.status)}`}>
                  {a.status.replace("_", " ")}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
