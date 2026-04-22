import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/format/currency";
import { formatDate, formatDateTime } from "@/lib/format/dates";
import type { CaseDetail } from "@/types/cases";
import { AssignCollectorWidget } from "./assign-collector-widget";
import { RecordPaymentDialog } from "./record-payment-dialog";
import { EditCustomerDialog } from "./edit-customer-dialog";

interface CaseSummaryProps {
  caseDetail: CaseDetail;
  canAssign: boolean;
}

function InfoRow({
  label,
  value,
  ltr = false,
}: {
  label: string;
  value: React.ReactNode;
  ltr?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={`text-sm font-medium text-foreground ${ltr ? "dir-ltr text-left" : ""}`}
        dir={ltr ? "ltr" : undefined}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

export function CaseSummary({ caseDetail: c, canAssign }: CaseSummaryProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Customer card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">بيانات العميل</CardTitle>
            <EditCustomerDialog
              customerId={c.customer.id}
              initialName={c.customer.name}
              initialPhone={c.customer.phoneE164}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <InfoRow label="الاسم" value={c.customer.name} />
          <InfoRow
            label="رقم الهاتف الرئيسي"
            value={c.customer.phoneE164}
            ltr
          />
          {c.customer.alternatePhone && (
            <InfoRow label="رقم بديل" value={c.customer.alternatePhone} ltr />
          )}
          {c.customer.nationalId && (
            <InfoRow label="الرقم القومي" value={c.customer.nationalId} ltr />
          )}
          {c.customer.externalCustomerId && (
            <InfoRow
              label="معرّف العميل الخارجي"
              value={c.customer.externalCustomerId}
              ltr
            />
          )}
        </CardContent>
      </Card>

      {/* Case financials card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">تفاصيل الحالة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">الحالة</span>
            <StatusBadge status={c.status} />
          </div>
          <Separator />
          <InfoRow
            label="المبلغ المستحق"
            value={
              <span className="text-lg font-bold text-destructive">
                {formatCurrency(c.amountDue, c.currencyCode)}
              </span>
            }
          />
          <InfoRow
            label="المبلغ المسدد"
            value={
              <span className="text-green-600">
                {formatCurrency(c.amountPaid, c.currencyCode)}
              </span>
            }
          />
          <InfoRow
            label="الرصيد المتبقي"
            value={
              <span
                className={
                  c.balance > 0 ? "text-destructive" : "text-green-600"
                }
              >
                {formatCurrency(c.balance, c.currencyCode)}
              </span>
            }
          />
          <RecordPaymentDialog
            caseId={c.id}
            amountDue={c.amountDue}
            amountPaid={c.amountPaid}
            currencyCode={c.currencyCode}
          />
          <Separator />
          <InfoRow label="تاريخ الاستحقاق" value={formatDate(c.dueDate)} />
          {c.agingDays !== null && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              متأخر منذ {c.agingDays} يوم
            </div>
          )}
        </CardContent>
      </Card>

      {/* Case metadata card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">معلومات المشروع</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <InfoRow label="المشروع" value={c.projectName} />
          <InfoRow label="الوحدة" value={c.unitCode} ltr />
          <InfoRow label="رقم العقد" value={c.contractNumber} ltr />
          <InfoRow label="رقم الحالة الخارجي" value={c.externalCaseId} ltr />
          <Separator />
          <InfoRow
            label="آخر تواصل"
            value={formatDateTime(c.lastContactedAt)}
          />
          <InfoRow label="تاريخ الإنشاء" value={formatDate(c.createdAt)} />
          <InfoRow label="آخر تحديث" value={formatDate(c.updatedAt)} />
          {/* Collector assignment */}
          {canAssign && (
            <>
              <Separator />
              <AssignCollectorWidget
                caseId={c.id}
                currentAssignedId={c.assignedToUserId}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
