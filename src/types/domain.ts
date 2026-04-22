export type UserRole = "admin" | "manager" | "collector";
export type CaseStatus = "pending" | "paid" | "partial" | "overdue" | "invalid";
export type MessageStatus = "queued" | "sent" | "delivered" | "read" | "failed";
export type ImportStatus =
  | "pending"
  | "processing"
  | "cancel_requested"
  | "cancelled"
  | "completed"
  | "failed";
export type PaymentType = "delivery" | "installment" | "late_fee" | "other";

export type SessionUser = {
  id: string;
  email: string | undefined;
  companyId: string;
  role: UserRole;
};

/**
 * Resolved company context — the full tenant profile joined from `companies`
 * and the user's membership row. Passed down from the dashboard Server
 * Component via CompanyContextProvider so every Client Component can read it
 * without issuing an extra round-trip to Supabase.
 */
export type CompanyContext = {
  /** The authenticated user. */
  user: SessionUser;
  /** The tenant's UUID (mirrors user.companyId — kept here for ergonomic access). */
  companyId: string;
  /** Display name of the company. */
  companyName: string;
  /** URL-safe slug (may be null for older tenants). */
  companySlug: string | null;
};
