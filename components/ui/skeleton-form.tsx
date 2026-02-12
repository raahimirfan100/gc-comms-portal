import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";

interface SkeletonFormFieldProps {
  className?: string;
  showLabel?: boolean;
}

export function SkeletonFormField({
  className,
  showLabel = true,
}: SkeletonFormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {showLabel && <Skeleton className="h-4 w-24" />}
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

interface SkeletonFormProps {
  fields?: number;
  className?: string;
}

export function SkeletonForm({ fields = 5, className }: SkeletonFormProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <SkeletonFormField key={i} />
      ))}
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  );
}
