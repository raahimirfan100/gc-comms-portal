"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
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
import { formatPhone, formatDate, getStatusBadgeVariant } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTable } from "@/components/ui/skeleton-table";

export default function VolunteerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const [volunteer, setVolunteer] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [commLogs, setCommLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [volRes, assignRes, commRes] = await Promise.all([
        supabase.from("volunteers").select("*").eq("id", id).single(),
        supabase
          .from("assignments")
          .select("*, drives(name, drive_date, status), duties(name)")
          .eq("volunteer_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("communication_log")
          .select("*, drives(name)")
          .eq("volunteer_id", id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      if (volRes.data) setVolunteer(volRes.data);
      if (assignRes.data) setAssignments(assignRes.data);
      if (commRes.data) setCommLogs(commRes.data);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6 page-fade-in">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
        <SkeletonTable rows={5} columns={4} />
      </div>
    );
  }

  if (!volunteer) {
    return (
      <div className="py-12 text-center page-fade-in">Volunteer not found</div>
    );
  }

  const dutyFrequency: Record<string, number> = {};
  assignments.forEach((a) => {
    const dutyName = a.duties?.name || "Unknown";
    dutyFrequency[dutyName] = (dutyFrequency[dutyName] || 0) + 1;
  });

  const completedCount = assignments.filter(
    (a) => a.status === "completed",
  ).length;
  const totalAssignments = assignments.length;
  const attendanceRate =
    totalAssignments > 0
      ? Math.round((completedCount / totalAssignments) * 100)
      : 0;

  return (
    <div className="space-y-6 page-fade-in">
      <div>
        <h1 className="text-2xl font-bold">{volunteer.name}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-muted-foreground">
          <span className="font-mono">{formatPhone(volunteer.phone)}</span>
          <Badge variant="outline">{volunteer.gender}</Badge>
          {volunteer.organization && <span>{volunteer.organization}</span>}
          <Badge variant="secondary">
            {volunteer.source.replace("_", " ")}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6 pb-6">
            <p className="text-sm text-muted-foreground">Total Drives</p>
            <p className="text-2xl font-bold">
              {volunteer.total_drives_attended}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 pb-6">
            <p className="text-sm text-muted-foreground">Assignments</p>
            <p className="text-2xl font-bold">{totalAssignments}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 pb-6">
            <p className="text-sm text-muted-foreground">Attendance Rate</p>
            <p className="text-2xl font-bold">{attendanceRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 pb-6">
            <p className="text-sm text-muted-foreground">Top Duty</p>
            <p className="text-2xl font-bold">
              {Object.entries(dutyFrequency).sort(
                (a, b) => b[1] - a[1],
              )[0]?.[0] || "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assignment History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Drive</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Duty</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a) => (
                <TableRow key={a.id} className="stagger-item">
                  <TableCell>{a.drives?.name}</TableCell>
                  <TableCell>{formatDate(a.drives?.drive_date)}</TableCell>
                  <TableCell>{a.duties?.name}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(a.status).variant}>
                      {a.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {assignments.length === 0 && (
                <TableRow className="empty-state">
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground py-12"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="empty-state-icon text-4xl">📝</div>
                      <p className="text-base font-medium">No assignments yet</p>
                      <p className="text-sm">This volunteer hasn't been assigned to any drives</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {commLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Communication Log</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commLogs.map((log) => (
                  <TableRow key={log.id} className="stagger-item">
                    <TableCell>
                      <Badge variant="outline">{log.channel}</Badge>
                    </TableCell>
                    <TableCell>{log.direction}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {log.content}
                    </TableCell>
                    <TableCell>
                      {log.sent_at
                        ? new Date(log.sent_at).toLocaleString("en-PK")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
