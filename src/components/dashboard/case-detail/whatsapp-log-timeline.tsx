import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDateTime } from "@/lib/format/dates";
import type { WhatsAppLogRow } from "@/types/cases";
import { MessageCircle, CheckCircle, XCircle, Clock } from "lucide-react";

interface WhatsAppLogTimelineProps {
  logs: WhatsAppLogRow[];
}

const STATUS_CONFIG = {
  sent: {
    label: "مُرسَل",
    icon: CheckCircle,
    class: "text-green-600",
    bg: "bg-green-600/10",
  },
  delivered: {
    label: "تم التسليم",
    icon: CheckCircle,
    class: "text-blue-600",
    bg: "bg-blue-600/10",
  },
  read: {
    label: "مقروء",
    icon: CheckCircle,
    class: "text-primary",
    bg: "bg-primary/10",
  },
  failed: {
    label: "فشل",
    icon: XCircle,
    class: "text-destructive",
    bg: "bg-destructive/10",
  },
  pending: {
    label: "في الانتظار",
    icon: Clock,
    class: "text-yellow-600",
    bg: "bg-yellow-600/10",
  },
} as const;

function StatusChip({ status }: { status: WhatsAppLogRow["status"] }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? {
    label: status,
    icon: Clock,
    class: "text-muted-foreground",
    bg: "bg-muted",
  };
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.class} ${cfg.bg}`}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

export function WhatsAppLogTimeline({ logs }: WhatsAppLogTimelineProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-4 w-4 text-green-500" />
          سجل واتساب
          <span className="ms-auto rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
            {logs.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            لا توجد رسائل واتساب مرسلة لهذه الحالة.
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log, idx) => (
              <div key={log.id}>
                {idx > 0 && <Separator className="mb-3" />}
                <div className="space-y-2 rounded-lg bg-muted/30 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <StatusChip status={log.status} />
                      {log.templateName && (
                        <span
                          className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground"
                          dir="ltr"
                        >
                          {log.templateName}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>

                  {log.renderedMessage && (
                    <p className="whitespace-pre-wrap rounded border-s-2 border-green-500/40 bg-background ps-3 text-sm leading-relaxed text-foreground">
                      {log.renderedMessage}
                    </p>
                  )}

                  {log.errorMessage && (
                    <p className="rounded bg-destructive/5 px-2 py-1 text-xs text-destructive" dir="ltr">
                      {log.errorCode && (
                        <span className="me-1 font-mono">[{log.errorCode}]</span>
                      )}
                      {log.errorMessage}
                    </p>
                  )}

                  {log.sentByEmail && (
                    <p className="text-xs text-muted-foreground">
                      أرسله: {log.sentByEmail}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
