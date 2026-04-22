"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, AlertTriangle, CheckCircle } from "lucide-react";
import {
  getWhatsAppTemplates,
  sendWhatsAppMessage,
} from "@/app/(dashboard)/actions/whatsapp";
import type { WhatsAppTemplate } from "@/lib/whatsapp/client";

interface SendWhatsAppWidgetProps {
  caseId: string;
  /** E.164 phone number; widget is disabled if null */
  phoneE164: string | null;
  autoFocus?: boolean;
}

export function SendWhatsAppWidget({
  caseId,
  phoneE164,
  autoFocus = false,
}: SendWhatsAppWidgetProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [selectedName, setSelectedName] = useState<string>("");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [lastResult, setLastResult] = useState<
    { ok: boolean; message: string } | null
  >(null);

  // Auto-scroll when triggered from row-action
  useEffect(() => {
    if (autoFocus) {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [autoFocus]);

  const { data: templates = [], isLoading } = useQuery<WhatsAppTemplate[]>({
    queryKey: ["whatsapp-templates"],
    queryFn: () => getWhatsAppTemplates(),
    staleTime: 5 * 60 * 1000,
  });

  const selectedTemplate = templates.find((t) => t.name === selectedName);

  // Reset variables when template changes
  useEffect(() => {
    setVariables({});
    setLastResult(null);
  }, [selectedName]);

  const handleSend = () => {
    if (!selectedTemplate) return;
    startTransition(async () => {
      const result = await sendWhatsAppMessage({
        caseId,
        templateName: selectedTemplate.name,
        languageCode: selectedTemplate.language,
        variables,
      });
      if (result.ok) {
        toast.success("تم إرسال الرسالة بنجاح عبر واتساب.");
        setLastResult({ ok: true, message: "تم الإرسال بنجاح." });
        setSelectedName("");
      } else {
        toast.error(`فشل الإرسال: ${result.error}`);
        setLastResult({ ok: false, message: result.error });
      }
    });
  };

  // Render body preview with variable substitution
  const previewBody = selectedTemplate?.bodyText
    ? selectedTemplate.bodyText.replace(
        /\{\{(\d+)\}\}/g,
        (_, n) => variables[n] ? `[${variables[n]}]` : `{{${n}}}`,
      )
    : null;

  const isReady =
    !!selectedTemplate &&
    (selectedTemplate.variableCount === 0 ||
      Object.keys(variables).length >= selectedTemplate.variableCount);

  return (
    <div ref={sectionRef}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4 text-green-500" />
            إرسال رسالة واتساب
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Phone status */}
          {!phoneE164 ? (
            <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 px-3 py-2 text-sm text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              لا يوجد رقم هاتف مرتبط بهذا العميل. لا يمكن إرسال رسالة.
            </div>
          ) : (
            <p className="text-xs text-muted-foreground" dir="ltr">
              إرسال إلى: <span className="font-medium text-foreground">{phoneE164}</span>
            </p>
          )}

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : templates.length === 0 ? (
            <div className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
              لا توجد قوالب معتمدة. يرجى إعداد ربط واتساب أولاً.
            </div>
          ) : (
            <>
              {/* Template selector */}
              <div className="space-y-1.5">
                <Label htmlFor={`wa-template-${caseId}`}>القالب</Label>
                <Select
                  value={selectedName || undefined}
                  onValueChange={(v) => setSelectedName(v ?? "")}
                  disabled={!phoneE164 || isPending}
                >
                  <SelectTrigger id={`wa-template-${caseId}`}>
                    <SelectValue placeholder="اختر قالباً..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.name} value={t.name}>
                        <span>{t.name}</span>
                        <span className="ms-1.5 text-xs text-muted-foreground">
                          ({t.language})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dynamic variable inputs */}
              {selectedTemplate && selectedTemplate.variableCount > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    متغيرات الرسالة
                  </p>
                  {Array.from(
                    { length: selectedTemplate.variableCount },
                    (_, i) => i + 1,
                  ).map((n) => (
                    <div key={n} className="flex items-center gap-2">
                      <span className="w-16 shrink-0 rounded-md bg-muted px-2 py-1 text-center text-xs font-mono text-muted-foreground">
                        {`{{${n}}}`}
                      </span>
                      <Input
                        id={`wa-var-${caseId}-${n}`}
                        value={variables[n] ?? ""}
                        onChange={(e) =>
                          setVariables((prev) => ({
                            ...prev,
                            [n]: e.target.value,
                          }))
                        }
                        placeholder={`قيمة المتغير ${n}`}
                        disabled={isPending}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Message preview */}
              {previewBody && (
                <div className="rounded-lg border-s-2 border-green-500/50 bg-muted/30 px-3 py-2">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    معاينة
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {previewBody}
                  </p>
                </div>
              )}

              {/* Last result */}
              {lastResult && (
                <div
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                    lastResult.ok
                      ? "bg-green-500/10 text-green-700 dark:text-green-400"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {lastResult.ok ? (
                    <CheckCircle className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                  )}
                  {lastResult.message}
                </div>
              )}

              {/* Send button */}
              <Button
                id={`wa-send-${caseId}`}
                className="w-full"
                onClick={handleSend}
                disabled={!isReady || !phoneE164 || isPending}
              >
                <Send className="me-2 h-4 w-4" />
                {isPending ? "جارٍ الإرسال..." : "إرسال الرسالة"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
