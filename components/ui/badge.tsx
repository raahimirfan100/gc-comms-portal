import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 to-green-500/15 text-emerald-800 dark:from-emerald-500/25 dark:to-green-500/25 dark:text-emerald-200 dark:border-emerald-400/50",
        warning:
          "border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-yellow-500/15 text-amber-800 dark:from-amber-500/25 dark:to-yellow-500/25 dark:text-amber-200 dark:border-amber-400/50",
        error:
          "border-red-500/40 bg-gradient-to-r from-red-500/15 to-rose-500/15 text-red-800 dark:from-red-500/25 dark:to-rose-500/25 dark:text-red-200 dark:border-red-400/50",
        info:
          "border-sky-500/40 bg-gradient-to-r from-sky-500/15 to-blue-500/15 text-sky-800 dark:from-sky-500/25 dark:to-blue-500/25 dark:text-sky-200 dark:border-sky-400/50",
        active:
          "border-sky-500/50 bg-gradient-to-r from-sky-500/20 to-blue-500/20 text-sky-800 dark:from-sky-500/30 dark:to-blue-500/30 dark:text-sky-200 dark:border-sky-400/60 badge-pulse",
        muted:
          "border-border bg-muted/80 text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
