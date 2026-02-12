"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Loader2,
  Wand2,
  RefreshCw,
  Users,
  GripVertical,
  Settings,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getStatusColor } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonKanbanColumn } from "@/components/ui/skeleton-kanban";

type Assignment = {
  id: string;
  volunteer_id: string;
  drive_id: string;
  duty_id: string;
  status: string;
  is_manual_override: boolean;
  volunteers: { name: string; phone: string; gender: string } | null;
};

type DriveDuty = {
  id: string;
  duty_id: string;
  calculated_capacity: number;
  manual_capacity_override: number | null;
  current_assigned: number;
  duties: { name: string; slug: string; gender_restriction: string | null } | null;
};

function VolunteerCard({
  assignment,
  isDragging,
}: {
  assignment: Assignment;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: assignment.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border bg-card p-2 text-sm"
    >
      <button {...attributes} {...listeners} className="cursor-grab">
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="truncate font-medium">
          {assignment.volunteers?.name}
        </div>
        <div className="flex items-center gap-1">
          <Badge className={`text-[10px] px-1 py-0 ${getStatusColor(assignment.status)}`}>
            {assignment.status.replace("_", " ")}
          </Badge>
          {assignment.is_manual_override && (
            <Badge variant="outline" className="text-[10px] px-1 py-0">
              manual
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AssignmentsPage() {
  const { id: driveId } = useParams<{ id: string }>();
  const supabase = createClient();
  const [driveDuties, setDriveDuties] = useState<DriveDuty[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [capacityModalOpen, setCapacityModalOpen] = useState(false);
  const [capacityInputs, setCapacityInputs] = useState<Record<string, string>>({});
  const [savingCapacity, setSavingCapacity] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    loadData();

    // Realtime subscription
    const channel = supabase
      .channel("assignments-realtime")
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
    const [dutiesRes, assignRes] = await Promise.all([
      supabase
        .from("drive_duties")
        .select("*, duties(name, slug, gender_restriction)")
        .eq("drive_id", driveId)
        .order("created_at"),
      supabase
        .from("assignments")
        .select("*, volunteers(name, phone, gender)")
        .eq("drive_id", driveId)
        .order("created_at"),
    ]);

    if (dutiesRes.data) setDriveDuties(dutiesRes.data as unknown as DriveDuty[]);
    if (assignRes.data) setAssignments(assignRes.data as unknown as Assignment[]);
    setLoading(false);
  }

  async function handleAutoAssign() {
    setAssigning(true);
    const res = await fetch("/api/assignments/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driveId }),
    });
    const data = await res.json();
    setAssigning(false);

    if (data.error) {
      toast.error(data.error);
    } else {
      toast.success(`Assigned ${data.count} volunteers`);
      loadData();
    }
  }

  function openCapacityModal() {
    const inputs: Record<string, string> = {};
    driveDuties.forEach((dd) => {
      const capacity =
        dd.manual_capacity_override ?? dd.calculated_capacity ?? 0;
      inputs[dd.id] = String(capacity);
    });
    setCapacityInputs(inputs);
    setCapacityModalOpen(true);
  }

  async function handleSaveAllCapacities() {
    setSavingCapacity(true);
    const updates = driveDuties.map((dd) => {
      const inputValue = capacityInputs[dd.id]?.trim();
      const newValue =
        inputValue === "" || inputValue === String(dd.calculated_capacity)
          ? null
          : Math.max(0, Number(inputValue) || 0);
      return {
        id: dd.id,
        manual_capacity_override: newValue,
      };
    });

    // Batch update all capacities
    const promises = updates.map((update) =>
      supabase
        .from("drive_duties")
        .update({ manual_capacity_override: update.manual_capacity_override })
        .eq("id", update.id),
    );

    const results = await Promise.all(promises);
    const errors = results.filter((r) => r.error);

    setSavingCapacity(false);

    if (errors.length > 0) {
      toast.error(
        `Failed to update ${errors.length} capacity override(s). Please try again.`,
      );
      return;
    }

    const overrideCount = updates.filter(
      (u) => u.manual_capacity_override !== null,
    ).length;
    toast.success(
      overrideCount > 0
        ? `Updated ${overrideCount} duty capacity override(s).`
        : "All capacity overrides cleared (using system defaults).",
    );
    setCapacityModalOpen(false);
    setCapacityInputs({});
    loadData();
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const assignmentId = active.id as string;
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) return;

    // The over target is a duty column droppable area
    const targetDutyId = over.id as string;
    if (assignment.duty_id === targetDutyId) return;

    // Update assignment to new duty
    const { error } = await supabase
      .from("assignments")
      .update({
        duty_id: targetDutyId,
        is_manual_override: true,
        status: assignment.status === "waitlisted" ? "assigned" : assignment.status,
      })
      .eq("id", assignmentId);

    if (error) {
      toast.error("Failed to reassign: " + error.message);
    } else {
      toast.success("Volunteer reassigned");
      loadData();
    }
  }

  const waitlisted = assignments.filter((a) => a.status === "waitlisted");
  const activeAssignment = activeId
    ? assignments.find((a) => a.id === activeId)
    : null;

  if (loading) {
    return (
      <div className="space-y-4 page-fade-in">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonKanbanColumn key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 page-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Duty Board</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openCapacityModal} variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Edit Capacities
          </Button>
          <Button onClick={handleAutoAssign} disabled={assigning}>
            {assigning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Auto-Assign
          </Button>
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {driveDuties.map((dd) => {
            const dutyAssignments = assignments.filter(
              (a) =>
                a.duty_id === dd.duty_id && a.status !== "waitlisted",
            );
            const capacity =
              dd.manual_capacity_override ?? dd.calculated_capacity;
            const fillPct =
              capacity > 0
                ? Math.round((dutyAssignments.length / capacity) * 100)
                : 0;

            return (
              <Card key={dd.duty_id} id={dd.duty_id} className="stagger-item">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      {dd.duties?.name}
                      {dd.duties?.gender_restriction && (
                        <Badge
                          variant="outline"
                          className="ml-1 text-[10px]"
                        >
                          {dd.duties.gender_restriction}
                        </Badge>
                      )}
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">
                      {dutyAssignments.length}/{capacity}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full transition-all ${
                        fillPct >= 100 ? "bg-green-500" : "bg-primary"
                      }`}
                      style={{ width: `${Math.min(fillPct, 100)}%` }}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <SortableContext
                      items={dutyAssignments.map((a) => a.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-1.5">
                        {dutyAssignments.map((a) => (
                          <VolunteerCard
                            key={a.id}
                            assignment={a}
                            isDragging={activeId === a.id}
                          />
                        ))}
                        {dutyAssignments.length === 0 && (
                          <p className="text-center text-xs text-muted-foreground py-4">
                            No volunteers
                          </p>
                        )}
                      </div>
                    </SortableContext>
                  </ScrollArea>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <DragOverlay>
          {activeAssignment && (
            <div className="rounded-md border bg-card p-2 text-sm shadow-lg">
              <span className="font-medium">
                {activeAssignment.volunteers?.name}
              </span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <Dialog
        open={capacityModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCapacityModalOpen(false);
            setCapacityInputs({});
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="shrink-0 px-6 pr-10 pt-6 pb-2">
            <DialogTitle>Edit Duty Capacities</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto px-6 py-4 min-h-0 flex-1">
            <p className="text-sm text-muted-foreground">
              Adjust the maximum number of volunteers for each duty on this
              drive. Leave a field empty or set it to the system default to use
              the calculated capacity.
            </p>
            <div className="space-y-3">
              {driveDuties.map((dd) => {
                const currentCapacity =
                  dd.manual_capacity_override ?? dd.calculated_capacity;
                const inputValue = capacityInputs[dd.id] ?? String(currentCapacity);
                const isOverridden = dd.manual_capacity_override !== null;

                return (
                  <div key={dd.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor={`capacity_${dd.id}`}
                        className="text-sm font-medium"
                      >
                        {dd.duties?.name}
                        {dd.duties?.gender_restriction && (
                          <Badge
                            variant="outline"
                            className="ml-2 text-xs"
                          >
                            {dd.duties.gender_restriction}
                          </Badge>
                        )}
                      </label>
                      <span className="text-xs text-muted-foreground">
                        System default: {dd.calculated_capacity}
                        {isOverridden && (
                          <span className="ml-2 text-amber-400">
                            (overridden)
                          </span>
                        )}
                      </span>
                    </div>
                    <Input
                      id={`capacity_${dd.id}`}
                      type="number"
                      min={0}
                      value={inputValue}
                      onChange={(e) =>
                        setCapacityInputs({
                          ...capacityInputs,
                          [dd.id]: e.target.value,
                        })
                      }
                      placeholder={String(dd.calculated_capacity)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Currently assigned: {dd.current_assigned} volunteer
                      {dd.current_assigned !== 1 ? "s" : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter className="shrink-0 flex justify-between gap-2 px-6 pb-6 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const cleared: Record<string, string> = {};
                driveDuties.forEach((dd) => {
                  cleared[dd.id] = String(dd.calculated_capacity);
                });
                setCapacityInputs(cleared);
              }}
              disabled={savingCapacity}
            >
              Reset all to defaults
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCapacityModalOpen(false);
                  setCapacityInputs({});
                }}
                disabled={savingCapacity}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveAllCapacities}
                disabled={savingCapacity}
              >
                {savingCapacity && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save All
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {waitlisted.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Waitlist ({waitlisted.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-1.5 sm:grid-cols-2 md:grid-cols-3">
              {waitlisted.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 rounded-md border p-2 text-sm"
                >
                  <span className="font-medium">
                    {a.volunteers?.name}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    #{a.id.slice(0, 4)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
