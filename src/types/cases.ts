import type { CaseStatus, PaymentType } from "./domain";

// ---------------------------------------------------------------------------
// KPI payload
// ---------------------------------------------------------------------------

export type KpiData = {
  totalOutstanding: number;
  totalPaid: number;
  collectionRate: number; // 0–100 percentage
  overdueCount: number;
  partialCount: number;
  pendingCount: number;
  paidCount: number;
  totalCases: number;
  avgTicketSize: number;
};

// ---------------------------------------------------------------------------
// Chart data shapes
// ---------------------------------------------------------------------------

export type AgingBucket = {
  label: string; // e.g. "0-30 يوم"
  amount: number;
  count: number;
};

export type StatusDistribution = {
  status: CaseStatus;
  label: string;
  count: number;
  amount: number;
};

export type OutstandingByProject = {
  project: string;
  amount: number;
  cases: number;
};

export type ChartData = {
  aging: AgingBucket[];
  statusDistribution: StatusDistribution[];
  outstandingByProject: OutstandingByProject[];
};

// ---------------------------------------------------------------------------
// Cases list row (flat projection — enough for the table)
// ---------------------------------------------------------------------------

export type CaseRow = {
  id: string;
  // Customer
  customerName: string | null;
  phoneE164: string | null;
  // Case
  contractNumber: string | null;
  unitCode: string | null;
  projectName: string | null;
  externalCaseId: string | null;
  amountDue: number;
  amountPaid: number;
  balance: number;
  currencyCode: string;
  paymentType: PaymentType;
  dueDate: string | null; // ISO date string
  agingDays: number | null; // days overdue (null if not due yet)
  status: CaseStatus;
  assignedToUserId: string | null;
  assignedToEmail: string | null;
  lastContactedAt: string | null;
  lastNotePreview: string | null;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Filter / sort params
// ---------------------------------------------------------------------------

export type CaseSortField =
  | "due_date"
  | "amount_due"
  | "amount_paid"
  | "status"
  | "created_at"
  | "last_contacted_at";

export type CasesFilter = {
  search?: string;
  status?: CaseStatus | "";
  projectName?: string;
  assignedToUserId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  page?: number;
  pageSize?: number;
  sortField?: CaseSortField;
  sortDir?: "asc" | "desc";
};

export type PaginatedCasesResult = {
  rows: CaseRow[];
  total: number;
  page: number;
  pageSize: number;
};

// ---------------------------------------------------------------------------
// Case notes
// ---------------------------------------------------------------------------

export type NoteRow = {
  id: string;
  caseId: string;
  userId: string;
  /** Email of the author — resolved from auth.users at fetch time */
  authorEmail: string | null;
  note: string;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// WhatsApp message log
// ---------------------------------------------------------------------------

export type WhatsAppLogRow = {
  id: string;
  sentByUserId: string | null;
  sentByEmail: string | null;
  templateName: string | null;
  renderedMessage: string | null;
  status: import("./domain").MessageStatus;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Company users — for collector assignment select
// ---------------------------------------------------------------------------

export type CompanyUser = {
  userId: string;
  email: string | null;
  role: import("./domain").UserRole;
};

// ---------------------------------------------------------------------------
// Full case detail — for the details page
// ---------------------------------------------------------------------------

export type CaseDetail = {
  // Case identifiers
  id: string;
  externalCaseId: string | null;
  contractNumber: string | null;
  unitCode: string | null;
  projectName: string | null;
  caseFingerprint: string;
  importBatchId: string | null;
  // Financials
  amountDue: number;
  amountPaid: number;
  balance: number;
  currencyCode: string;
  paymentType: PaymentType;
  dueDate: string | null;
  agingDays: number | null;
  status: CaseStatus;
  // Assignment
  assignedToUserId: string | null;
  assignedToEmail: string | null;
  lastContactedAt: string | null;
  rawRow: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  // Customer
  customer: {
    id: string;
    name: string | null;
    phoneE164: string | null;
    alternatePhone: string | null;
    nationalId: string | null;
    externalCustomerId: string | null;
  };
  // Relations
  notes: NoteRow[];
  whatsappLogs: WhatsAppLogRow[];
};

// ---------------------------------------------------------------------------
// Server action result wrappers
// ---------------------------------------------------------------------------

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };
