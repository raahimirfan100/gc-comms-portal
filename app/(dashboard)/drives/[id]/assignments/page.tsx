"use client";

import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import {
  Loader2,
  Wand2,
  RefreshCw,
  Users,
  GripVertical,
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Duty Board</h1>
        <div className="flex gap-2">
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
              <Card key={dd.duty_id} id={dd.duty_id}>
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
