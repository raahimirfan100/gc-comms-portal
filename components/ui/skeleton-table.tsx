import { Skeleton } from "./skeleton";
import { Table, TableBody, TableCell, TableRow } from "./table";
import { cn } from "@/lib/utils";

interface SkeletonTableRowProps {
  columns?: number;
  className?: string;
}

export function SkeletonTableRow({
  columns = 4,
  className,
}: SkeletonTableRowProps) {
  return (
    <TableRow className={className}>
      {Array.from({ length: columns }).map((_, i) => (
        <TableCell key={i}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className,
}: SkeletonTableProps) {
  return (
    <Table className={className}>
      <TableBody>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonTableRow key={i} columns={columns} />
        ))}
      </TableBody>
    </Table>
  );
}
