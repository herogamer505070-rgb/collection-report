import type { NormalizedRow, RowValidationResult } from "@/types/imports";

/**
 * Validates a normalized row and classifies it.
 *
 * Rules:
 * - amountDue < 0 → invalid
 * - amountDue === 0 AND amountPaid === 0 → skipped (no financial data)
 * - Invalid phone → allowed (imported but flagged, blocked from WhatsApp send)
 * - Missing customerName → allowed (case can still be tracked)
 */
export function validateRow(row: NormalizedRow): RowValidationResult {
  const errors: string[] = [];

  if (row.amountDue < 0) {
    errors.push("المبلغ المستحق لا يمكن أن يكون سالبًا");
  }

  if (row.amountDue === 0 && row.amountPaid === 0) {
    return { status: "skipped", errors: [] };
  }

  if (errors.length > 0) {
    return { status: "invalid", errors };
  }

  return { status: "valid", errors: [] };
}
