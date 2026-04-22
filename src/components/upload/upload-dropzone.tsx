"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { uploadAndPreviewFile } from "@/app/(dashboard)/actions/imports";
import type { PreviewResult } from "@/types/imports";

type Props = {
  onPreviewReady: (result: Extract<PreviewResult, { ok: true }>) => void;
};

export function UploadDropzone({ onPreviewReady }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [isDragging, setIsDragging] = useState(false);

  function handleFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    startTransition(async () => {
      const result = await uploadAndPreviewFile(formData);
      if (result.ok) {
        onPreviewReady(result);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isPending && inputRef.current?.click()}
          className={[
            "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-16 text-center transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/30 hover:border-primary/50",
            isPending ? "pointer-events-none opacity-60" : "",
          ].join(" ")}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleChange}
            disabled={isPending}
          />
          <div className="mb-4 text-4xl">📊</div>
          {isPending ? (
            <>
              <p className="text-lg font-medium">جاري رفع وتحليل الملف...</p>
              <p className="mt-1 text-sm text-muted-foreground">
                قد يستغرق هذا بضع ثوانٍ
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium">اسحب ملف Excel أو CSV هنا</p>
              <p className="mt-1 text-sm text-muted-foreground">
                أو انقر لاختيار الملف
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                xlsx · xls · csv &mdash; بحد أقصى 20 ميجابايت
              </p>
            </>
          )}
        </div>

        {!isPending && (
          <div className="border-t p-4 text-center">
            <Button
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={isPending}
            >
              اختر ملفًا
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
