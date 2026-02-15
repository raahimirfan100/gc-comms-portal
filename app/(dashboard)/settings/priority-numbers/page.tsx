"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { SkeletonForm } from "@/components/ui/skeleton-form";
import { Skeleton } from "@/components/ui/skeleton";
import type { PriorityDutyEntry } from "@/lib/assignment/auto-assign";

type Duty = { id: string; name: string; slug: string };

function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, "").replace(/^0+/, "") || "";
}

const OVERFLOW_OPTIONS: { value: PriorityDutyEntry["overflow_behavior"]; label: string }[] = [
  { value: "allow_overflow", label: "Allow overflow (do nothing)" },
  { value: "unassign_one", label: "Unassign one volunteer and auto-reassign them" },
  { value: "reassign_to_duty", label: "Reassign displaced volunteer to a specific duty" },
];

export default function PriorityNumbersSettingsPage() {
  const supabase = createClient();
  const [entries, setEntries] = useState<PriorityDutyEntry[]>([]);
  const [duties, setDuties] = useState<Duty[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<PriorityDutyEntry> & { phone_input?: string }>({
    phone_input: "",
    name: "",
    duty_slug: "",
    overflow_behavior: "unassign_one",
    reassign_duty_slug: null,
  });

  useEffect(() => {
    async function load() {
      const [configRes, dutiesRes] = await Promise.all([
        supabase.from("app_config").select("value").eq("key", "priority_duty_entries").single(),
        supabase.from("duties").select("id, name, slug").order("display_order"),
      ]);
      if (configRes.data?.value) setEntries(configRes.data.value as PriorityDutyEntry[]);
      if (dutiesRes.data) setDuties(dutiesRes.data as Duty[]);
      setLoading(false);
    }
    load();
  }, [supabase]);

  function startAdd() {
    setEditingId(null);
    setShowForm(true);
    setForm({
      phone_input: "",
      name: "",
      duty_slug: duties[0]?.slug ?? "",
      overflow_behavior: "unassign_one",
      reassign_duty_slug: null,
    });
  }

  function startEdit(entry: PriorityDutyEntry) {
    setEditingId(entry.id);
    setShowForm(true);
    setForm({
      ...entry,
      phone_input: entry.phone_digits,
      reassign_duty_slug: entry.reassign_duty_slug ?? null,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setShowForm(false);
    setForm({ phone_input: "", name: "", duty_slug: "", overflow_behavior: "unassign_one", reassign_duty_slug: null });
  }

  function addOrUpdateEntry() {
    const digits = normalizePhoneDigits(form.phone_input ?? "");
    if (!digits) {
      toast.error("Enter a phone number");
      return;
    }
    if (!form.name?.trim()) {
      toast.error("Enter a name for internal tracking");
      return;
    }
    if (!form.duty_slug) {
      toast.error("Select a priority duty");
      return;
    }
    if (form.overflow_behavior === "reassign_to_duty" && !form.reassign_duty_slug) {
      toast.error("Select a duty to reassign the displaced volunteer to");
      return;
    }

    const newEntry: PriorityDutyEntry = {
      id: editingId ?? crypto.randomUUID(),
      phone_digits: digits,
      name: form.name.trim(),
      duty_slug: form.duty_slug,
      overflow_behavior: form.overflow_behavior ?? "unassign_one",
      reassign_duty_slug: form.overflow_behavior === "reassign_to_duty" ? form.reassign_duty_slug ?? null : null,
    };

    let next = entries;
    if (editingId) {
      next = entries.map((e) => (e.id === editingId ? newEntry : e));
    } else {
      if (entries.some((e) => e.phone_digits === digits || e.id === newEntry.id)) {
        toast.error("This phone number is already in the list");
        return;
      }
      next = [...entries, newEntry];
    }
    setEntries(next);
    setShowForm(false);
    setEditingId(null);
    setForm({ phone_input: "", name: "", duty_slug: "", overflow_behavior: "unassign_one", reassign_duty_slug: null });
  }

  function removeEntry(id: string) {
    setEntries(entries.filter((e) => e.id !== id));
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("app_config").upsert(
      {
        key: "priority_duty_entries",
        value: entries,
        description: "Priority phone numbers for duty assignment (Settings → Priority numbers)",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Priority numbers saved");
  }

  if (loading) {
    return (
      <div className="space-y-8 page-fade-in max-w-4xl">
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <SkeletonForm fields={5} />
      </div>
    );
  }

  return (
    <div className="space-y-8 page-fade-in max-w-4xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Priority numbers</h1>
        <p className="text-muted-foreground">
          When these numbers sign up, they are automatically prioritized for a chosen duty. Configure the duty, overflow behavior, and optional reassignment target.
        </p>
      </div>

      <Card className="stagger-item">
        <CardHeader>
          <CardTitle>Priority list</CardTitle>
          <CardDescription>
            Add phone numbers (digits only), a name for internal tracking, the duty they should get, and what to do when that duty is full. Use the same format as volunteers use when signing up (e.g. 10 digits without +92). Click &quot;Save changes&quot; at the bottom to persist.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {entries.length === 0 && !editingId && (
            <p className="text-sm text-muted-foreground">No priority numbers yet. Add one below.</p>
          )}

          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3"
            >
              <span className="font-mono text-sm">{entry.phone_digits}</span>
              <span className="text-muted-foreground">·</span>
              <span className="font-medium">{entry.name}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-sm">{duties.find((d) => d.slug === entry.duty_slug)?.name ?? entry.duty_slug}</span>
              <span className="text-xs text-muted-foreground">
                ({OVERFLOW_OPTIONS.find((o) => o.value === entry.overflow_behavior)?.label}
                {entry.overflow_behavior === "reassign_to_duty" && entry.reassign_duty_slug
                  ? ` → ${duties.find((d) => d.slug === entry.reassign_duty_slug)?.name ?? entry.reassign_duty_slug}`
                  : ""}
                )
              </span>
              <div className="ml-auto flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => startEdit(entry)} aria-label="Edit">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => removeEntry(entry.id)} aria-label="Remove">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}

          {showForm ? (
            <div className="rounded-lg border border-dashed bg-muted/20 p-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Phone (digits only)</Label>
                  <Input
                    placeholder="e.g. 3435301300"
                    value={form.phone_input ?? ""}
                    onChange={(e) => setForm({ ...form, phone_input: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Name (internal tracking)</Label>
                  <Input
                    placeholder="e.g. Lead daig"
                    value={form.name ?? ""}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Priority duty</Label>
                <Select
                  value={form.duty_slug ?? ""}
                  onValueChange={(v) => setForm({ ...form, duty_slug: v })}
                >
                  <SelectTrigger className="w-full sm:w-[240px]">
                    <SelectValue placeholder="Select duty" />
                  </SelectTrigger>
                  <SelectContent>
                    {duties.map((d) => (
                      <SelectItem key={d.id} value={d.slug}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>When duty is full</Label>
                <Select
                  value={form.overflow_behavior ?? "unassign_one"}
                  onValueChange={(v: PriorityDutyEntry["overflow_behavior"]) =>
                    setForm({ ...form, overflow_behavior: v, reassign_duty_slug: v === "reassign_to_duty" ? form.reassign_duty_slug : null })
                  }
                >
                  <SelectTrigger className="w-full sm:max-w-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OVERFLOW_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.overflow_behavior === "reassign_to_duty" && (
                <div className="space-y-2">
                  <Label>Reassign displaced volunteer to</Label>
                  <Select
                    value={form.reassign_duty_slug ?? ""}
                    onValueChange={(v) => setForm({ ...form, reassign_duty_slug: v || null })}
                  >
                    <SelectTrigger className="w-full sm:w-[240px]">
                      <SelectValue placeholder="Select duty" />
                    </SelectTrigger>
                    <SelectContent>
                      {duties
                        .filter((d) => d.slug !== form.duty_slug)
                        .map((d) => (
                          <SelectItem key={d.id} value={d.slug}>
                            {d.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={addOrUpdateEntry}>
                  {editingId ? "Update" : "Add"}
                </Button>
                <Button size="sm" variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={startAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add priority number
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="border-t border-border pt-6">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}
