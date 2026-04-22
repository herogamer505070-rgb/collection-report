import { cn } from "@/lib/utils";
import type { CaseStatus } from "@/types/domain";

const STATUS_CONFIG: Record<
  CaseStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "قيد الانتظار",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  paid: {
    label: "مسدد",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  partial: {
    label: "جزئي",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  overdue: {
    label: "متأخر",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  invalid: {
    label: "غير صالح",
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
};

interface StatusBadgeProps {
  status: CaseStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.invalid;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
