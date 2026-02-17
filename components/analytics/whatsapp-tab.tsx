"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UserPlus,
  Bell,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { useCountUp } from "@/lib/hooks/use-count-up";
import { AreaMinimal } from "@/components/analytics/area-minimal";
import { DonutWithCenter, type DonutItem } from "@/components/analytics/donut-with-center";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface CommLogRow {
  id: string;
  volunteer_id: string;
  drive_id: string | null;
  direction: string;
  content: string;
  sent_at: string;
  volunteers?: { name: string; phone: string }[] | { name: string; phone: string } | null;
}

interface VolunteerRow {
  id: string;
  name: string;
  phone: string;
  created_at: string;
}

export function WhatsAppAnalyticsTab({ driveIds }: { driveIds: string[] }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    messagesSent: 0,
    messagesReceived: 0,
    recentSignups: 0,
    autoReminders: 0,
  });
  const [directionBreakdown, setDirectionBreakdown] = useState<DonutItem[]>([]);
  const [messagesOverTime, setMessagesOverTime] = useState<
    Array<{ date: string; volunteers: number }>
  >([]);
  const [recentSignups, setRecentSignups] = useState<VolunteerRow[]>([]);
  const [recentMessages, setRecentMessages] = useState<CommLogRow[]>([]);

  const countSent = useCountUp(stats.messagesSent);
  const countReceived = useCountUp(stats.messagesReceived);
  const countSignups = useCountUp(stats.recentSignups);
  const countReminders = useCountUp(stats.autoReminders);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    // Fetch communication logs for WhatsApp channel
    const logQuery = supabase
      .from("communication_log")
      .select("id, volunteer_id, drive_id, direction, content, sent_at, volunteers(name, phone)")
      .eq("channel", "whatsapp")
      .order("sent_at", { ascending: false });

    // Only filter by drive_ids if we have them
    if (driveIds.length > 0) {
      // Include messages with null drive_id (like welcome DMs) + drive-specific messages
    }

    const [logRes, signupRes] = await Promise.all([
      logQuery.limit(500),
      supabase
        .from("volunteers")
        .select("id, name, phone, created_at")
        .eq("source", "in_app_form")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const logs = (logRes.data ?? []) as CommLogRow[];
    const signups = (signupRes.data ?? []) as VolunteerRow[];

    // Calculate stats
    const sent = logs.filter((l) => l.direction === "outbound").length;
    const received = logs.filter((l) => l.direction === "inbound").length;
    const autoReminders = logs.filter(
      (l) => l.direction === "outbound" && l.content?.startsWith("[auto-reminder]"),
    ).length;

    setStats({
      messagesSent: sent,
      messagesReceived: received,
      recentSignups: signups.length,
      autoReminders: autoReminders,
    });

    // Direction breakdown for donut
    setDirectionBreakdown([
      { name: "Sent", value: sent },
      { name: "Received", value: received },
    ]);

    // Messages over time (group by date)
    const byDate: Record<string, number> = {};
    logs.forEach((l) => {
      if (!l.sent_at) return;
      const date = l.sent_at.split("T")[0];
      byDate[date] = (byDate[date] || 0) + 1;
    });
    const timeData = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date: new Date(date + "T00:00:00").toLocaleDateString("en-AU", {
          month: "short",
          day: "numeric",
        }),
        volunteers: count,
      }));
    setMessagesOverTime(timeData);

    // Recent data for tables
    setRecentSignups(signups.slice(0, 20));
    setRecentMessages(logs.slice(0, 20));

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 grid-flow-dense auto-rows-[minmax(0,auto)]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border bg-card p-2.5 col-span-1 flex flex-col justify-center"
          >
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="mt-1.5 h-6 w-10" />
          </div>
        ))}
        <Card className="col-span-2 md:col-span-4">
          <CardContent className="p-2 pt-2">
            <Skeleton className="h-44 w-full rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const head = "px-3 py-2 border-b border-border/50 shrink-0";
  const title = "text-sm font-medium text-foreground";
  const cell = "p-3";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 grid-flow-dense auto-rows-[minmax(0,auto)]">
      {/* KPI Cards */}
      <div
        className="rounded-xl border bg-card col-span-1 flex items-center gap-3 p-3"
        role="listitem"
        aria-label={`Messages sent: ${countSent}`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ArrowUpRight className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Sent
          </p>
          <p className="text-lg font-semibold tabular-nums leading-tight">
            {countSent}
          </p>
        </div>
      </div>

      <div
        className="rounded-xl border bg-card col-span-1 flex items-center gap-3 p-3"
        role="listitem"
        aria-label={`Messages received: ${countReceived}`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-[hsl(var(--chart-2))]">
          <ArrowDownLeft className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Received
          </p>
          <p className="text-lg font-semibold tabular-nums leading-tight">
            {countReceived}
          </p>
        </div>
      </div>

      <div
        className="rounded-xl border bg-card col-span-1 flex items-center gap-3 p-3"
        role="listitem"
        aria-label={`Signups: ${countSignups}`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-[hsl(var(--chart-1))]">
          <UserPlus className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Signups
          </p>
          <p className="text-lg font-semibold tabular-nums leading-tight">
            {countSignups}
          </p>
        </div>
      </div>

      <div
        className="rounded-xl border bg-card col-span-1 flex items-center gap-3 p-3"
        role="listitem"
        aria-label={`Auto reminders: ${countReminders}`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-[hsl(var(--chart-4))]">
          <Bell className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Auto Reminders
          </p>
          <p className="text-lg font-semibold tabular-nums leading-tight">
            {countReminders}
          </p>
        </div>
      </div>

      {/* Direction donut */}
      <Card className="col-span-2 flex flex-col overflow-hidden">
        <div className={head}>
          <p className={title}>Message direction</p>
        </div>
        <CardContent className={`pt-2 ${cell} flex-1 min-h-0`}>
          {directionBreakdown.some((d) => d.value > 0) ? (
            <DonutWithCenter
              data={directionBreakdown}
              centerLabel="Total"
              valueFormatter={(v) => String(v)}
              colors={CHART_COLORS}
              height={180}
            />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No messages yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Messages over time */}
      <Card className="col-span-2 flex flex-col overflow-hidden">
        <div className={head}>
          <p className={title}>Messages over time</p>
        </div>
        <CardContent className={`pt-2 ${cell}`}>
          {messagesOverTime.length > 0 ? (
            <AreaMinimal
              data={messagesOverTime}
              height={180}
              dataKey="volunteers"
              color="hsl(var(--chart-2))"
            />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No data
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent registrations table */}
      <Card className="col-span-2 md:col-span-4 flex flex-col overflow-hidden">
        <div className={head}>
          <p className={title}>Recent registrations</p>
        </div>
        <CardContent className={`${cell} p-0`}>
          {recentSignups.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Registered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSignups.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="text-sm font-medium">
                        {v.name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {v.phone}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(v.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No sign-ups via the in-app form yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent communication log */}
      <Card className="col-span-2 md:col-span-4 flex flex-col overflow-hidden">
        <div className={head}>
          <p className={title}>Recent WhatsApp messages</p>
        </div>
        <CardContent className={`${cell} p-0`}>
          {recentMessages.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Volunteer</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentMessages.map((msg) => (
                    <TableRow key={msg.id}>
                      <TableCell className="text-sm font-medium">
                        {(msg.volunteers as any)?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            msg.direction === "outbound"
                              ? "default"
                              : "secondary"
                          }
                          className="gap-1"
                        >
                          {msg.direction === "outbound" ? (
                            <ArrowUpRight className="h-3 w-3" />
                          ) : (
                            <ArrowDownLeft className="h-3 w-3" />
                          )}
                          {msg.direction === "outbound" ? "Sent" : "Received"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                        {msg.content}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {msg.sent_at
                          ? new Date(msg.sent_at).toLocaleString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No WhatsApp messages logged yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
