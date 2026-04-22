import type { Metadata } from "next";
import { getRequiredCompanyContext } from "@/lib/auth/get-company-context";
import { hasPermission } from "@/lib/auth/permissions";
import { getAuditLogs, getAuditActionTypes } from "@/app/(dashboard)/actions/audit";
import { AuditTable } from "@/components/dashboard/audit/audit-table";
import { notFound } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";

export const metadata: Metadata = {
  title: "سجل النشاطات | نظام التحصيل",
  description: "عرض سجل النظام والنشاطات",
};

export const dynamic = "force-dynamic";

interface AuditPageProps {
  searchParams: Promise<{
    page?: string;
    action?: string;
    entity?: string;
  }>;
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const ctx = await getRequiredCompanyContext();
  
  if (!hasPermission(ctx.user, "audit.read")) {
    notFound();
  }

  const { page, action, entity } = await searchParams;
  const pageNum = parseInt(page ?? "1", 10) || 1;

  const [auditData, availableActions] = await Promise.all([
    getAuditLogs(pageNum, 30, {
      action: action,
      entityType: entity,
    }),
    getAuditActionTypes(),
  ]);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">سجل النشاطات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          عرض جميع الإجراءات التي تمت داخل نطاق الشركة
        </p>
      </div>

      <NuqsAdapter>
        <AuditTable initialData={auditData} availableActions={availableActions} />
      </NuqsAdapter>
    </section>
  );
}
