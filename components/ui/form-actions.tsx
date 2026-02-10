import * as React from "react";

import { cn } from "@/lib/utils";

export interface FormActionsProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export function FormActions({ className, ...props }: FormActionsProps) {
  return (
    <div
      className={cn("flex gap-3 pt-2", className)}
      {...props}
    />
  );
}

