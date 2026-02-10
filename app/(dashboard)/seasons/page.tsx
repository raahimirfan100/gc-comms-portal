"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Loader2 } from "lucide-react";
import type { Tables } from "@/lib/supabase/types";
import {
  getRamadanData,
  formatEstimatedDate,
} from "@/lib/ramadan-dates";
import { DatePicker } from "@/components/ui/date-picker";
import { FormField } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/loading-state";

export default function SeasonsPage() {
  const supabase = createClient();
  const [seasons, setSeasons] = useState<Tables<"seasons">[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTarget, setEditTarget] = useState<Tables<"seasons"> | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Tables<"seasons"> | null>(
    null,
  );
  const [deleteInfo, setDeleteInfo] = useState<{
    driveCount: number;
    assignmentCount: number;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activateTarget, setActivateTarget] = useState<Tables<"seasons"> | null>(
    null,
  );
  const [activating, setActivating] = useState(false);

  // Create form controlled state
  const currentYear = new Date().getFullYear();
  const [createYear, setCreateYear] = useState(currentYear);
  const [createName, setCreateName] = useState(`Ramadan ${currentYear}`);
  const [createStartDate, setCreateStartDate] = useState("");
  const [createEndDate, setCreateEndDate] = useState("");
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false);

  // Edit form controlled state
  const [editName, setEditName] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");

  // Computed values
  const createRamadanInfo = getRamadanData(createYear);

  const editYear = editStartDate
    ? new Date(editStartDate + "T00:00:00").getFullYear()
    : currentYear;
  const editRamadanInfo = getRamadanData(editYear);

  useEffect(() => {
    loadSeasons();
  }, []);

  async function loadSeasons() {
    const { data } = await supabase
      .from("seasons")
      .select("*")
      .order("start_date", { ascending: false });
    if (data) setSeasons(data);
    setLoading(false);
  }

  function notifySeasonsUpdated() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("seasons-updated"));
    }
  }

  // --------------- Create form helpers ---------------

  function resetCreateForm() {
    const year = new Date().getFullYear();
    setCreateYear(year);
    setCreateName(`Ramadan ${year}`);
    setNameManuallyEdited(false);
    const data = getRamadanData(year);
    setCreateStartDate(data?.startDate ?? "");
    setCreateEndDate(data?.endDate ?? "");
  }

  function handleYearChange(year: number) {
    if (isNaN(year)) return;
    setCreateYear(year);
    if (!nameManuallyEdited) setCreateName(`Ramadan ${year}`);
    const data = getRamadanData(year);
    if (data?.startDate) setCreateStartDate(data.startDate);
    else setCreateStartDate("");
    if (data?.endDate) setCreateEndDate(data.endDate);
    else setCreateEndDate("");
  }

  async function handleCreateSeason(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from("seasons").insert({
      name: createName,
      hijri_year: createRamadanInfo?.hijriYear ?? null,
      start_date: createStartDate,
      end_date: createEndDate,
      is_active: seasons.length === 0,
    });

    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Season created");
      setDialogOpen(false);
      loadSeasons();
      notifySeasonsUpdated();
    }
  }

  // --------------- Edit form helpers ---------------

  function openEditDialog(season: Tables<"seasons">) {
    setEditTarget(season);
    setEditName(season.name);
    setEditStartDate(season.start_date);
    setEditEndDate(season.end_date);
  }

  async function handleEditSeason(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editTarget) return;
    setEditSaving(true);

    const ramadanInfo = getRamadanData(
      editStartDate
        ? new Date(editStartDate + "T00:00:00").getFullYear()
        : currentYear,
    );

    const { error } = await supabase
      .from("seasons")
      .update({
        name: editName,
        hijri_year: ramadanInfo?.hijriYear ?? editTarget.hijri_year,
        start_date: editStartDate,
        end_date: editEndDate,
      })
      .eq("id", editTarget.id);

    setEditSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Season updated");
      setEditTarget(null);
      loadSeasons();
      notifySeasonsUpdated();
    }
  }

  // --------------- Other actions ---------------

  async function activateSeason(season: Tables<"seasons">) {
    setActivating(true);

    // When activating, first deactivate all other seasons.
    const { error: clearError } = await supabase
      .from("seasons")
      .update({ is_active: false })
      .neq("id", season.id);

    if (clearError) {
      toast.error(clearError.message);
      setActivating(false);
      return;
    }

    const { error: activateError } = await supabase
      .from("seasons")
      .update({ is_active: true })
      .eq("id", season.id);

    setActivating(false);

    if (activateError) {
      toast.error(activateError.message);
      return;
    }

    toast.success(`${season.name} is now active`);
    setActivateTarget(null);
    loadSeasons();
    notifySeasonsUpdated();
  }

  async function toggleActive(
    season: Tables<"seasons">,
    nextActive: boolean,
  ) {
    // No-op if the state isn't changing.
    if (nextActive === season.is_active) return;

    if (nextActive) {
      setActivateTarget(season);
      return;
    }

    // Turning the current season inactive (no confirmation).
    const { error } = await supabase
      .from("seasons")
      .update({ is_active: false })
      .eq("id", season.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`${season.name} is now inactive`);
    loadSeasons();
    notifySeasonsUpdated();
  }

  async function confirmDeleteSeason(season: Tables<"seasons">) {
    setDeleteTarget(season);
    const { count: driveCount } = await supabase
      .from("drives")
      .select("*", { count: "exact", head: true })
      .eq("season_id", season.id);
    const { data: drives } = await supabase
      .from("drives")
      .select("id")
      .eq("season_id", season.id);
    let assignmentCount = 0;
    if (drives && drives.length > 0) {
      const driveIds = drives.map((d) => d.id);
      const { count } = await supabase
        .from("assignments")
        .select("*", { count: "exact", head: true })
        .in("drive_id", driveIds);
      assignmentCount = count || 0;
    }
    setDeleteInfo({ driveCount: driveCount || 0, assignmentCount });
  }

  async function deleteSeason() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from("seasons")
      .delete()
      .eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Season deleted");
      loadSeasons();
      notifySeasonsUpdated();
    }
    setDeleteTarget(null);
    setDeleteInfo(null);
  }

  // --------------- Render ---------------

  if (loading) {
    return (
      <LoadingState text="Loading seasons..." />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Seasons"
        description="Configure and manage Ramadan seasons."
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Seasons</CardTitle>
              <CardDescription>
                Each season scopes drives, volunteers, and analytics. Only one
                season can be active at a time.
              </CardDescription>
            </div>
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                if (open) resetCreateForm();
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Season
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreateSeason}>
                  <DialogHeader>
                    <DialogTitle>Create Season</DialogTitle>
                    <DialogDescription>
                      Add a new Ramadan season
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {/* Gregorian Year with Hijri adornment */}
                    <FormField
                      label="Gregorian Year"
                      htmlFor="create_year"
                      required
                    >
                      <div className="relative">
                        <Input
                          id="create_year"
                          type="number"
                          value={createYear}
                          onChange={(e) =>
                            handleYearChange(parseInt(e.target.value))
                          }
                          className="pr-20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          min={2020}
                          max={2099}
                          required
                        />
                        {createRamadanInfo && (
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            {createRamadanInfo.hijriYear} AH
                          </span>
                        )}
                      </div>
                    </FormField>

                    {/* Season Name */}
                    <FormField
                      label="Season Name"
                      htmlFor="create_name"
                      required
                    >
                      <Input
                        id="create_name"
                        value={createName}
                        onChange={(e) => {
                          setCreateName(e.target.value);
                          setNameManuallyEdited(true);
                        }}
                        placeholder="Ramadan 2026"
                        required
                      />
                    </FormField>

                    {/* Start & End Dates */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        label="Start Date"
                        description={
                          createRamadanInfo?.startDate
                            ? `Expected: ${formatEstimatedDate(
                                createRamadanInfo.startDate,
                              )}`
                            : undefined
                        }
                      >
                        <DatePicker
                          value={createStartDate}
                          onChange={setCreateStartDate}
                        />
                      </FormField>
                      <FormField
                        label="End Date"
                        description={
                          createRamadanInfo?.endDate
                            ? `Expected: ${formatEstimatedDate(
                                createRamadanInfo.endDate,
                              )}`
                            : undefined
                        }
                      >
                        <DatePicker
                          value={createEndDate}
                          onChange={setCreateEndDate}
                        />
                      </FormField>
                    </div>

                  </div>
                  <DialogFooter>
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
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Hijri Year</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {seasons.map((season) => (
                <TableRow key={season.id}>
                  <TableCell className="font-medium">{season.name}</TableCell>
                  <TableCell>
                    {season.hijri_year
                      ? `${season.hijri_year} AH`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {formatEstimatedDate(season.start_date)}
                  </TableCell>
                  <TableCell>
                    {formatEstimatedDate(season.end_date)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Switch
                        size="default"
                        checked={!!season.is_active}
                        onCheckedChange={(checked) =>
                          toggleActive(season, checked)
                        }
                        aria-label={
                          season.is_active
                            ? `Set ${season.name} inactive`
                            : `Set ${season.name} active`
                        }
                      />
                      <span className="text-sm text-muted-foreground">
                        {season.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(season)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => confirmDeleteSeason(season)}
                        disabled={season.is_active}
                        title={
                          season.is_active
                            ? "Cannot delete the active season"
                            : "Delete season"
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {seasons.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                  >
                    No seasons yet. Create one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Season Dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent>
          <form onSubmit={handleEditSeason}>
            <DialogHeader>
              <DialogTitle>Edit Season</DialogTitle>
              <DialogDescription>Update season details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Name */}
              <FormField label="Season Name" htmlFor="edit_name" required>
                <Input
                  id="edit_name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </FormField>

              {/* Hijri Year (informational) */}
              {editRamadanInfo && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Hijri Year:</span>
                  <Badge variant="secondary">
                    {editRamadanInfo.hijriYear} AH
                  </Badge>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Start Date"
                  description={
                    editRamadanInfo?.startDate
                      ? `Expected: ${formatEstimatedDate(
                          editRamadanInfo.startDate,
                        )}`
                      : undefined
                  }
                >
                  <DatePicker
                    value={editStartDate}
                    onChange={setEditStartDate}
                  />
                </FormField>
                <FormField
                  label="End Date"
                  description={
                    editRamadanInfo?.endDate
                      ? `Expected: ${formatEstimatedDate(
                          editRamadanInfo.endDate,
                        )}`
                      : undefined
                  }
                >
                  <DatePicker
                    value={editEndDate}
                    onChange={setEditEndDate}
                  />
                </FormField>
              </div>

            </div>
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setEditTarget(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editSaving}>
                {editSaving && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Activate Season Confirmation Dialog */}
      <Dialog
        open={!!activateTarget}
        onOpenChange={(open) => {
          if (!open) {
            setActivateTarget(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch active season</DialogTitle>
            <DialogDescription>
              Switch active season to{" "}
              <span className="font-semibold">{activateTarget?.name}</span>?
              <br />
              This will deactivate any other active season and all new drives
              will be associated with this season.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActivateTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => activateTarget && activateSeason(activateTarget)}
              disabled={activating}
            >
              {activating && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Season Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteInfo(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Season</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget?.name}</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          {deleteInfo && (
            <div className="space-y-2 text-sm">
              {deleteInfo.driveCount > 0 && (
                <p className="text-destructive">
                  {deleteInfo.driveCount} drive
                  {deleteInfo.driveCount !== 1 ? "s" : ""} will be permanently
                  deleted.
                </p>
              )}
              {deleteInfo.assignmentCount > 0 && (
                <p className="text-destructive">
                  {deleteInfo.assignmentCount} volunteer assignment
                  {deleteInfo.assignmentCount !== 1 ? "s" : ""} will be removed.
                </p>
              )}
              {deleteInfo.driveCount === 0 && (
                <p className="text-muted-foreground">
                  This season has no drives.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteInfo(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteSeason}
              disabled={deleting}
            >
              {deleting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete Season
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

