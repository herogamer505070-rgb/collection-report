"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  type TooltipContentProps,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useChartQuery } from "@/hooks/use-kpi-query";
import { formatCurrency } from "@/lib/format/currency";

function ChartSkeleton({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-52 w-full" />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Custom tooltip content components
// Recharts v3 passes TooltipContentProps to the `content` render prop.
// ---------------------------------------------------------------------------

function CurrencyTooltip(props: TooltipContentProps) {
  const { active, payload, label } = props;
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm text-sm">
      {label && <p className="font-medium mb-1">{String(label)}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color as string }}>
          {String(p.name)}: {formatCurrency(Number(p.value ?? 0))}
        </p>
      ))}
    </div>
  );
}

function CountTooltip(props: TooltipContentProps) {
  const { active, payload, label } = props;
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm text-sm">
      {label && <p className="font-medium mb-1">{String(label)}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color as string }}>
          {String(p.name)}: {Number(p.value ?? 0)} حالة
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aging Buckets Chart
// ---------------------------------------------------------------------------

export function AgingChart() {
  const { data, isLoading } = useChartQuery();

  if (isLoading) return <ChartSkeleton title="توزيع فترات الاستحقاق" />;

  const aging = data?.aging ?? [];
  const hasData = aging.some((b) => b.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-foreground">
          توزيع فترات الاستحقاق
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          المبالغ المتأخرة حسب عدد الأيام
        </p>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
            لا توجد بيانات متأخرة
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={208}>
            <BarChart data={aging} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v: number) =>
                  new Intl.NumberFormat("en-US", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(v)
                }
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={72}
                tick={{ fontSize: 11, textAnchor: "start" }}
              />
              <Tooltip content={(p) => <CurrencyTooltip {...p} />} />
              <Bar dataKey="amount" name="المبلغ المتأخر" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Status Distribution Chart
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  pending: "hsl(45 93% 47%)",
  paid: "hsl(142 71% 45%)",
  partial: "hsl(213 94% 56%)",
  overdue: "hsl(0 84% 60%)",
  invalid: "hsl(0 0% 70%)",
};

// Custom label rendered inside SVG slices
const renderPieLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}) => {
  const RADIAN = Math.PI / 180;
  const cxN = cx ?? 0;
  const cyN = cy ?? 0;
  const midN = midAngle ?? 0;
  const irN = innerRadius ?? 0;
  const orN = outerRadius ?? 0;
  const radius = irN + (orN - irN) * 0.5;
  const x = cxN + radius * Math.cos(-midN * RADIAN);
  const y = cyN + radius * Math.sin(-midN * RADIAN);
  const pct = ((percent ?? 0) * 100).toFixed(0);
  if (Number(pct) < 5) return null;
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
    >
      {pct}%
    </text>
  );
};

export function StatusDistributionChart() {
  const { data, isLoading } = useChartQuery();

  if (isLoading) return <ChartSkeleton title="توزيع حالات التحصيل" />;

  const distribution = data?.statusDistribution ?? [];
  const hasData = distribution.some((d) => d.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-foreground">
          توزيع الحالات
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          حسب حالة التحصيل الحالية
        </p>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
            لا توجد بيانات
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={208}>
            <PieChart>
              <Pie
                data={distribution}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={72}
                labelLine={false}
                label={renderPieLabel}
              >
                {distribution.map((entry) => (
                  <Cell
                    key={entry.status}
                    fill={STATUS_COLORS[entry.status] ?? "hsl(0 0% 70%)"}
                  />
                ))}
              </Pie>
              <Legend
                formatter={(value) => (
                  <span style={{ fontSize: 11 }}>{value}</span>
                )}
              />
              <Tooltip content={(p) => <CountTooltip {...p} />} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Outstanding by Project Chart
// ---------------------------------------------------------------------------

export function OutstandingByProjectChart() {
  const { data, isLoading } = useChartQuery();

  if (isLoading) return <ChartSkeleton title="المتأخرات حسب المشروع" />;

  const byProject = data?.outstandingByProject ?? [];
  const hasData = byProject.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-foreground">
          المتأخرات حسب المشروع
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          أعلى 8 مشاريع من حيث المبالغ المتأخرة
        </p>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
            لا توجد بيانات مشاريع
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={208}>
            <BarChart data={byProject} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v: number) =>
                  new Intl.NumberFormat("en-US", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(v)
                }
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="project"
                width={100}
                tick={{ fontSize: 10, textAnchor: "start" }}
              />
              <Tooltip content={(p) => <CurrencyTooltip {...p} />} />
              <Bar
                dataKey="amount"
                name="إجمالي المتأخر"
                fill="hsl(213 94% 56%)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
