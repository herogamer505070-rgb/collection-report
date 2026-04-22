import type { MappingRules, NormalizedRow } from "@/types/imports";

// ---------------------------------------------------------------------------
// Phone normalization
// ---------------------------------------------------------------------------

/**
 * Normalizes an Egyptian phone number to E.164 (+2XXXXXXXXXX).
 * Returns null and valid: false for unrecognized formats.
 */
export function normalizePhone(raw: unknown): {
  e164: string | null;
  valid: boolean;
} {
  if (raw == null || raw === "") return { e164: null, valid: false };
  const s = String(raw).replace(/[\s\-().+]/g, "");

  // Already E.164 with Egypt code
  if (/^\+?2(01[0-9]{9})$/.test(s)) {
    const digits = s.replace(/^\+/, "");
    return { e164: `+${digits}`, valid: true };
  }

  // Egypt mobile starting with 01
  if (/^01[0-9]{9}$/.test(s)) {
    return { e164: `+2${s}`, valid: true };
  }

  // Has content but doesn't match — store as-is, flag invalid
  if (s.length > 0) {
    return { e164: null, valid: false };
  }

  return { e164: null, valid: false };
}

// ---------------------------------------------------------------------------
// Date normalization
// ---------------------------------------------------------------------------

/**
 * Parses a date value from various formats and returns an ISO date string
 * (YYYY-MM-DD) or null if unparseable.
 */
export function normalizeDate(raw: unknown): string | null {
  if (raw == null || raw === "") return null;

  const s = String(raw).trim();

  // Try native Date parse (handles most ISO, US, and European formats)
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0] ?? null;
  }

  // Try DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const d2 = new Date(
      `${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`,
    );
    if (!isNaN(d2.getTime())) {
      return d2.toISOString().split("T")[0] ?? null;
    }
  }

  // Excel serial date (number)
  const serial = parseFloat(s);
  if (!isNaN(serial) && serial > 1 && serial < 100000) {
    // Excel epoch is Dec 30, 1899
    const excelEpoch = new Date(1899, 11, 30);
    const ms = serial * 24 * 60 * 60 * 1000;
    const excelDate = new Date(excelEpoch.getTime() + ms);
    if (!isNaN(excelDate.getTime())) {
      return excelDate.toISOString().split("T")[0] ?? null;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Money normalization
// ---------------------------------------------------------------------------

/**
 * Parses a monetary value from various string representations.
 * Returns 0 for empty/unparseable values.
 */
export function normalizeMoney(raw: unknown): number {
  if (raw == null || raw === "") return 0;
  const s = String(raw)
    .replace(/[^\d.\-,]/g, "") // strip currency symbols, spaces
    .replace(/,(?=\d{3})/g, "") // remove thousands commas
    .trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// ---------------------------------------------------------------------------
// Row normalization
// ---------------------------------------------------------------------------

function getString(
  row: Record<string, unknown>,
  column: string | undefined,
): string | null {
  if (!column) return null;
  const v = row[column];
  if (v == null || v === "") return null;
  return String(v).trim();
}

/**
 * Maps a raw spreadsheet row through MappingRules and normalizes all values.
 */
export function normalizeRow(
  raw: Record<string, unknown>,
  mapping: MappingRules,
): NormalizedRow {
  const phone = normalizePhone(getString(raw, mapping.phone));

  return {
    customerName: getString(raw, mapping.customerName),
    phoneE164: phone.e164,
    phoneValid: phone.valid,
    externalCustomerId: getString(raw, mapping.externalCustomerId),
    externalCaseId: getString(raw, mapping.externalCaseId),
    amountDue: normalizeMoney(getString(raw, mapping.amountDue)),
    amountPaid: normalizeMoney(getString(raw, mapping.amountPaid)),
    dueDate: normalizeDate(getString(raw, mapping.dueDate)),
    projectName: getString(raw, mapping.projectName),
    unitCode: getString(raw, mapping.unitCode),
    contractNumber: getString(raw, mapping.contractNumber),
    paymentType: "installment", // default; no direct mapping for MVP
    rawRow: raw,
  };
}
