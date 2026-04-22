import { decryptToken } from "@/lib/crypto/tokens";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WhatsAppConfig = {
  phoneNumberId: string;
  accessToken: string;
  businessAccountId: string | null;
};

export type TemplateComponent = {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: string;
  text?: string;
  example?: { body_text?: string[][] };
};

export type WhatsAppTemplate = {
  id: string;
  name: string;
  language: string;
  status: "APPROVED" | "PENDING" | "REJECTED" | string;
  category: string;
  components: TemplateComponent[];
  /** Extracted body text for preview */
  bodyText: string | null;
  /** Placeholder variable count in body */
  variableCount: number;
};

export type SendMessageResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string; errorCode?: string };

// ---------------------------------------------------------------------------
// Config loader
// ---------------------------------------------------------------------------

/**
 * Loads and decrypts the active WhatsApp config for a company.
 * Returns null if no active config exists.
 */
export async function getWhatsAppConfig(
  companyId: string,
): Promise<WhatsAppConfig | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("whatsapp_configs")
    .select("phone_number_id, access_token_encrypted, business_account_id")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;

  let accessToken: string;
  try {
    accessToken = decryptToken(data.access_token_encrypted);
  } catch {
    console.error("[getWhatsAppConfig] Failed to decrypt token");
    return null;
  }

  return {
    phoneNumberId: data.phone_number_id,
    accessToken,
    businessAccountId: data.business_account_id ?? null,
  };
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

/**
 * Lists all APPROVED message templates from the Meta Business Account.
 * Falls back to an empty array if the WABA ID is missing or the call fails.
 */
export async function listWhatsAppTemplates(
  config: WhatsAppConfig,
): Promise<WhatsAppTemplate[]> {
  const wabaId = config.businessAccountId;
  if (!wabaId) return [];

  const url = new URL(
    `https://graph.facebook.com/v21.0/${wabaId}/message_templates`,
  );
  url.searchParams.set("status", "APPROVED");
  url.searchParams.set(
    "fields",
    "id,name,language,status,category,components",
  );
  url.searchParams.set("limit", "50");

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${config.accessToken}` },
      cache: "no-store",
    });
  } catch (e) {
    console.error("[listWhatsAppTemplates] Network error:", e);
    return [];
  }

  if (!res.ok) return [];

  const body = (await res.json()) as {
    data?: {
      id: string;
      name: string;
      language: string;
      status: string;
      category: string;
      components: TemplateComponent[];
    }[];
  };

  return (body.data ?? []).map((t) => {
    const bodyComp = t.components.find((c) => c.type === "BODY");
    const bodyText = bodyComp?.text ?? null;
    // Count {{n}} placeholders
    const variableCount = bodyText
      ? (bodyText.match(/\{\{\d+\}\}/g) ?? []).length
      : 0;
    return {
      id: t.id,
      name: t.name,
      language: t.language,
      status: t.status,
      category: t.category,
      components: t.components,
      bodyText,
      variableCount,
    };
  });
}

// ---------------------------------------------------------------------------
// Send
// ---------------------------------------------------------------------------

type TemplateParam = { type: "text"; text: string };

type SendPayload = {
  messaging_product: "whatsapp";
  to: string;
  type: "template";
  template: {
    name: string;
    language: { code: string };
    components?: {
      type: string;
      parameters: TemplateParam[];
    }[];
  };
};

/**
 * Sends a WhatsApp template message via the Meta Cloud API.
 * `variables` maps placeholder index (1-based) → value.
 */
export async function sendWhatsAppTemplateMessage(opts: {
  config: WhatsAppConfig;
  toPhone: string; // E.164 format, e.g. "+201012345678"
  templateName: string;
  languageCode: string;
  variables?: Record<number, string>; // { 1: "value", 2: "value" }
}): Promise<SendMessageResult> {
  const { config, toPhone, templateName, languageCode, variables = {} } = opts;

  // Normalise phone: strip leading + for Meta API
  const normalised = toPhone.startsWith("+") ? toPhone.slice(1) : toPhone;

  const varCount = Object.keys(variables).length;
  const payload: SendPayload = {
    messaging_product: "whatsapp",
    to: normalised,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(varCount > 0
        ? {
            components: [
              {
                type: "body",
                parameters: Object.entries(variables)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([, text]) => ({ type: "text", text })),
              },
            ],
          }
        : {}),
    },
  };

  const url = `https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }

  const data = (await res.json()) as {
    messages?: { id: string }[];
    error?: { message?: string; code?: number };
  };

  if (!res.ok || !data.messages?.length) {
    return {
      ok: false,
      error: data.error?.message ?? `HTTP ${res.status}`,
      errorCode: data.error?.code?.toString(),
    };
  }

  return { ok: true, messageId: data.messages[0]!.id };
}
