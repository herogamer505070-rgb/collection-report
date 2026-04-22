export type SemanticField =
  | "customerName"
  | "phone"
  | "externalCustomerId"
  | "externalCaseId"
  | "amountDue"
  | "amountPaid"
  | "dueDate"
  | "projectName"
  | "unitCode"
  | "contractNumber";

/** Maps semantic field name → source spreadsheet column header */
export type MappingRules = Partial<Record<SemanticField, string>>;

export type NormalizedRow = {
  customerName: string | null;
  phoneE164: string | null;
  phoneValid: boolean;
  externalCustomerId: string | null;
  externalCaseId: string | null;
  amountDue: number;
  amountPaid: number;
  dueDate: string | null; // ISO date string YYYY-MM-DD
  projectName: string | null;
  unitCode: string | null;
  contractNumber: string | null;
  paymentType: "delivery" | "installment" | "late_fee" | "other";
  rawRow: Record<string, unknown>;
};

export type RowValidationResult = {
  status: "valid" | "invalid" | "skipped";
  errors: string[];
};

export type ImportSummary = {
  totalRows: number;
  inserted: number;
  updated: number;
  invalid: number;
  duplicates: number;
  skipped: number;
  cancelled: boolean;
  errors: Array<{ rowIndex: number; errors: string[] }>;
};

export type PreviewResult =
  | {
      ok: true;
      batchId: string;
      headers: string[];
      sampleRows: Record<string, unknown>[];
      totalRows: number;
      suggestedMapping: MappingRules;
    }
  | { ok: false; error: string };

export type RunImportResult =
  | { ok: true; summary: ImportSummary }
  | { ok: false; error: string };
