"use client";

import * as React from "react";
import { ClockIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/** Format "HH:mm" to "h:mm a" (e.g. "18:42" -> "6:42 PM") */
function formatTimeDisplay(value: string): string {
  if (!value) return "";
  const [h, m] = value.split(":").map(Number);
  if (h === undefined || isNaN(h)) return value;
  const hour = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  const min = m !== undefined && !isNaN(m) ? String(m).padStart(2, "0") : "00";
  return `${hour}:${min} ${ampm}`;
}

interface TimePickerProps {
  value: string; // HH:mm
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
}

export function TimePicker({
  value,
  onChange,
  id,
  placeholder = "Pick a time",
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            "h-9 w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <ClockIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          {value ? formatTimeDisplay(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <Input
          type="time"
          value={value}
          onChange={handleChange}
          className="[color-scheme:light]"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
