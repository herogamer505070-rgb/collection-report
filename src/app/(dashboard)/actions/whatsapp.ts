"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredCompanyContext } from "@/lib/auth/get-company-context";
import { requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptToken } from "@/lib/crypto/tokens";
import { verifyWhatsAppConfig } from "@/lib/whatsapp/verify-config";
import {
  getWhatsAppConfig,
  listWhatsAppTemplates,
  sendWhatsAppTemplateMessage,
  type WhatsAppTemplate,
  type SendMessageResult,
} from "@/lib/whatsapp/client";
import { recordAuditEvent } from "@/lib/auth/audit-log";
import type { ActionResult } from "@/types/cases";

// ---------------------------------------------------------------------------
// Connect / Disconnect (existing)
// ---------------------------------------------------------------------------

const ConnectSchema = z.object({
  phoneNumberId: z.string().min(1, "Phone Number ID مطلوب"),
  businessAccountId: z.string().optional(),
  accessToken: z.string().min(1, "Access Token مطلوب"),
  appSecret: z.string().min(1, "App Secret مطلوب"),
});

export type ConnectWhatsAppResult =
  | { success: true; displayPhone: string; verifiedName: string }
  | { success: false; error: string };

export async function connectWhatsAppConfig(
  formData: FormData,
): Promise<ConnectWhatsAppResult> {
  const ctx = await getRequiredCompanyContext();
  requirePermission(ctx.user, "whatsapp.configure");

  const parsed = ConnectSchema.safeParse({
    phoneNumberId: formData.get("phoneNumberId"),
    businessAccountId: formData.get("businessAccountId") || undefined,
    accessToken: formData.get("accessToken"),
    appSecret: formData.get("appSecret"),
  });
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "بيانات غير صالحة";
    return { success: false, error: firstError };
  }

  const { phoneNumberId, businessAccountId, accessToken, appSecret } =
    parsed.data;

  const verification = await verifyWhatsAppConfig({ phoneNumberId, accessToken });
  if (!verification.ok) {
    return { success: false, error: `فشل التحقق من بيانات واتساب: ${verification.error}` };
  }

  const accessTokenEncrypted = encryptToken(accessToken);
  const appSecretEncrypted = encryptToken(appSecret);
  const verifyToken = crypto.randomUUID();

  const admin = createAdminClient();
  const { error: upsertError } = await admin.from("whatsapp_configs").upsert(
    {
      company_id: ctx.companyId,
      phone_number_id: phoneNumberId,
      business_account_id: businessAccountId ?? null,
      access_token_encrypted: accessTokenEncrypted,
      app_secret_encrypted: appSecretEncrypted,
      verify_token: verifyToken,
      display_phone_number: verification.displayPhone ?? null,
      verified_name: verification.verifiedName ?? null,
      quality_rating: verification.qualityRating ?? null,
      is_active: true,
      connected_at: new Date().toISOString(),
    },
    { onConflict: "company_id" },
  );

  if (upsertError) {
    console.error("WhatsApp config upsert error:", upsertError);
    return { success: false, error: "حدث خطأ أثناء حفظ الإعدادات." };
  }

  await recordAuditEvent({
    companyId: ctx.companyId,
    actorUserId: ctx.user.id,
    entityType: "whatsapp_configs",
    action: "connect",
    afterState: { phoneNumberId, displayPhone: verification.displayPhone, verifiedName: verification.verifiedName },
  });

  revalidatePath("/settings/whatsapp");
  return {
    success: true,
    displayPhone: verification.displayPhone ?? phoneNumberId,
    verifiedName: verification.verifiedName ?? "",
  };
}

export type DisconnectWhatsAppResult =
  | { success: true }
  | { success: false; error: string };

export async function disconnectWhatsAppConfig(): Promise<DisconnectWhatsAppResult> {
  const ctx = await getRequiredCompanyContext();
  requirePermission(ctx.user, "whatsapp.configure");

  const admin = createAdminClient();
  const { data: current } = await admin
    .from("whatsapp_configs")
    .select("phone_number_id, display_phone_number")
    .eq("company_id", ctx.companyId)
    .single();

  const { error } = await admin
    .from("whatsapp_configs")
    .update({ is_active: false })
    .eq("company_id", ctx.companyId);

  if (error) {
    console.error("WhatsApp disconnect error:", error);
    return { success: false, error: "حدث خطأ أثناء قطع الاتصال." };
  }

  await recordAuditEvent({
    companyId: ctx.companyId,
    actorUserId: ctx.user.id,
    entityType: "whatsapp_configs",
    action: "disconnect",
    beforeState: { phoneNumberId: current?.phone_number_id ?? null, displayPhone: current?.display_phone_number ?? null },
  });

  revalidatePath("/settings/whatsapp");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Templates — server-cached fetch
// ---------------------------------------------------------------------------

export async function getWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
  const ctx = await getRequiredCompanyContext();
  requirePermission(ctx.user, "whatsapp.send");

  const config = await getWhatsAppConfig(ctx.companyId);
  if (!config) return [];

  return listWhatsAppTemplates(config);
}

// ---------------------------------------------------------------------------
// Send message
// ---------------------------------------------------------------------------

const SendSchema = z.object({
  caseId: z.string().uuid("معرّف الحالة غير صالح"),
  templateName: z.string().min(1, "يجب اختيار قالب"),
  languageCode: z.string().min(2, "رمز اللغة مطلوب"),
  variables: z.record(z.string(), z.string()).optional(),
});

export async function sendWhatsAppMessage(input: {
  caseId: string;
  templateName: string;
  languageCode: string;
  variables?: Record<string, string>;
}): Promise<ActionResult<{ logId: string; messageId: string }>> {
  const ctx = await getRequiredCompanyContext();
  requirePermission(ctx.user, "whatsapp.send");

  const parsed = SendSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }

  const {
    caseId,
    templateName,
    languageCode,
    variables: rawVars,
  } = parsed.data;
  const variables: Record<string, string> = rawVars ?? {};

  // Load WhatsApp config
  const config = await getWhatsAppConfig(ctx.companyId);
  if (!config) {
    return { ok: false, error: "لم يتم ربط واتساب. يرجى الذهاب إلى الإعدادات." };
  }

  // Resolve case + customer phone
  const admin = createAdminClient();
  const { data: caseRow } = await admin
    .from("collection_cases")
    .select("id, customer_id, assigned_to_user_id, customers!inner(phone_e164)")
    .eq("id", caseId)
    .eq("company_id", ctx.companyId)
    .single();

  if (!caseRow) {
    return { ok: false, error: "الحالة غير موجودة." };
  }

  // Collector scoping
  if (
    ctx.user.role === "collector" &&
    (caseRow as { assigned_to_user_id: string | null }).assigned_to_user_id !== ctx.user.id
  ) {
    return { ok: false, error: "ليس لديك صلاحية إرسال رسالة لهذه الحالة." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const phone = ((caseRow as any).customers as { phone_e164: string | null } | null)?.phone_e164;
  if (!phone) {
    return { ok: false, error: "لا يوجد رقم هاتف مرتبط بهذا العميل." };
  }

  // Render body preview for logging
  let renderedMessage: string = `[${templateName}]`;
  const varEntries = Object.entries(variables);
  if (varEntries.length > 0) {
    // Best-effort preview — actual rendering is done by Meta
    let preview: string = renderedMessage;
    for (const [k, v] of varEntries) {
      preview = preview.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v);
    }
    renderedMessage = preview;
  }

  // Send via Meta Cloud API
  const numericVars: Record<number, string> = {};
  for (const [k, v] of varEntries) {
    const n = parseInt(k, 10);
    if (!isNaN(n)) numericVars[n] = v;
  }

  const sendResult: SendMessageResult = await sendWhatsAppTemplateMessage({
    config,
    toPhone: phone,
    templateName,
    languageCode,
    variables: numericVars,
  });

  // Need customer_id for the FK
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customerId = (caseRow as any).customer_id as string;

  // Log to whatsapp_message_logs regardless of outcome
  const logId = crypto.randomUUID();
  const metaMessageId = sendResult.ok ? sendResult.messageId : null;
  const { error: logError } = await admin.from("whatsapp_message_logs").insert({
    id: logId,
    company_id: ctx.companyId,
    case_id: caseId,
    customer_id: customerId ?? "00000000-0000-0000-0000-000000000000",
    sent_by_user_id: ctx.user.id,
    meta_message_id: metaMessageId,
    template_name: templateName,
    message_type: "template" as const,
    template_variables: varEntries.length > 0
      ? (Object.fromEntries(varEntries) as import("@/types/database").Json)
      : null,
    rendered_message: renderedMessage,
    status: sendResult.ok ? ("sent" as const) : ("failed" as const),
    error_code: sendResult.ok ? null : (sendResult.errorCode ?? null),
    error_message: sendResult.ok ? null : sendResult.error,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (logError) {
    console.error("[sendWhatsAppMessage] Failed to write log:", logError);
  }

  if (!sendResult.ok) {
    return { ok: false, error: sendResult.error };
  }

  await recordAuditEvent({
    companyId: ctx.companyId,
    actorUserId: ctx.user.id,
    entityType: "whatsapp_message_logs",
    entityId: logId,
    action: "message_send",
    metadata: { caseId, templateName, messageId: sendResult.messageId },
  });

  // Update last_contacted_at on the case
  await admin
    .from("collection_cases")
    .update({ last_contacted_at: new Date().toISOString() })
    .eq("id", caseId)
    .eq("company_id", ctx.companyId);

  revalidatePath(`/cases/${caseId}`);
  return { ok: true, data: { logId, messageId: sendResult.messageId } };
}
