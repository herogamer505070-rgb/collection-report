"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getCompanyUsers, assignCaseCollector } from "@/app/(dashboard)/actions/cases";
import type { CompanyUser } from "@/types/cases";

interface AssignCollectorWidgetProps {
  caseId: string;
  currentAssignedId: string | null;
}

export function AssignCollectorWidget({
  caseId,
  currentAssignedId,
}: AssignCollectorWidgetProps) {
  const [selected, setSelected] = useState<string>(
    currentAssignedId ?? "unassigned",
  );
  const [isPending, startTransition] = useTransition();

  const { data: users = [], isLoading } = useQuery<CompanyUser[]>({
    queryKey: ["company-users"],
    queryFn: () => getCompanyUsers(),
    staleTime: 5 * 60 * 1000,
  });

  const handleSave = () => {
    startTransition(async () => {
      const result = await assignCaseCollector(
        caseId,
        selected === "unassigned" ? null : selected,
      );
      if (result.ok) {
        toast.success("تم تحديث المحصّل المكلّف.");
      } else {
        toast.error(result.error);
      }
    });
  };

  const isDirty =
    selected !== (currentAssignedId ?? "unassigned");

  return (
    <div className="space-y-2">
      <span className="text-xs text-muted-foreground">المحصّل المكلّف</span>
      <div className="flex gap-2">
        <Select
          value={selected}
          onValueChange={(v) => setSelected(v ?? "unassigned")}
          disabled={isLoading || isPending}
        >
          <SelectTrigger id={`assign-collector-${caseId}`} className="flex-1">
            <SelectValue placeholder="اختر محصّلاً..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">بدون تكليف</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.userId} value={u.userId}>
                {u.email ?? u.userId.slice(0, 8)}
                {u.role !== "collector" && (
                  <span className="ms-1 text-xs text-muted-foreground">
                    ({u.role})
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isDirty && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isPending}
            id={`save-assign-${caseId}`}
          >
            حفظ
          </Button>
        )}
      </div>
    </div>
  );
}
