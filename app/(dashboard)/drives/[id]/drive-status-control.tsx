"use client";

import { updateDrive } from "../actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const statuses = ["draft", "open", "in_progress", "completed", "cancelled"];

export function DriveStatusControl({
  driveId,
  currentStatus,
}: {
  driveId: string;
  currentStatus: string;
}) {
  async function handleChange(newStatus: string) {
    const formData = new FormData();
    formData.set("status", newStatus);
    const result = await updateDrive(driveId, formData);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
    }
  }

  return (
    <Select defaultValue={currentStatus} onValueChange={handleChange}>
      <SelectTrigger className="w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {statuses.map((s) => (
          <SelectItem key={s} value={s}>
            {s.replace("_", " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
