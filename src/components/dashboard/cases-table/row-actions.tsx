"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal, MessageSquare, FileText, Send } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CaseRow } from "@/types/cases";

interface CaseRowActionsProps {
  row: CaseRow;
}

export function CaseRowActions({ row }: CaseRowActionsProps) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="فتح قائمة الإجراءات"
        id={`case-actions-${row.id}`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border-transparent bg-transparent text-sm transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem
          onClick={() => router.push(`/cases/${row.id}`)}
          id={`case-view-${row.id}`}
        >
          <FileText className="me-2 h-4 w-4" />
          عرض التفاصيل
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            router.push(`/cases/${row.id}?action=note`)
          }
          id={`case-note-${row.id}`}
        >
          <MessageSquare className="me-2 h-4 w-4" />
          إضافة ملاحظة
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            router.push(`/cases/${row.id}?action=whatsapp`)
          }
          disabled={!row.phoneE164}
          id={`case-whatsapp-${row.id}`}
        >
          <Send className="me-2 h-4 w-4" />
          إرسال واتساب
          {!row.phoneE164 && (
            <span className="ms-auto text-xs text-muted-foreground">
              لا يوجد هاتف
            </span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
