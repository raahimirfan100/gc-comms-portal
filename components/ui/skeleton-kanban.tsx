import { Skeleton } from "./skeleton";
import { Card, CardContent, CardHeader } from "./card";
import { ScrollArea } from "./scroll-area";

interface SkeletonKanbanColumnProps {
  className?: string;
}

export function SkeletonKanbanColumn({ className }: SkeletonKanbanColumnProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-md" />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
