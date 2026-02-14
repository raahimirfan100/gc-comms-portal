"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Loader2,
  Wifi,
  WifiOff,
  QrCode,
  RefreshCw,
  Unplug,
  Plus,
  Trash2,
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  Server,
} from "lucide-react";
import { SkeletonForm } from "@/components/ui/skeleton-form";
import { Skeleton } from "@/components/ui/skeleton";
import QRCode from "qrcode";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScheduledMessage {
  id: string;
  drive_id: string | null;
  volunteer_id: string | null;
  group_jid: string | null;
  channel: string;
  message: string;
  scheduled_at: string;
  sent_at: string | null;
  status: string;
  created_at: string;
  drives?: { name: string } | null;
  volunteers?: { name: string; phone: string } | null;
}

interface Drive {
  id: string;
  name: string;
  drive_date: string;
}

interface Volunteer {
  id: string;
  name: string;
  phone: string;
}

// ─── QR Image Component ─────────────────────────────────────────────────────

function QrImage({ data }: { data: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && data) {
      QRCode.toCanvas(canvasRef.current, data, {
        width: 280,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
    }
  }, [data]);

  return (
    <div className="mt-4 flex justify-center rounded-lg border bg-white p-6">
      <canvas ref={canvasRef} />
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function WhatsAppSettingsPage() {
  const supabase = createClient();
  const [config, setConfig] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [serviceHealth, setServiceHealth] = useState<{
    status: string;
    uptime: number;
  } | null>(null);

  // Test message state
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Hello! This is a test message from GC Comms Portal.");
  const [sendingTest, setSendingTest] = useState(false);

  // Scheduled messages state
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [drives, setDrives] = useState<Drive[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newMessage, setNewMessage] = useState({
    drive_id: "",
    target: "group" as "group" | "volunteer" | "all_assigned",
    volunteer_id: "",
    message: "",
    scheduled_at: "",
  });

  // ─── Data Loading ────────────────────────────────────────────────────────

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/session");
      if (res.ok) {
        const data = await res.json();
        setSession(data);
        // Clear connecting spinner once we get a real status
        if (data.status === "qr_pending" || data.status === "connected") {
          setConnecting(false);
        }
      }
    } catch {
      setSession({ status: "disconnected" });
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      await Promise.all([
        loadConfig(),
        loadSession(),
        loadServiceHealth(),
        loadScheduledMessages(),
        loadDrives(),
        loadVolunteers(),
      ]);
      setLoading(false);
    }
    loadData();

    // Poll for session updates every 3 seconds when waiting for QR or connecting
    const interval = setInterval(() => loadSession(), 3000);

    return () => clearInterval(interval);
  }, []);

  async function loadConfig() {
    const { data } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "whatsapp")
      .single();
    if (data?.value) setConfig(data.value);
  }

  async function loadServiceHealth() {
    try {
      const res = await fetch("/api/whatsapp/status");
      if (res.ok) {
        const data = await res.json();
        setServiceHealth(data);
      }
    } catch {
      setServiceHealth(null);
    }
  }

  async function loadScheduledMessages() {
    const { data, error } = await supabase
      .from("scheduled_messages")
      .select("*, drives(name), volunteers(name, phone)")
      .in("status", ["pending", "sent"])
      .order("scheduled_at", { ascending: true })
      .limit(50);
    if (!error && data) setScheduledMessages(data as ScheduledMessage[]);
  }

  async function loadDrives() {
    const { data } = await supabase
      .from("drives")
      .select("id, name, drive_date")
      .in("status", ["draft", "open", "in_progress"])
      .order("drive_date", { ascending: true });
    if (data) setDrives(data);
  }

  async function loadVolunteers() {
    const { data } = await supabase
      .from("volunteers")
      .select("id, name, phone")
      .order("name")
      .limit(200);
    if (data) setVolunteers(data);
  }

  // ─── Connection Actions ──────────────────────────────────────────────────

  async function handleConnect() {
    setConnecting(true);
    try {
      const res = await fetch("/api/whatsapp/connect", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.info("Connecting... QR code will appear shortly.");
        // Keep connecting=true — it will be cleared when session updates
        // to qr_pending or connected via polling
      } else {
        toast.error(data.error || "Failed to connect");
        setConnecting(false);
      }
    } catch {
      toast.error("Failed to reach the server");
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/whatsapp/disconnect", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Disconnected and session cleared");
        setSession({ ...session, status: "disconnected", qr_code: null });
      } else {
        toast.error(data.error || "Failed to disconnect");
      }
    } catch {
      toast.error("Failed to reach the server");
    } finally {
      setDisconnecting(false);
    }
  }

  // ─── Test Message ─────────────────────────────────────────────────────────

  async function handleSendTest() {
    if (!testPhone || !testMessage) {
      toast.error("Phone number and message are required");
      return;
    }
    setSendingTest(true);
    toast.info("Sending... this may take a few seconds");
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone, message: testMessage }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Test message sent!");
      } else {
        toast.error(data.error || "Failed to send");
      }
    } catch {
      toast.error("Failed to reach the server");
    } finally {
      setSendingTest(false);
    }
  }

  // ─── Settings Save ───────────────────────────────────────────────────────

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("app_config")
      .update({ value: config })
      .eq("key", "whatsapp");
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Settings saved");
  }

  // ─── Scheduled Messages ──────────────────────────────────────────────────

  async function createScheduledMessage() {
    if (!newMessage.message || !newMessage.scheduled_at) {
      toast.error("Message and scheduled time are required");
      return;
    }

    const groupJid = config?.volunteer_group_jid || null;

    if (newMessage.target === "group" && !groupJid) {
      toast.error("No volunteer group JID configured");
      return;
    }

    if (newMessage.target === "volunteer" && !newMessage.volunteer_id) {
      toast.error("Select a volunteer");
      return;
    }

    setIsCreating(true);

    if (newMessage.target === "all_assigned" && newMessage.drive_id) {
      // Create one message per assigned volunteer for the drive
      const { data: assignments } = await supabase
        .from("assignments")
        .select("volunteer_id")
        .eq("drive_id", newMessage.drive_id)
        .in("status", ["assigned", "confirmed"]);

      if (!assignments || assignments.length === 0) {
        toast.error("No assigned volunteers found for this drive");
        setIsCreating(false);
        return;
      }

      const rows = assignments.map((a) => ({
        drive_id: newMessage.drive_id || null,
        volunteer_id: a.volunteer_id,
        channel: "whatsapp",
        message: newMessage.message,
        scheduled_at: newMessage.scheduled_at,
        status: "pending",
      }));

      const { error } = await supabase.from("scheduled_messages").insert(rows);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(`Scheduled ${rows.length} messages`);
      }
    } else {
      const row = {
        drive_id: newMessage.drive_id || null,
        volunteer_id: newMessage.target === "volunteer" ? newMessage.volunteer_id : null,
        group_jid: newMessage.target === "group" ? groupJid : null,
        channel: "whatsapp",
        message: newMessage.message,
        scheduled_at: newMessage.scheduled_at,
        status: "pending",
      };

      const { error } = await supabase.from("scheduled_messages").insert(row);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Message scheduled");
      }
    }

    setIsCreating(false);
    setNewMessage({ drive_id: "", target: "group", volunteer_id: "", message: "", scheduled_at: "" });
    loadScheduledMessages();
  }

  async function cancelScheduledMessage(id: string) {
    const { error } = await supabase
      .from("scheduled_messages")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Message cancelled");
      loadScheduledMessages();
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-8 page-fade-in max-w-4xl">
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <SkeletonForm fields={5} />
      </div>
    );
  }

  return (
    <div className="space-y-8 page-fade-in max-w-4xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">WhatsApp Settings</h1>
        <p className="text-muted-foreground">
          Manage WhatsApp connection, messaging, and scheduled reminders
        </p>
      </div>

      {/* ── Service Health ─────────────────────────────────────────────── */}
      {serviceHealth && (
        <Card className="stagger-item">
          <CardContent className="flex items-center gap-4 pt-6">
            <Server className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Railway Service</p>
              <p className="text-xs text-muted-foreground">
                Uptime: {Math.floor(serviceHealth.uptime / 60)}m{" "}
                {Math.floor(serviceHealth.uptime % 60)}s
              </p>
            </div>
            <Badge variant={serviceHealth.status === "ok" ? "success" : "destructive"}>
              {serviceHealth.status === "ok" ? "Online" : "Error"}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* ── Connection Status ──────────────────────────────────────────── */}
      <Card className="stagger-item">
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
          <CardDescription>
            Link your WhatsApp account by scanning the QR code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {session?.status === "connected" ? (
              <>
                <Wifi className="h-6 w-6 text-green-500" />
                <div className="flex-1">
                  <Badge variant="success">Connected</Badge>
                  {session.phone_number && (
                    <p className="text-sm text-muted-foreground mt-1">
                      +{session.phone_number}
                    </p>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                >
                  {disconnecting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Unplug className="mr-2 h-4 w-4" />
                  )}
                  Disconnect
                </Button>
              </>
            ) : session?.status === "qr_pending" ? (
              <div className="w-full">
                <div className="flex items-center gap-4 mb-2">
                  <QrCode className="h-6 w-6 text-yellow-500" />
                  <div className="flex-1">
                    <Badge variant="warning">Waiting for Scan</Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      Open WhatsApp &gt; Linked Devices &gt; Link a Device
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleConnect}
                    disabled={connecting}
                  >
                    {connecting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Refresh QR
                  </Button>
                </div>
                {session.qr_code && <QrImage data={session.qr_code} />}
              </div>
            ) : connecting ? (
              <div className="w-full">
                <div className="flex items-center gap-4">
                  <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                  <div className="flex-1">
                    <Badge variant="secondary">Connecting...</Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      Generating QR code, please wait...
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex justify-center rounded-lg border border-dashed p-8">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Loader2 className="h-10 w-10 animate-spin" />
                    <p className="text-sm">Preparing WhatsApp session...</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <WifiOff className="h-6 w-6 text-red-500" />
                <div className="flex-1">
                  <Badge variant="destructive">Disconnected</Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click Connect to generate a QR code
                  </p>
                </div>
                <Button onClick={handleConnect} disabled={connecting}>
                  <Wifi className="mr-2 h-4 w-4" />
                  Connect
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Test Message ─────────────────────────────────────────────── */}
      {session?.status === "connected" && (
        <Card className="stagger-item">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Test Message
            </CardTitle>
            <CardDescription>
              Send a quick message to verify the connection is working
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  placeholder="+923001234567"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Input
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={handleSendTest}
              disabled={sendingTest}
              size="sm"
            >
              {sendingTest ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Test
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Scheduled Messages ─────────────────────────────────────────── */}
      <Card className="stagger-item">
        <CardHeader>
          <CardTitle>Scheduled Messages</CardTitle>
          <CardDescription>
            Schedule WhatsApp messages to volunteers or groups
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* New message form */}
          <div className="rounded-lg border p-4 space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Scheduled Message
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Drive (optional)</Label>
                <Select
                  value={newMessage.drive_id}
                  onValueChange={(v) =>
                    setNewMessage({ ...newMessage, drive_id: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a drive" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No drive</SelectItem>
                    {drives.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} ({d.drive_date})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Send to</Label>
                <Select
                  value={newMessage.target}
                  onValueChange={(v: "group" | "volunteer" | "all_assigned") =>
                    setNewMessage({ ...newMessage, target: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group">Volunteer Group</SelectItem>
                    <SelectItem value="volunteer">Specific Volunteer</SelectItem>
                    <SelectItem value="all_assigned">
                      All Assigned (Drive)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newMessage.target === "volunteer" && (
              <div className="space-y-2">
                <Label>Volunteer</Label>
                <Select
                  value={newMessage.volunteer_id}
                  onValueChange={(v) =>
                    setNewMessage({ ...newMessage, volunteer_id: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a volunteer" />
                  </SelectTrigger>
                  <SelectContent>
                    {volunteers.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} ({v.phone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="Type your message... Use {name}, {duty}, {drive_name} for templates"
                value={newMessage.message}
                onChange={(e) =>
                  setNewMessage({ ...newMessage, message: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label>Scheduled Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={newMessage.scheduled_at}
                  onChange={(e) =>
                    setNewMessage({ ...newMessage, scheduled_at: e.target.value })
                  }
                />
              </div>
              <Button onClick={createScheduledMessage} disabled={isCreating}>
                {isCreating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Clock className="mr-2 h-4 w-4" />
                )}
                Schedule
              </Button>
            </div>
          </div>

          {/* Messages table */}
          {scheduledMessages.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Target</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduledMessages.map((msg) => (
                    <TableRow key={msg.id}>
                      <TableCell className="text-sm">
                        {msg.group_jid ? (
                          <span className="text-muted-foreground">Group</span>
                        ) : msg.volunteers ? (
                          <span>{msg.volunteers.name}</span>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                        {msg.drives && (
                          <p className="text-xs text-muted-foreground">
                            {msg.drives.name}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">
                        {msg.message}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(msg.scheduled_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {msg.status === "pending" ? (
                          <Badge variant="warning" className="gap-1">
                            <Clock className="h-3 w-3" />
                            Pending
                          </Badge>
                        ) : msg.status === "sent" ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Sent
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            {msg.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {msg.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => cancelScheduledMessage(msg.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              No scheduled messages yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── WhatsApp Config ────────────────────────────────────────────── */}
      {config && (
        <>
          <Card className="stagger-item">
            <CardContent className="flex items-center justify-between pt-6">
              <div>
                <Label className="text-base">Enable WhatsApp</Label>
                <p className="text-sm text-muted-foreground">
                  Send messages via WhatsApp
                </p>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={(v) => setConfig({ ...config, enabled: v })}
              />
            </CardContent>
          </Card>

          <Card className="stagger-item">
            <CardHeader>
              <CardTitle>Rate Limiting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Messages per second</Label>
                  <Input
                    type="number"
                    value={config.rate_limit_per_second}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        rate_limit_per_second: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Burst limit</Label>
                  <Input
                    type="number"
                    value={config.rate_limit_burst}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        rate_limit_burst: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stagger-item">
            <CardHeader>
              <CardTitle>Keyword Detection</CardTitle>
              <CardDescription>
                Keywords that trigger confirm/cancel actions (comma-separated)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Confirm Keywords</Label>
                <Input
                  value={config.confirm_keywords?.join(", ")}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      confirm_keywords: e.target.value
                        .split(",")
                        .map((s: string) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Cancel Keywords</Label>
                <Input
                  value={config.cancel_keywords?.join(", ")}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      cancel_keywords: e.target.value
                        .split(",")
                        .map((s: string) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <div className="border-t border-border pt-6">
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
