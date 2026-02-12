"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

function deriveSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Settings2, Loader2, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Tables } from "@/lib/supabase/types";
import { DutyRulesModal } from "@/components/duties/duty-rules-modal";
import { DutyDescriptionEditor } from "@/components/duties/duty-description-editor";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";

export default function DutiesPage() {
  const supabase = createClient();
  const [duties, setDuties] = useState<Tables<"duties">[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDuty, setEditDuty] = useState<Tables<"duties"> | null>(null);
  const [rulesDuty, setRulesDuty] = useState<Tables<"duties"> | null>(null);
  const [deleteDuty, setDeleteDuty] = useState<Tables<"duties"> | null>(null);
  const [expandedDescriptionIds, setExpandedDescriptionIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function toggleDescriptionExpanded(id: string) {
    setExpandedDescriptionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }
  const [createDescription, setCreateDescription] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const createSlugRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDuties();
  }, []);

  useEffect(() => {
    if (editDuty) setEditDescription(editDuty.description ?? "");
  }, [editDuty]);

  async function loadDuties() {
    const { data } = await supabase
      .from("duties")
      .select("*")
      .order("display_order");
    if (data) setDuties(data);
    setLoading(false);
  }

  async function handleCreateDuty(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const slugRaw = (formData.get("slug") as string)?.trim() || "";
    const slug = slugRaw ? deriveSlug(slugRaw) : deriveSlug(name);
    const genderRestriction = formData.get("gender_restriction") as string;
    const displayOrder = parseInt(formData.get("display_order") as string, 10);

    const description = (formData.get("description") as string)?.trim() || null;
    const { error } = await supabase.from("duties").insert({
      name,
      slug,
      description,
      gender_restriction:
        genderRestriction === "none"
          ? null
          : (genderRestriction as "male" | "female"),
      display_order: Number.isNaN(displayOrder) ? duties.length + 1 : displayOrder,
    });

    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      // Also create default capacity rule
      const { data: newDuty } = await supabase
        .from("duties")
        .select("id")
        .eq("slug", slug)
        .single();
      if (newDuty) {
        await supabase.from("duty_capacity_rules").insert({
          duty_id: newDuty.id,
          capacity_mode: "linear" as const,
          base_count: 2,
          per_daig_count: 0.5,
        });
      }
      toast.success("Duty created");
      setDialogOpen(false);
      setCreateDescription("");
      loadDuties();
    }
  }

  async function toggleActive(duty: Tables<"duties">) {
    await supabase
      .from("duties")
      .update({ is_active: !duty.is_active })
      .eq("id", duty.id);
    toast.success(
      `${duty.name} ${duty.is_active ? "deactivated" : "activated"}`,
    );
    loadDuties();
  }

  async function handleDeleteDuty() {
    if (!deleteDuty) return;
    setSaving(true);
    const { error } = await supabase
      .from("duties")
      .delete()
      .eq("id", deleteDuty.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Duty "${deleteDuty.name}" deleted`);
      setDeleteDuty(null);
      loadDuties();
    }
  }

  async function handleUpdateDuty(e: React.FormEvent<HTMLFormElement>) {
    if (!editDuty) return;
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const slug = (formData.get("slug") as string).trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || editDuty.slug;
    const genderRestriction = formData.get("gender_restriction") as string;
    const displayOrder = parseInt(formData.get("display_order") as string, 10);

    const { error } = await supabase
      .from("duties")
      .update({
        name,
        slug,
        description: editDescription.trim() || null,
        gender_restriction:
          genderRestriction === "none"
            ? null
            : (genderRestriction as "male" | "female"),
        display_order: Number.isNaN(displayOrder) ? editDuty.display_order : displayOrder,
      })
      .eq("id", editDuty.id);

    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Duty updated");
      setEditDuty(null);
      loadDuties();
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 page-fade-in">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} variant="duty" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Duties</h1>
          <p className="text-muted-foreground">
            Manage duty types and their capacity rules
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setCreateDescription("");
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Duty
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] flex flex-col p-0 gap-0">
            <form onSubmit={handleCreateDuty} className="flex min-h-0 flex-col">
              <DialogHeader className="shrink-0 px-6 pr-10 pt-6 pb-2">
                <DialogTitle>Create Duty</DialogTitle>
                <DialogDescription>Add a new duty type</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 overflow-y-auto px-6 py-4 min-h-0 flex-1">
                <div className="space-y-2">
                  <Label htmlFor="duty-name">Name</Label>
                  <Input
                    id="duty-name"
                    name="name"
                    placeholder="e.g., Water Distribution"
                    required
                    onChange={(e) => {
                      const slug = deriveSlug(e.target.value);
                      if (createSlugRef.current) createSlugRef.current.value = slug;
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duty-slug">Slug</Label>
                  <Input
                    ref={createSlugRef}
                    id="duty-slug"
                    name="slug"
                    placeholder="Fills from name"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used in assignment priority (Settings → Assignment). Lowercase, hyphens only.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Gender Restriction</Label>
                  <Select name="gender_restriction" defaultValue="none">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Any Gender</SelectItem>
                      <SelectItem value="male">Male Only</SelectItem>
                      <SelectItem value="female">Female Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duty-display-order">Display Order</Label>
                  <Input
                    id="duty-display-order"
                    name="display_order"
                    type="number"
                    min={0}
                    defaultValue={duties.length + 1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower numbers appear first in lists.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <input type="hidden" name="description" value={createDescription} />
                  <DutyDescriptionEditor
                    value={createDescription}
                    onChange={setCreateDescription}
                  />
                </div>
              </div>
              <DialogFooter className="shrink-0 px-6 pb-6 pt-2">
                <Button type="submit" disabled={saving}>
                  {saving && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {duties.map((duty) => (
          <Card
            key={duty.id}
            className={cn(
              "stagger-item transition-colors",
              !duty.is_active && "opacity-60"
            )}
          >
            <CardContent className="flex flex-col gap-2.5 py-3.5 px-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-3">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-base">{duty.name}</span>
                  <span className="rounded bg-muted/70 px-2 py-0.5 font-mono text-xs text-muted-foreground">
                    {duty.slug}
                  </span>
                  {duty.gender_restriction && (
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-xs",
                        duty.gender_restriction === "male"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      )}
                    >
                      {duty.gender_restriction === "male" ? "M" : "F"}
                    </span>
                  )}
                </div>
                {duty.description?.trim() && (
                  <div className="space-y-1.5">
                    <div
                      className={cn(
                        "min-w-0",
                        !expandedDescriptionIds.includes(duty.id) && "line-clamp-2"
                      )}
                    >
                      <MarkdownRenderer
                        content={duty.description}
                        className="text-muted-foreground text-sm [&_p]:my-0 [&_ul]:my-0 [&_ol]:my-0 [&_li]:my-0"
                      />
                    </div>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-sm font-normal text-primary"
                      onClick={() => toggleDescriptionExpanded(duty.id)}
                    >
                      {expandedDescriptionIds.includes(duty.id)
                        ? "View less"
                        : "View more"}
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1 border-t pt-2.5 sm:border-t-0 sm:pt-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setEditDuty(duty)}
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setRulesDuty(duty)}
                  title="Capacity rules"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteDuty(duty)}
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Switch
                  size="sm"
                  checked={duty.is_active}
                  onCheckedChange={() => toggleActive(duty)}
                  className="ml-1 data-[state=checked]:bg-primary"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editDuty} onOpenChange={(open) => !open && setEditDuty(null)}>
        <DialogContent className="max-h-[90vh] flex flex-col p-0 gap-0">
          {editDuty && (
            <form onSubmit={handleUpdateDuty} className="flex min-h-0 flex-col">
              <DialogHeader className="shrink-0 px-6 pr-10 pt-6 pb-2">
                <DialogTitle>Edit Duty</DialogTitle>
                <DialogDescription>
                  Update name, slug, gender, and display order. Changing slug may require updating Settings → Assignment priority order.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 overflow-y-auto px-6 py-4 min-h-0 flex-1">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    defaultValue={editDuty.name}
                    placeholder="e.g., Water Distribution"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-slug">Slug</Label>
                  <Input
                    id="edit-slug"
                    name="slug"
                    defaultValue={editDuty.slug}
                    placeholder="e.g., water-distribution"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used in assignment priority (Settings → Assignment). Lowercase, hyphens only.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Gender Restriction</Label>
                  <Select
                    name="gender_restriction"
                    defaultValue={editDuty.gender_restriction ?? "none"}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Any Gender</SelectItem>
                      <SelectItem value="male">Male Only</SelectItem>
                      <SelectItem value="female">Female Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-display-order">Display Order</Label>
                  <Input
                    id="edit-display-order"
                    name="display_order"
                    type="number"
                    min={0}
                    defaultValue={editDuty.display_order}
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower numbers appear first in lists.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <DutyDescriptionEditor
                    value={editDescription}
                    onChange={setEditDescription}
                  />
                </div>
              </div>
              <DialogFooter className="shrink-0 px-6 pb-6 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDuty(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <DutyRulesModal
        dutyId={rulesDuty?.id ?? null}
        dutyName={rulesDuty?.name ?? null}
        open={!!rulesDuty}
        onClose={() => setRulesDuty(null)}
      />

      <Dialog open={!!deleteDuty} onOpenChange={(open) => !open && setDeleteDuty(null)}>
        <DialogContent className="max-h-[90vh] flex flex-col p-0 gap-0">
          {deleteDuty && (
            <>
              <DialogHeader className="shrink-0 px-6 pr-10 pt-6 pb-2">
                <DialogTitle>Delete duty</DialogTitle>
                <DialogDescription>
                  Delete &quot;{deleteDuty.name}&quot;? This will remove this duty from all drives and assignments. This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="shrink-0 px-6 pb-6 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteDuty(null)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteDuty}
                  disabled={saving}
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
