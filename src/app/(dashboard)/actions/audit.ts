"use server";

import { getRequiredCompanyContext } from "@/lib/auth/get-company-context";
import { requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type AuditLogEntry = {
  id: string;
  actorUserId: string | null;
  actorEmail: string | null;
  entityType: string;
  entityId: string | null;
  action: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type PaginatedAuditResult = {
  rows: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
};

export async function getAuditLogs(
  page = 1,
  pageSize = 30,
  filter?: { action?: string; entityType?: string },
): Promise<PaginatedAuditResult> {
  const ctx = await getRequiredCompanyContext();
  requirePermission(ctx.user, "audit.read");
  const admin = createAdminClient();

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = admin
    .from("audit_logs")
    .select("*", { count: "exact" })
    .eq("company_id", ctx.companyId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filter?.action) query = query.eq("action", filter.action);
  if (filter?.entityType) query = query.eq("entity_type", filter.entityType);

  const { data, count, error } = await query;
  if (error || !data) return { rows: [], total: 0, page, pageSize };

  // Resolve actor emails (batch)
  const actorIds = [...new Set(data.map((r) => r.actor_user_id).filter(Boolean))] as string[];
  const emailMap = new Map<string, string>();
  await Promise.allSettled(
    actorIds.map(async (uid) => {
      const { data: u } = await admin.auth.admin.getUserById(uid);
      if (u?.user?.email) emailMap.set(uid, u.user.email);
    }),
  );

  const rows: AuditLogEntry[] = data.map((r) => ({
    id: r.id,
    actorUserId: r.actor_user_id,
    actorEmail: r.actor_user_id ? (emailMap.get(r.actor_user_id) ?? null) : null,
    entityType: r.entity_type,
    entityId: r.entity_id,
    action: r.action,
    beforeState: r.before_state as Record<string, unknown> | null,
    afterState: r.after_state as Record<string, unknown> | null,
    metadata: r.metadata as Record<string, unknown> | null,
    createdAt: r.created_at,
  }));

  return { rows, total: count ?? 0, page, pageSize };
}

// Distinct action values for filter dropdown
export async function getAuditActionTypes(): Promise<string[]> {
  const ctx = await getRequiredCompanyContext();
  requirePermission(ctx.user, "audit.read");
  const admin = createAdminClient();

  const { data } = await admin
    .from("audit_logs")
    .select("action")
    .eq("company_id", ctx.companyId);

  const unique = [...new Set((data ?? []).map((r) => r.action))].sort();
  return unique;
}
