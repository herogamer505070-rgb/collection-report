import { useQuery } from "@tanstack/react-query";
import type { CasesFilter, PaginatedCasesResult } from "@/types/cases";
import { getPaginatedCases } from "@/app/(dashboard)/actions/cases";

/**
 * React Query hook for the paginated cases table.
 * @param filter — current filter / sort / pagination params.
 *
 * queryKey includes the full filter so React Query caches distinct
 * result sets per unique combination of params.
 */
export function useCasesQuery(filter: CasesFilter) {
  return useQuery<PaginatedCasesResult>({
    queryKey: ["cases", filter],
    queryFn: () => getPaginatedCases(filter),
    placeholderData: (prev) => prev, // keep previous data while loading
    staleTime: 30 * 1000,
  });
}
