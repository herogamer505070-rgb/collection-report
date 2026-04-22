"use client";

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, Inbox } from "lucide-react";
import { casesColumns } from "./columns";
import { TableSkeleton } from "./table-skeleton";
import { useCasesQuery } from "@/hooks/use-cases-query";
import { useCasesFilterState } from "./toolbar";
import { formatNumber } from "@/lib/format/currency";

export function CasesTable() {
  const { filter, setPage } = useCasesFilterState();
  const { data, isLoading, isFetching, isError } = useCasesQuery(filter);
  const [sorting, setSorting] = useState<SortingState>([]);

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const page = data?.page ?? 1;
  const pageSize = data?.pageSize ?? 25;
  const totalPages = Math.ceil(total / pageSize);

  const table = useReactTable({
    data: rows,
    columns: casesColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
    manualPagination: true,
    manualSorting: true,
    pageCount: totalPages,
  });

  if (isLoading) return <TableSkeleton rows={pageSize} />;

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center text-sm text-destructive">
        فشل تحميل البيانات. حاول تحديث الصفحة.
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <Inbox className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm font-medium text-muted-foreground">
          لا توجد حالات تطابق البحث الحالي
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          حاول تغيير الفلاتر أو رفع بيانات جديدة من صفحة الاستيراد.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Results summary + fetching indicator */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {formatNumber(total)} نتيجة — الصفحة {formatNumber(page)} من{" "}
          {formatNumber(totalPages)}
        </span>
        {isFetching && !isLoading && (
          <span className="text-xs text-primary">جارٍ التحديث...</span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/30">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className="whitespace-nowrap text-right font-medium"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="transition-colors hover:bg-muted/20"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-3 text-right">
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext(),
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end gap-2">
        <Button
          id="cases-prev-page"
          variant="outline"
          size="sm"
          onClick={() => setPage(page - 1)}
          disabled={page <= 1 || isFetching}
        >
          <ChevronRight className="h-4 w-4" />
          السابق
        </Button>
        <span className="text-sm text-muted-foreground">
          {page} / {totalPages}
        </span>
        <Button
          id="cases-next-page"
          variant="outline"
          size="sm"
          onClick={() => setPage(page + 1)}
          disabled={page >= totalPages || isFetching}
        >
          التالي
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
