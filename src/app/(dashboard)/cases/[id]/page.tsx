import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getCaseDetails } from "@/app/(dashboard)/actions/cases";
import { getRequiredCompanyContext } from "@/lib/auth/get-company-context";
import { hasPermission } from "@/lib/auth/permissions";
import { CaseSummary } from "@/components/dashboard/case-detail/case-summary";
import { NotesTimeline } from "@/components/dashboard/case-detail/notes-timeline";
import { WhatsAppLogTimeline } from "@/components/dashboard/case-detail/whatsapp-log-timeline";
import { SendWhatsAppWidget } from "@/components/dashboard/case-detail/send-whatsapp-widget";

export const dynamic = "force-dynamic";

interface CasePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ action?: string }>;
}

export async function generateMetadata({
  params,
}: CasePageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `تفاصيل الحالة | نظام التحصيل`,
    description: `عرض وإدارة حالة التحصيل ${id}`,
  };
}

export default async function CaseDetailPage({
  params,
  searchParams,
}: CasePageProps) {
  const { id } = await params;
  const { action } = await searchParams;

  // Both calls re-use the same cached session
  const [ctx, caseDetail] = await Promise.all([
    getRequiredCompanyContext(),
    getCaseDetails(id),
  ]);

  if (!caseDetail) notFound();

  const canAssign = hasPermission(ctx.user, "cases.assign");
  const canDeleteNote = hasPermission(ctx.user, "notes.delete");
  const canSendWhatsApp = hasPermission(ctx.user, "whatsapp.send");

  return (
    <section className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground" aria-label="مسار التنقل">
        <Link
          href="/dashboard/cases"
          className="transition-colors hover:text-foreground"
        >
          حالات التحصيل
        </Link>
        <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
        <span className="text-foreground" dir="ltr">
          {caseDetail.externalCaseId ?? caseDetail.contractNumber ?? id.slice(0, 8)}
        </span>
      </nav>

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {caseDetail.customer.name ?? "عميل غير معروف"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {caseDetail.projectName && (
            <span>{caseDetail.projectName} · </span>
          )}
          {caseDetail.contractNumber && (
            <span dir="ltr">{caseDetail.contractNumber}</span>
          )}
        </p>
      </div>

      {/* Summary cards */}
      <CaseSummary caseDetail={caseDetail} canAssign={canAssign} />

      {/* Notes + send widget + WA log */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <NotesTimeline
          caseId={id}
          initialNotes={caseDetail.notes}
          currentUserId={ctx.user.id}
          canDeleteAny={canDeleteNote}
          autoFocus={action === "note"}
        />
        <div className="space-y-6">
          {canSendWhatsApp && (
            <SendWhatsAppWidget
              caseId={id}
              phoneE164={caseDetail.customer.phoneE164}
              autoFocus={action === "whatsapp"}
            />
          )}
          <WhatsAppLogTimeline logs={caseDetail.whatsappLogs} />
        </div>
      </div>
    </section>
  );
}
