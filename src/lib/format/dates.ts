import { format, isValid, parseISO } from "date-fns";
import { ar } from "date-fns/locale";

/**
 * Format an ISO date string (or Date) as a human-readable Arabic date.
 */
export function formatDate(
  value: string | Date | null | undefined,
  pattern = "d MMMM yyyy",
): string {
  if (!value) return "—";
  const date = typeof value === "string" ? parseISO(value) : value;
  if (!isValid(date)) return "—";
  return format(date, pattern, { locale: ar });
}

/**
 * Format an ISO datetime string as a short relative-friendly datetime.
 */
export function formatDateTime(value: string | Date | null | undefined): string {
  return formatDate(value, "d MMM yyyy، HH:mm");
}
