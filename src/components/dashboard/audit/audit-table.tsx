"use client";

import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { formatDateTime } from "@/lib/format/dates";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { PaginatedAuditResult } from "@/app/(dashboard)/actions/audit";

interface AuditTableProps {
  initialData: PaginatedAuditResult;
  availableActions: string[];
}

const ACTION_COLORS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  connect: "default",
  disconnect: "destructive",
  message_send: "secondary",
  note_create: "default",
  note_delete: "destructive",
  case_assign: "outline",
  role_change: "destructive",
  member_invite: "default",
  member_deactivate: "destructive",
  member_reactivate: "secondary",
};

export function AuditTable({ initialData, availableActions }: AuditTableProps) {
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [actionFilter, setActionFilter] = useQueryState(
    "action",
    parseAsString,
  );
  const [entityTypeFilter, setEntityTypeFilter] = useQueryState(
    "entity",
    parseAsString,
  );

  const { rows, total, pageSize } = initialData;
  const totalPages = Math.ceil(total / pageSize) || 1;

  const handleClearFilters = () => {
    setActionFilter(null);
    setEntityTypeFilter(null);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl bg-card/50 ring-1 ring-border/50 shadow-sm backdrop-blur-sm p-4">
        <div className="w-48 space-y-1">
          <label className="text-xs text-muted-foreground">نوع الحدث</label>
          <Select
            value={actionFilter ?? "all"}
            onValueChange={(v) => {
              setActionFilter(v === "all" ? null : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="الكل" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              {availableActions.map((act) => (
                <SelectItem key={act} value={act}>
                  {act}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-48 space-y-1">
          <label className="text-xs text-muted-foreground">الكيان (جدول)</label>
          <Input
            value={entityTypeFilter ?? ""}
            onChange={(e) => {
              setEntityTypeFilter(e.target.value || null);
              setPage(1);
            }}
            placeholder="مثال: collection_cases"
            className="h-8"
            dir="ltr"
          />
        </div>

        {(actionFilter || entityTypeFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="mt-5 h-8 text-xs"
          >
            <X className="me-1 h-3.5 w-3.5" /> مسح الفلاتر
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl ring-1 ring-border/50 shadow-sm bg-card/40 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>التاريخ</TableHead>
              <TableHead>المستخدم</TableHead>
              <TableHead>الحدث</TableHead>
              <TableHead>الكيان</TableHead>
              <TableHead>التفاصيل</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  لا توجد سجلات مطابقة.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDateTime(row.createdAt)}
                  </TableCell>
                  <TableCell>
                    {row.actorEmail ? (
                      <span className="text-sm font-medium" dir="ltr">
                        {row.actorEmail}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground" dir="ltr">
                        {row.actorUserId ?? "نظام"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={ACTION_COLORS[row.action] ?? "outline"}
                      className="font-mono text-xs"
                    >
                      {row.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-xs text-foreground">
                        {row.entityType}
                      </span>
                      {row.entityId && (
                        <span
                          className="font-mono text-[10px] text-muted-foreground"
                          title={row.entityId}
                        >
                          {row.entityId.slice(0, 8)}…
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs space-y-1">
                      {row.metadata && Object.keys(row.metadata).length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">بيانات إضافية: </span>
                          <span className="font-mono">
                            {JSON.stringify(row.metadata)}
                          </span>
                        </div>
                      )}
                      {row.afterState &&
                        Object.keys(row.afterState).length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium text-green-600 dark:text-green-400">
                              التغيير:{" "}
                            </span>
                            <span className="font-mono">
                              {JSON.stringify(row.afterState)}
                            </span>
                          </div>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            عرض صفحة {page} من {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
            >
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
              السابق
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
            >
              التالي
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
