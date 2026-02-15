import { Skeleton } from "./skeleton";
import { Card, CardContent } from "./card";
import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  className?: string;
  showImage?: boolean;
  variant?: "drive" | "duty" | "default";
}

export function SkeletonCard({
  className,
  showImage = false,
  variant = "default",
}: SkeletonCardProps) {
  if (variant === "drive") {
    return (
      <Card className={cn("overflow-hidden rounded-2xl", className)}>
        <CardContent className="p-0">
          {/* Map placeholder */}
          <div className="border-b border-border">
            <Skeleton className="h-28 w-full rounded-t-2xl" />
          </div>
          <div className="space-y-2 p-3">
            {/* Title and badge row */}
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 flex-1">
                <Skeleton className="h-5 w-3/4" />
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-5 w-16 rounded-full shrink-0" />
            </div>
            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            {/* Progress bar */}
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "duty") {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col gap-2.5 py-3.5 px-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-20 rounded" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="flex shrink-0 items-center gap-1 border-t pt-2.5 sm:border-t-0 sm:pt-0">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-5 w-10 rounded-full ml-1" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <Card className={cn("overflow-hidden", className)}>
      {showImage && (
        <div className="aspect-video w-full">
          <Skeleton className="h-full w-full rounded-none" />
        </div>
      )}
      <CardContent className="space-y-2 p-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  );
}
