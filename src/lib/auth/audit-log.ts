import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

type AuditEvent = {
  companyId: string;
  actorUserId: string;
  entityType: string;
  entityId?: string;
  action: string;
  beforeState?: Json;
  afterState?: Json;
  metadata?: Json;
};

export async function recordAuditEvent(event: AuditEvent): Promise<void> {
  const admin = createAdminClient();
  // Insert as a single object — supabase-js v2 accepts both shapes.
  await admin.from("audit_logs").insert({
    company_id: event.companyId,
    actor_user_id: event.actorUserId,
    entity_type: event.entityType,
    entity_id: event.entityId ?? null,
    action: event.action,
    before_state: event.beforeState ?? null,
    after_state: event.afterState ?? null,
    metadata: event.metadata ?? null,
  });
}
