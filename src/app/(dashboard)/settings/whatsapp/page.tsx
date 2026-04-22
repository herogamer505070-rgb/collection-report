import { getRequiredCompanyContext } from "@/lib/auth/get-company-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { WhatsAppSettingsForm } from "./whatsapp-form";

export const dynamic = "force-dynamic";

export default async function WhatsAppSettingsPage() {
  const ctx = await getRequiredCompanyContext();
  const admin = createAdminClient();

  const { data: config } = await admin
    .from("whatsapp_configs")
    .select(
      "phone_number_id, display_phone_number, verified_name, quality_rating, is_active, connected_at",
    )
    .eq("company_id", ctx.companyId)
    .maybeSingle();

  const isAdmin = ctx.user.role === "admin";

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">إعداد واتساب</h1>
        <p className="mt-1 text-muted-foreground">
          ربط حساب واتساب للأعمال بشركتك لإرسال رسائل التحصيل
        </p>
      </div>

      <WhatsAppSettingsForm
        existingConfig={
          config
            ? {
                phoneNumberId: config.phone_number_id,
                displayPhone: config.display_phone_number ?? null,
                verifiedName: config.verified_name ?? null,
                qualityRating: config.quality_rating ?? null,
                isActive: config.is_active,
                connectedAt: config.connected_at ?? null,
              }
            : null
        }
        isAdmin={isAdmin}
      />
    </section>
  );
}
