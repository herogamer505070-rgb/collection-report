"use server";

import { getRequiredCompanyContext } from "@/lib/auth/get-company-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { differenceInDays, parseISO } from "date-fns";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { recordAuditEvent } from "@/lib/auth/audit-log";
import type {
  KpiData,
  ChartData,
  CasesFilter,
  PaginatedCasesResult,
  CaseRow,
  StatusDistribution,
  AgingBucket,
  OutstandingByProject,
  CaseDetail,
  NoteRow,
  WhatsAppLogRow,
  CompanyUser,
  ActionResult,
} from "@/types/cases";
import type { CaseStatus, PaymentType } from "@/types/domain";

// ---------------------------------------------------------------------------
// KPI
// ---------------------------------------------------------------------------

export async function getKpiData(): Promise<KpiData> {
  const ctx = await getRequiredCompanyContext();
  const admin = createAdminClient();

  // Build base filter — collectors see only their assigned cases
  let query = admin
    .from("collection_cases")
    .select("amount_due, amount_paid, status")
    .eq("company_id", ctx.companyId);

  if (ctx.user.role === "collector") {
    query = query.eq("assigned_to_user_id", ctx.user.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getKpiData] error:", error);
    // Return zero-state rather than crash
    return {
      totalOutstanding: 0,
      totalPaid: 0,
      collectionRate: 0,
      overdueCount: 0,
      partialCount: 0,
      pendingCount: 0,
      paidCount: 0,
      totalCases: 0,
      avgTicketSize: 0,
    };
  }

  const rows = data ?? [];

  let totalOutstanding = 0;
  let totalPaid = 0;
  let overdueCount = 0;
  let partialCount = 0;
  let pendingCount = 0;
  let paidCount = 0;

  for (const r of rows) {
    const due = Number(r.amount_due ?? 0);
    const paid = Number(r.amount_paid ?? 0);
    totalOutstanding += Math.max(0, due - paid);
    totalPaid += paid;
    if (r.status === "overdue") overdueCount++;
    else if (r.status === "partial") partialCount++;
    else if (r.status === "pending") pendingCount++;
    else if (r.status === "paid") paidCount++;
  }

  const total = totalOutstanding + totalPaid;
  const collectionRate = total > 0 ? (totalPaid / total) * 100 : 0;
  const totalCases = rows.length;
  const avgTicketSize = totalCases > 0 ? totalOutstanding / totalCases : 0;

  return {
    totalOutstanding,
    totalPaid,
    collectionRate,
    overdueCount,
    partialCount,
    pendingCount,
    paidCount,
    totalCases,
    avgTicketSize,
  };
}

// ---------------------------------------------------------------------------
// Chart data
// ---------------------------------------------------------------------------

export async function getChartData(): Promise<ChartData> {
  const ctx = await getRequiredCompanyContext();
  const admin = createAdminClient();
  const now = new Date();

  let query = admin
    .from("collection_cases")
    .select("amount_due, amount_paid, status, due_date, project_name")
    .eq("company_id", ctx.companyId);

  if (ctx.user.role === "collector") {
    query = query.eq("assigned_to_user_id", ctx.user.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getChartData] error:", error);
    return { aging: [], statusDistribution: [], outstandingByProject: [] };
  }

  const rows = data ?? [];

  // --- Status distribution ---
  const statusMap = new Map<
    CaseStatus,
    { label: string; count: number; amount: number }
  >();
  const statusLabels: Record<CaseStatus, string> = {
    pending: "قيد الانتظار",
    paid: "مسدد",
    partial: "جزئي",
    overdue: "متأخر",
    invalid: "غير صالح",
  };
  for (const r of rows) {
    const s = r.status as CaseStatus;
    const existing = statusMap.get(s) ?? {
      label: statusLabels[s],
      count: 0,
      amount: 0,
    };
    const balance = Math.max(
      0,
      Number(r.amount_due ?? 0) - Number(r.amount_paid ?? 0),
    );
    statusMap.set(s, {
      ...existing,
      count: existing.count + 1,
      amount: existing.amount + balance,
    });
  }
  const statusDistribution: StatusDistribution[] = Array.from(
    statusMap.entries(),
  ).map(([status, v]) => ({ status, ...v }));

  // --- Aging buckets (days overdue for non-paid rows) ---
  const agingDefs: { label: string; minDays: number; maxDays: number }[] = [
    { label: "0–30 يوم", minDays: 0, maxDays: 30 },
    { label: "31–60 يوم", minDays: 31, maxDays: 60 },
    { label: "61–90 يوم", minDays: 61, maxDays: 90 },
    { label: "+90 يوم", minDays: 91, maxDays: Infinity },
  ];
  const agingAccum: Record<string, AgingBucket> = {};
  for (const def of agingDefs) {
    agingAccum[def.label] = { label: def.label, amount: 0, count: 0 };
  }

  for (const r of rows) {
    if (r.status === "paid" || !r.due_date) continue;
    const daysOverdue = differenceInDays(now, parseISO(r.due_date));
    if (daysOverdue < 0) continue; // Not yet due
    const bucket = agingDefs.find(
      (d) => daysOverdue >= d.minDays && daysOverdue <= d.maxDays,
    );
    if (bucket) {
      const balance = Math.max(
        0,
        Number(r.amount_due ?? 0) - Number(r.amount_paid ?? 0),
      );
      agingAccum[bucket.label].amount += balance;
      agingAccum[bucket.label].count += 1;
    }
  }
  const aging: AgingBucket[] = agingDefs.map((d) => agingAccum[d.label]);

  // --- Outstanding by project (top 8) ---
  const projectMap = new Map<string, { amount: number; cases: number }>();
  for (const r of rows) {
    if (r.status === "paid") continue;
    const proj = r.project_name ?? "غير محدد";
    const existing = projectMap.get(proj) ?? { amount: 0, cases: 0 };
    const balance = Math.max(
      0,
      Number(r.amount_due ?? 0) - Number(r.amount_paid ?? 0),
    );
    projectMap.set(proj, {
      amount: existing.amount + balance,
      cases: existing.cases + 1,
    });
  }
  const outstandingByProject: OutstandingByProject[] = Array.from(
    projectMap.entries(),
  )
    .map(([project, v]) => ({ project, ...v }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  return { aging, statusDistribution, outstandingByProject };
}

// ---------------------------------------------------------------------------
// Paginated cases list
// ---------------------------------------------------------------------------

export async function getPaginatedCases(
  filter: CasesFilter,
): Promise<PaginatedCasesResult> {
  const ctx = await getRequiredCompanyContext();
  const admin = createAdminClient();

  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filter.pageSize ?? 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const sortField = filter.sortField ?? "created_at";
  const sortDir = filter.sortDir ?? "desc";

  // Build query with left-join-like select
  let query = admin
    .from("collection_cases")
    .select(
      `id,
       amount_due, amount_paid, currency_code, payment_type,
       contract_number, unit_code, project_name, external_case_id,
       due_date, status, assigned_to_user_id, last_contacted_at, created_at,
       customers!inner(name, phone_e164),
       case_notes(note, created_at)`,
      { count: "exact" },
    )
    .eq("company_id", ctx.companyId);

  // Collector scoping
  if (ctx.user.role === "collector") {
    query = query.eq("assigned_to_user_id", ctx.user.id);
  }

  // Filters
  if (filter.status) {
    query = query.eq("status", filter.status);
  }
  if (filter.projectName) {
    query = query.ilike("project_name", `%${filter.projectName}%`);
  }
  if (filter.assignedToUserId) {
    query = query.eq("assigned_to_user_id", filter.assignedToUserId);
  }
  if (filter.dueDateFrom) {
    query = query.gte("due_date", filter.dueDateFrom);
  }
  if (filter.dueDateTo) {
    query = query.lte("due_date", filter.dueDateTo);
  }
  if (filter.search) {
    // Search on customer name or external case id via joined customer
    query = query.or(
      `external_case_id.ilike.%${filter.search}%,contract_number.ilike.%${filter.search}%`,
    );
  }

  // Sort + pagination
  query = query
    .order(sortField, { ascending: sortDir === "asc" })
    .range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error("[getPaginatedCases] error:", error);
    return { rows: [], total: 0, page, pageSize };
  }

  const now = new Date();

  const rows: CaseRow[] = (data ?? []).map((r) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customer = (r as any).customers as {
      name: string | null;
      phone_e164: string | null;
    } | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notes = (r as any).case_notes as
      | { note: string; created_at: string }[]
      | null;

    const amountDue = Number(r.amount_due ?? 0);
    const amountPaid = Number(r.amount_paid ?? 0);
    const balance = Math.max(0, amountDue - amountPaid);

    let agingDays: number | null = null;
    if (r.due_date && r.status !== "paid") {
      const days = differenceInDays(now, parseISO(r.due_date));
      agingDays = days > 0 ? days : null;
    }

    const latestNote =
      notes && notes.length > 0
        ? notes.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          )[0]
        : null;

    return {
      id: r.id,
      customerName: customer?.name ?? null,
      phoneE164: customer?.phone_e164 ?? null,
      contractNumber: r.contract_number ?? null,
      unitCode: r.unit_code ?? null,
      projectName: r.project_name ?? null,
      externalCaseId: r.external_case_id ?? null,
      amountDue,
      amountPaid,
      balance,
      currencyCode: r.currency_code,
      paymentType: r.payment_type as import("@/types/domain").PaymentType,
      dueDate: r.due_date ?? null,
      agingDays,
      status: r.status as CaseStatus,
      assignedToUserId: r.assigned_to_user_id ?? null,
      assignedToEmail: null, // resolved separately if needed
      lastContactedAt: r.last_contacted_at ?? null,
      lastNotePreview: latestNote ? latestNote.note.slice(0, 80) : null,
      createdAt: r.created_at,
    };
  });

  return { rows, total: count ?? 0, page, pageSize };
}

// ---------------------------------------------------------------------------
// Case details (single case with all relations)
// ---------------------------------------------------------------------------

export async function getCaseDetails(
  caseId: string,
): Promise<CaseDetail | null> {
  const ctx = await getRequiredCompanyContext();
  const admin = createAdminClient();

  const { data: c, error } = await admin
    .from("collection_cases")
    .select(
      `id, external_case_id, contract_number, unit_code, project_name,
       case_fingerprint, import_batch_id,
       amount_due, amount_paid, currency_code, payment_type,
       due_date, status, assigned_to_user_id, last_contacted_at,
       raw_row, created_at, updated_at,
       customers!inner(
         id, name, phone_e164, alternate_phone, national_id, external_customer_id
       ),
       case_notes(
         id, user_id, note, created_at
       ),
       whatsapp_message_logs(
         id, sent_by_user_id, template_name, rendered_message,
         status, error_code, error_message, created_at, updated_at
       )`,
    )
    .eq("id", caseId)
    .eq("company_id", ctx.companyId)
    .single();

  if (error || !c) return null;

  // Collector scoping — collectors may only view their assigned case
  if (ctx.user.role === "collector" && c.assigned_to_user_id !== ctx.user.id) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cAny = c as any;
  const customer = cAny.customers as {
    id: string;
    name: string | null;
    phone_e164: string | null;
    alternate_phone: string | null;
    national_id: string | null;
    external_customer_id: string | null;
  };
  const rawNotes = (cAny.case_notes ?? []) as {
    id: string;
    user_id: string;
    note: string;
    created_at: string;
  }[];
  const rawLogs = (cAny.whatsapp_message_logs ?? []) as {
    id: string;
    sent_by_user_id: string | null;
    template_name: string | null;
    rendered_message: string | null;
    status: string;
    error_code: string | null;
    error_message: string | null;
    created_at: string;
    updated_at: string;
  }[];

  const now = new Date();
  const amountDue = Number(c.amount_due ?? 0);
  const amountPaid = Number(c.amount_paid ?? 0);
  const balance = Math.max(0, amountDue - amountPaid);
  let agingDays: number | null = null;
  if (c.due_date && c.status !== "paid") {
    const days = differenceInDays(now, parseISO(c.due_date));
    agingDays = days > 0 ? days : null;
  }

  const notes: NoteRow[] = rawNotes
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .map((n) => ({
      id: n.id,
      caseId,
      userId: n.user_id,
      authorEmail: null, // resolved client-side or via separate lookup if needed
      note: n.note,
      createdAt: n.created_at,
    }));

  const whatsappLogs: WhatsAppLogRow[] = rawLogs
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .map((l) => ({
      id: l.id,
      sentByUserId: l.sent_by_user_id,
      sentByEmail: null,
      templateName: l.template_name,
      renderedMessage: l.rendered_message,
      status: l.status as import("@/types/domain").MessageStatus,
      errorCode: l.error_code,
      errorMessage: l.error_message,
      createdAt: l.created_at,
      updatedAt: l.updated_at,
    }));

  return {
    id: c.id,
    externalCaseId: c.external_case_id ?? null,
    contractNumber: c.contract_number ?? null,
    unitCode: c.unit_code ?? null,
    projectName: c.project_name ?? null,
    caseFingerprint: c.case_fingerprint,
    importBatchId: c.import_batch_id ?? null,
    amountDue,
    amountPaid,
    balance,
    currencyCode: c.currency_code,
    paymentType: c.payment_type as PaymentType,
    dueDate: c.due_date ?? null,
    agingDays,
    status: c.status as CaseStatus,
    assignedToUserId: c.assigned_to_user_id ?? null,
    assignedToEmail: null,
    lastContactedAt: c.last_contacted_at ?? null,
    rawRow: (c.raw_row as Record<string, unknown>) ?? null,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    customer: {
      id: customer.id,
      name: customer.name,
      phoneE164: customer.phone_e164,
      alternatePhone: customer.alternate_phone,
      nationalId: customer.national_id,
      externalCustomerId: customer.external_customer_id,
    },
    notes,
    whatsappLogs,
  };
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export async function createCaseNote(
  caseId: string,
  note: string,
): Promise<ActionResult<NoteRow>> {
  if (!note.trim())
    return { ok: false, error: "الملاحظة لا يمكن أن تكون فارغة." };

  const ctx = await getRequiredCompanyContext();
  requirePermission(ctx.user, "notes.create");
  const admin = createAdminClient();

  // Verify case belongs to company (and collector can access it)
  const { data: caseRow } = await admin
    .from("collection_cases")
    .select("id, assigned_to_user_id")
    .eq("id", caseId)
    .eq("company_id", ctx.companyId)
    .single();

  if (!caseRow) return { ok: false, error: "الحالة غير موجودة." };
  if (
    ctx.user.role === "collector" &&
    caseRow.assigned_to_user_id !== ctx.user.id
  ) {
    return { ok: false, error: "ليس لديك صلاحية إضافة ملاحظة على هذه الحالة." };
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const { error } = await admin.from("case_notes").insert({
    id,
    company_id: ctx.companyId,
    case_id: caseId,
    user_id: ctx.user.id,
    note: note.trim(),
    created_at: now,
  });

  if (error) {
    console.error("[createCaseNote] error:", error);
    return { ok: false, error: "فشل حفظ الملاحظة." };
  }

  await recordAuditEvent({
    companyId: ctx.companyId,
    actorUserId: ctx.user.id,
    entityType: "case_notes",
    entityId: id,
    action: "note_create",
    metadata: { caseId },
  });

  revalidatePath(`/cases/${caseId}`);

  return {
    ok: true,
    data: {
      id,
      caseId,
      userId: ctx.user.id,
      authorEmail: ctx.user.email ?? null,
      note: note.trim(),
      createdAt: now,
    },
  };
}

export async function deleteCaseNote(
  noteId: string,
  caseId: string,
): Promise<ActionResult> {
  const ctx = await getRequiredCompanyContext();
  requirePermission(ctx.user, "notes.delete");
  const admin = createAdminClient();

  // Only admins can delete notes (permission guard above covers managers/collectors)
  const { error } = await admin
    .from("case_notes")
    .delete()
    .eq("id", noteId)
    .eq("company_id", ctx.companyId);

  if (error) return { ok: false, error: "فشل حذف الملاحظة." };

  await recordAuditEvent({
    companyId: ctx.companyId,
    actorUserId: ctx.user.id,
    entityType: "case_notes",
    entityId: noteId,
    action: "note_delete",
    metadata: { caseId },
  });

  revalidatePath(`/cases/${caseId}`);
  return { ok: true, data: undefined };
}

// ---------------------------------------------------------------------------
// Collector assignment
// ---------------------------------------------------------------------------

export async function assignCaseCollector(
  caseId: string,
  assignedToUserId: string | null,
): Promise<ActionResult> {
  const ctx = await getRequiredCompanyContext();
  requirePermission(ctx.user, "cases.assign");
  const admin = createAdminClient();

  const { data: before } = await admin
    .from("collection_cases")
    .select("assigned_to_user_id")
    .eq("id", caseId)
    .eq("company_id", ctx.companyId)
    .single();

  if (!before) return { ok: false, error: "الحالة غير موجودة." };

  const { error } = await admin
    .from("collection_cases")
    .update({ assigned_to_user_id: assignedToUserId })
    .eq("id", caseId)
    .eq("company_id", ctx.companyId);

  if (error) return { ok: false, error: "فشل تحديث المحصّل المكلّف." };

  await recordAuditEvent({
    companyId: ctx.companyId,
    actorUserId: ctx.user.id,
    entityType: "collection_cases",
    entityId: caseId,
    action: "case_assign",
    beforeState: { assignedToUserId: before.assigned_to_user_id },
    afterState: { assignedToUserId },
  });

  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/cases");
  return { ok: true, data: undefined };
}

// ---------------------------------------------------------------------------
// Company users list (for collector assignment dropdown)
// ---------------------------------------------------------------------------

export async function getCompanyUsers(): Promise<CompanyUser[]> {
  const ctx = await getRequiredCompanyContext();
  requirePermission(ctx.user, "cases.assign");
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("company_users")
    .select("user_id, role")
    .eq("company_id", ctx.companyId)
    .eq("is_active", true);

  if (error || !data) return [];

  // Fetch emails from auth.users via admin API
  const userIds = data.map((d) => d.user_id);
  const emailMap = new Map<string, string>();
  for (const uid of userIds) {
    try {
      const { data: authUser } = await admin.auth.admin.getUserById(uid);
      if (authUser?.user?.email) emailMap.set(uid, authUser.user.email);
    } catch {
      // ignore individual lookup failures
    }
  }

  return data.map((d) => ({
    userId: d.user_id,
    email: emailMap.get(d.user_id) ?? null,
    role: d.role as import("@/types/domain").UserRole,
  }));
}

// ---------------------------------------------------------------------------
// Record payment
// ---------------------------------------------------------------------------

export async function recordPayment(
  caseId: string,
  paymentAmount: number,
): Promise<{ error?: string }> {
  const ctx = await getRequiredCompanyContext();
  const admin = createAdminClient();

  const { data: c, error: fetchErr } = await admin
    .from("collection_cases")
    .select("id, company_id, amount_due, amount_paid")
    .eq("id", caseId)
    .eq("company_id", ctx.companyId)
    .single();

  if (fetchErr || !c) return { error: "الحالة غير موجودة" };

  const newPaid = Number(c.amount_paid) + paymentAmount;
  const amountDue = Number(c.amount_due);

  let status: CaseStatus;
  if (newPaid >= amountDue) status = "paid";
  else if (newPaid > 0) status = "partial";
  else status = "pending";

  const { error } = await admin
    .from("collection_cases")
    .update({ amount_paid: newPaid, status })
    .eq("id", caseId)
    .eq("company_id", ctx.companyId);

  if (error) return { error: "فشل تسجيل الدفع" };

  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/cases");
  revalidatePath("/dashboard");
  return {};
}

// ---------------------------------------------------------------------------
// Update customer
// ---------------------------------------------------------------------------

export async function updateCustomer(
  customerId: string,
  data: { name: string | null; phone: string | null },
): Promise<{ error?: string }> {
  const ctx = await getRequiredCompanyContext();
  const admin = createAdminClient();

  const { error } = await admin
    .from("customers")
    .update({
      name: data.name || null,
      phone_e164: data.phone || null,
    })
    .eq("id", customerId)
    .eq("company_id", ctx.companyId);

  if (error) return { error: "فشل تحديث بيانات العميل" };

  revalidatePath("/cases");
  return {};
}
