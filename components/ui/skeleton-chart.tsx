import { Skeleton } from "./skeleton";
import { Card, CardContent, CardHeader } from "./card";
import { cn } from "@/lib/utils";

interface SkeletonStatCardProps {
  className?: string;
  variant?: "analytics" | "live";
}

export function SkeletonStatCard({ className, variant }: SkeletonStatCardProps & { variant?: "analytics" | "live" }) {
  if (variant === "live") {
    return (
      <Card className={className}>
        <CardContent className="pt-6 text-center">
          <Skeleton className="mx-auto mb-2 h-2 w-8 rounded-full" />
          <Skeleton className="mx-auto h-8 w-12" />
          <Skeleton className="mx-auto mt-1 h-4 w-20" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={className}>
      <CardContent className="pt-6 pb-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="mt-1 h-9 w-20" />
      </CardContent>
    </Card>
  );
}

interface SkeletonChartProps {
  className?: string;
  height?: string;
}

export function SkeletonChart({
  className,
  height = "h-64",
}: SkeletonChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className={cn("w-full", height)} />
      </CardContent>
    </Card>
  );
}
