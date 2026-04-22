import { getRequiredCompanyContext } from "@/lib/auth/get-company-context";
import { hasPermission } from "@/lib/auth/permissions";
import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MessageCircle, Shield, Users } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الإعدادات | نظام التحصيل",
  description: "إعدادات الشركة والنظام",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await getRequiredCompanyContext();

  const canManageTeam = hasPermission(ctx.user, "team.read");
  const canManageWhatsApp = hasPermission(ctx.user, "whatsapp.send"); // Assuming if they can send, they might see it. Wait, admin manages config. We'll show it for all, but page restricts to admin edits.
  const canReadAudit = hasPermission(ctx.user, "audit.read");

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">الإعدادات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          إدارة إعدادات الشركة والنظام
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {canManageTeam && (
          <Link href="/settings/team">
            <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/50">
              <CardHeader>
                <Users className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">إدارة الفريق</CardTitle>
                <CardDescription>
                  إضافة وإزالة أعضاء الفريق وتعديل صلاحياتهم
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        )}

        {canManageWhatsApp && (
          <Link href="/settings/whatsapp">
            <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/50">
              <CardHeader>
                <MessageCircle className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">إعداد واتساب</CardTitle>
                <CardDescription>
                  ربط وتفعيل إرسال رسائل واتساب للأعمال
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        )}

        {canReadAudit && (
          <Link href="/settings/audit">
            <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/50">
              <CardHeader>
                <Shield className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">سجل النشاطات</CardTitle>
                <CardDescription>
                  مراقبة ومراجعة الإجراءات التي تمت في النظام
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        )}
      </div>
    </section>
  );
}
