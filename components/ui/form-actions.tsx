import * as React from "react";

import { cn } from "@/lib/utils";

export interface FormActionsProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export function FormActions({ className, ...props }: FormActionsProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 pt-2 sm:gap-3",
        className,
      )}
      {...props}
    />
  );
}

