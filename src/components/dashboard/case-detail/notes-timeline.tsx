"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Trash2 } from "lucide-react";
import { formatDateTime } from "@/lib/format/dates";
import { createCaseNote, deleteCaseNote } from "@/app/(dashboard)/actions/cases";
import type { NoteRow } from "@/types/cases";

interface NotesTimelineProps {
  caseId: string;
  initialNotes: NoteRow[];
  /** Current user id — used to show delete button only on own notes (unless admin) */
  currentUserId: string;
  /** Whether the current user can delete any note */
  canDeleteAny: boolean;
  /** Whether scrolled into view on mount (from ?action=note) */
  autoFocus?: boolean;
}

export function NotesTimeline({
  caseId,
  initialNotes,
  currentUserId,
  canDeleteAny,
  autoFocus = false,
}: NotesTimelineProps) {
  const [notes, setNotes] = useState<NoteRow[]>(initialNotes);
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) {
      textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      textareaRef.current?.focus();
    }
  }, [autoFocus]);

  const handleSubmit = () => {
    if (!text.trim()) return;
    startTransition(async () => {
      const result = await createCaseNote(caseId, text);
      if (result.ok) {
        setNotes((prev) => [result.data, ...prev]);
        setText("");
        toast.success("تم حفظ الملاحظة.");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleDelete = (noteId: string) => {
    startTransition(async () => {
      const result = await deleteCaseNote(noteId, caseId);
      if (result.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        toast.success("تم حذف الملاحظة.");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          الملاحظات
          <span className="ms-auto rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
            {notes.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add note form */}
        <div className="space-y-2">
          <Textarea
            ref={textareaRef}
            id={`note-input-${caseId}`}
            placeholder="اكتب ملاحظتك هنا..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            disabled={isPending}
            className="resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Ctrl + Enter للإرسال السريع
            </span>
            <Button
              id={`submit-note-${caseId}`}
              size="sm"
              onClick={handleSubmit}
              disabled={isPending || !text.trim()}
            >
              {isPending ? "جارٍ الحفظ..." : "حفظ الملاحظة"}
            </Button>
          </div>
        </div>

        {/* Notes list */}
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            لا توجد ملاحظات بعد. أضف أول ملاحظة أعلاه.
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note, idx) => (
              <div key={note.id}>
                {idx > 0 && <Separator className="mb-3" />}
                <div className="group relative rounded-lg bg-muted/30 p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-foreground">
                        {note.authorEmail ?? "مستخدم"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(note.createdAt)}
                      </p>
                    </div>
                    {/* Delete button — show for admin (canDeleteAny) or own notes */}
                    {(canDeleteAny || note.userId === currentUserId) && (
                      <button
                        id={`delete-note-${note.id}`}
                        onClick={() => handleDelete(note.id)}
                        disabled={isPending}
                        className="invisible rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive group-hover:visible"
                        aria-label="حذف الملاحظة"
                        title="حذف"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {note.note}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Skeleton placeholder while the page loads */
export function NotesTimelineSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-28" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-4 w-48" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-2 rounded-lg bg-muted/30 p-3">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
