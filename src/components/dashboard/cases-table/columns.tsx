"use client";

import { type ColumnDef } from "@tanstack/react-table";
import type { CaseRow } from "@/types/cases";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency } from "@/lib/format/currency";
import { formatDate } from "@/lib/format/dates";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { CaseRowActions } from "./row-actions";

/**
 * TanStack Table column definitions for the cases table.
 * Column header labels are Arabic; sorting is toggled via the SortableHeader.
 */
function SortableHeader({
  column,
  children,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  column: any;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-mr-3 h-8 gap-1 font-medium"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {children}
      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
    </Button>
  );
}

export const casesColumns: ColumnDef<CaseRow>[] = [
  {
    id: "customerName",
    accessorKey: "customerName",
    header: "العميل",
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-foreground">
          {row.original.customerName ?? "—"}
        </p>
        {row.original.phoneE164 && (
          <p className="text-xs text-muted-foreground" dir="ltr">
            {row.original.phoneE164}
          </p>
        )}
      </div>
    ),
    enableSorting: false,
    size: 160,
  },
  {
    id: "projectUnit",
    header: "المشروع / الوحدة",
    cell: ({ row }) => (
      <div>
        {row.original.projectName && (
          <p className="font-medium">{row.original.projectName}</p>
        )}
        {row.original.contractNumber && (
          <p className="text-xs text-muted-foreground" dir="ltr">
            {row.original.contractNumber}
          </p>
        )}
        {row.original.unitCode && (
          <p className="text-xs text-muted-foreground" dir="ltr">
            {row.original.unitCode}
          </p>
        )}
      </div>
    ),
    enableSorting: false,
    size: 160,
  },
  {
    id: "amountDue",
    accessorKey: "amountDue",
    header: ({ column }) => (
      <SortableHeader column={column}>المبلغ المستحق</SortableHeader>
    ),
    cell: ({ row }) => (
      <span className="font-medium">
        {formatCurrency(row.original.amountDue, row.original.currencyCode)}
      </span>
    ),
    size: 130,
  },
  {
    id: "balance",
    accessorKey: "balance",
    header: "الرصيد",
    cell: ({ row }) => (
      <span
        className={
          row.original.balance > 0 ? "text-destructive font-medium" : "text-green-600 font-medium"
        }
      >
        {formatCurrency(row.original.balance, row.original.currencyCode)}
      </span>
    ),
    enableSorting: false,
    size: 120,
  },
  {
    id: "dueDate",
    accessorKey: "dueDate",
    header: ({ column }) => (
      <SortableHeader column={column}>تاريخ الاستحقاق</SortableHeader>
    ),
    cell: ({ row }) => (
      <div>
        <p>{formatDate(row.original.dueDate)}</p>
        {row.original.agingDays !== null && (
          <p className="text-xs text-destructive">
            منذ {row.original.agingDays} يوم
          </p>
        )}
      </div>
    ),
    size: 130,
  },
  {
    id: "status",
    accessorKey: "status",
    header: "الحالة",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    enableSorting: false,
    size: 110,
  },
  {
    id: "lastNote",
    header: "آخر ملاحظة",
    cell: ({ row }) => (
      <p className="max-w-[200px] truncate text-sm text-muted-foreground">
        {row.original.lastNotePreview ?? "—"}
      </p>
    ),
    enableSorting: false,
    size: 200,
  },
  {
    id: "lastContactedAt",
    accessorKey: "lastContactedAt",
    header: "آخر تواصل",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.lastContactedAt
          ? formatDate(row.original.lastContactedAt)
          : "—"}
      </span>
    ),
    enableSorting: false,
    size: 110,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <CaseRowActions row={row.original} />,
    enableSorting: false,
    size: 50,
  },
];
