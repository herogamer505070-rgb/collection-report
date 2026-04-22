"use client";

import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useKpiQuery } from "@/hooks/use-kpi-query";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format/currency";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  /** When provided, clicking applies this status filter on /dashboard/cases */
  filterStatus?: string;
  className?: string;
}

function KpiCard({ title, value, subtitle, filterStatus, className }: KpiCardProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isClickable = Boolean(filterStatus);

  const handleClick = () => {
    if (!filterStatus) return;
    const target =
      pathname.startsWith("/dashboard/cases")
        ? `/dashboard/cases?status=${filterStatus}`
        : `/dashboard/cases?status=${filterStatus}`;
    router.push(target);
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-shadow",
        isClickable &&
          "cursor-pointer hover:shadow-md hover:ring-2 hover:ring-primary/30",
        className,
      )}
      onClick={isClickable ? handleClick : undefined}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") handleClick();
            }
          : undefined
      }
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tracking-tight text-foreground">
          {value}
        </p>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
        {isClickable && (
          <p className="mt-2 text-xs text-primary">انقر للتصفية ←</p>
        )}
      </CardContent>
    </Card>
  );
}

function KpiCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-28" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-36" />
        <Skeleton className="mt-2 h-3 w-24" />
      </CardContent>
    </Card>
  );
}

export function KpiCards() {
  const { data, isLoading, isError } = useKpiQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        فشل تحميل المؤشرات. حاول تحديث الصفحة.
      </div>
    );
  }

  const cards: KpiCardProps[] = [
    {
      title: "إجمالي المتأخر",
      value: formatCurrency(data.totalOutstanding),
      subtitle: `${formatNumber(data.totalCases)} حالة إجمالاً`,
    },
    {
      title: "إجمالي المحصّل",
      value: formatCurrency(data.totalPaid),
      subtitle: "من كامل المحفظة",
    },
    {
      title: "نسبة التحصيل",
      value: formatPercent(data.collectionRate),
      subtitle: "من القيمة الإجمالية",
    },
    {
      title: "متوسط قيمة الحالة",
      value: formatCurrency(data.avgTicketSize),
    },
    {
      title: "حالات متأخرة",
      value: formatNumber(data.overdueCount),
      subtitle: "انقر للتصفية",
      filterStatus: "overdue",
    },
    {
      title: "دفع جزئي",
      value: formatNumber(data.partialCount),
      subtitle: "انقر للتصفية",
      filterStatus: "partial",
    },
    {
      title: "قيد الانتظار",
      value: formatNumber(data.pendingCount),
      subtitle: "انقر للتصفية",
      filterStatus: "pending",
    },
    {
      title: "مسددة",
      value: formatNumber(data.paidCount),
      subtitle: "انقر للتصفية",
      filterStatus: "paid",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <KpiCard key={card.title} {...card} />
      ))}
    </div>
  );
}
