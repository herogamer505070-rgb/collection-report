"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ImportSummary } from "@/types/imports";

type Props = {
  summary: ImportSummary;
  onReset: () => void;
};

export function ImportReview({ summary, onReset }: Props) {
  const hasErrors = summary.errors.length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle>نتيجة الاستيراد</CardTitle>
            {summary.cancelled ? (
              <Badge variant="secondary">تم الإلغاء</Badge>
            ) : (
              <Badge variant="default">مكتمل</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="إجمالي الصفوف" value={summary.totalRows} />
            <StatCard label="مضاف" value={summary.inserted} color="green" />
            <StatCard label="محدّث" value={summary.updated} color="blue" />
            <StatCard label="غير صالح" value={summary.invalid} color="red" />
            <StatCard label="متخطى" value={summary.skipped} />
          </div>

          {hasErrors && (
            <div className="mt-6">
              <Alert variant="destructive">
                <AlertDescription>
                  يوجد {summary.errors.length} صف يحتوي على أخطاء
                </AlertDescription>
              </Alert>
              <div className="mt-3 max-h-48 overflow-auto rounded border">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-right font-medium">رقم الصف</th>
                      <th className="p-2 text-right font-medium">الخطأ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.errors.slice(0, 50).map((e, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2" dir="ltr">
                          {e.rowIndex}
                        </td>
                        <td className="p-2">{e.errors.join(" | ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {summary.errors.length > 50 && (
                  <p className="p-2 text-center text-xs text-muted-foreground">
                    وأخطاء أخرى ({summary.errors.length - 50} إضافية)
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <Button onClick={onReset}>رفع ملف جديد</Button>
            <Button
              variant="outline"
              onClick={() => {
                window.location.href = "/dashboard";
              }}
            >
              الذهاب للوحة التحكم
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: "green" | "blue" | "red";
}) {
  const colorClass =
    color === "green"
      ? "text-green-600"
      : color === "blue"
        ? "text-blue-600"
        : color === "red"
          ? "text-red-600"
          : "text-foreground";

  return (
    <div className="rounded-lg border p-4 text-center">
      <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
