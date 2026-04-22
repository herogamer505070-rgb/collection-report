import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton placeholder shown while the cases table is loading.
 * Renders the same number of rows as the active page size.
 */
export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="rounded-lg border">
      {/* Header row */}
      <div className="grid grid-cols-9 gap-3 border-b bg-muted/30 px-4 py-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-9 gap-3 border-b px-4 py-3 last:border-b-0"
        >
          {/* Customer cell (2 lines) */}
          <div className="col-span-2 space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          {Array.from({ length: 7 }).map((_, j) => (
            <Skeleton key={j} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}
