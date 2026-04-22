import { useQuery } from "@tanstack/react-query";
import type { KpiData, ChartData } from "@/types/cases";
import { getKpiData, getChartData } from "@/app/(dashboard)/actions/cases";

/**
 * React Query hook for KPI data.
 * Used by client components in the dashboard.
 * The underlying server action already handles collector scoping.
 */
export function useKpiQuery() {
  return useQuery<KpiData>({
    queryKey: ["kpi"],
    queryFn: () => getKpiData(),
    staleTime: 60 * 1000,
  });
}

/**
 * React Query hook for chart data.
 */
export function useChartQuery() {
  return useQuery<ChartData>({
    queryKey: ["chart-data"],
    queryFn: () => getChartData(),
    staleTime: 60 * 1000,
  });
}
