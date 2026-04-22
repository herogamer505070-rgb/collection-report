"use client";

import { useTransition } from "react";
import { parseAsString, parseAsInteger, useQueryStates } from "nuqs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import type { CasesFilter, CaseSortField } from "@/types/cases";
import type { CaseStatus } from "@/types/domain";

// ---------------------------------------------------------------------------
// URL state parsers (nuqs v2 pattern)
// ---------------------------------------------------------------------------

const CASES_PARSERS = {
  search: parseAsString.withDefault(""),
  status: parseAsString.withDefault(""),
  projectName: parseAsString.withDefault(""),
  dueDateFrom: parseAsString.withDefault(""),
  dueDateTo: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
  pageSize: parseAsInteger.withDefault(25),
  sortField: parseAsString.withDefault("created_at"),
  sortDir: parseAsString.withDefault("desc"),
} as const;

/**
 * Hook that returns the current filter state + a setter, derived from URL params.
 * Shared by both the toolbar and the table component so they stay in sync.
 */
export function useCasesFilterState() {
  const [state, setAll] = useQueryStates(CASES_PARSERS, {
    shallow: false, // trigger a server component re-fetch
  });

  const filter: CasesFilter = {
    search: state.search || undefined,
    status: (state.status as CaseStatus) || undefined,
    projectName: state.projectName || undefined,
    dueDateFrom: state.dueDateFrom || undefined,
    dueDateTo: state.dueDateTo || undefined,
    page: state.page,
    pageSize: state.pageSize,
    sortField: state.sortField as CaseSortField,
    sortDir: state.sortDir as "asc" | "desc",
  };

  const hasActiveFilters = Boolean(
    state.search || state.status || state.projectName || state.dueDateFrom || state.dueDateTo,
  );

  const resetFilters = () =>
    setAll({
      search: "",
      status: "",
      projectName: "",
      dueDateFrom: "",
      dueDateTo: "",
      page: 1,
    });

  const setPage = (page: number) => setAll({ page });

  return { filter, state, setAll, hasActiveFilters, resetFilters, setPage };
}

// ---------------------------------------------------------------------------
// Toolbar component
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: { value: CaseStatus; label: string }[] = [
  { value: "pending", label: "قيد الانتظار" },
  { value: "paid", label: "مسدد" },
  { value: "partial", label: "جزئي" },
  { value: "overdue", label: "متأخر" },
  { value: "invalid", label: "غير صالح" },
];

export function CasesToolbar() {
  const { state, setAll, hasActiveFilters, resetFilters } =
    useCasesFilterState();
  const [, startTransition] = useTransition();

  const handleSearch = (value: string) => {
    startTransition(() => {
      void setAll({ search: value, page: 1 });
    });
  };

  const handleStatus = (value: string | null) => {
    const v = value ?? "";
    startTransition(() => {
      void setAll({ status: v === "all" ? "" : v, page: 1 });
    });
  };

  const handleProject = (value: string) => {
    startTransition(() => {
      void setAll({ projectName: value, page: 1 });
    });
  };

  const handleDueDateFrom = (value: string) => {
    startTransition(() => {
      void setAll({ dueDateFrom: value, page: 1 });
    });
  };

  const handleDueDateTo = (value: string) => {
    startTransition(() => {
      void setAll({ dueDateTo: value, page: 1 });
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="cases-search"
            placeholder="بحث برقم العقد أو رقم الحالة..."
            value={state.search}
            onChange={(e) => handleSearch(e.target.value)}
            className="ps-9"
          />
        </div>

        {/* Status filter */}
        <Select
          value={state.status || "all"}
          onValueChange={handleStatus}
        >
          <SelectTrigger
            id="cases-status-filter"
            className="w-40"
          >
            <SelectValue placeholder="كل الحالات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Project name filter */}
        <Input
          id="cases-project-filter"
          placeholder="اسم المشروع..."
          value={state.projectName}
          onChange={(e) => handleProject(e.target.value)}
          className="w-40"
        />

        {/* Due date range */}
        <div className="flex items-center gap-2">
          <Input
            id="cases-date-from"
            type="date"
            value={state.dueDateFrom}
            onChange={(e) => handleDueDateFrom(e.target.value)}
            className="w-36"
            title="تاريخ الاستحقاق من"
          />
          <span className="text-xs text-muted-foreground">—</span>
          <Input
            id="cases-date-to"
            type="date"
            value={state.dueDateTo}
            onChange={(e) => handleDueDateTo(e.target.value)}
            className="w-36"
            title="تاريخ الاستحقاق إلى"
          />
        </div>

        {/* Reset */}
        {hasActiveFilters && (
          <Button
            id="cases-reset-filters"
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            مسح الفلاتر
          </Button>
        )}
      </div>
    </div>
  );
}
