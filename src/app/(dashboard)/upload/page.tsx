"use client";

import { useState } from "react";
import { UploadDropzone } from "@/components/upload/upload-dropzone";
import { MappingAssistant } from "@/components/upload/mapping-assistant";
import { ImportReview } from "@/components/upload/import-review";
import type { MappingRules, ImportSummary } from "@/types/imports";

type Step = "upload" | "mapping" | "complete";

type PreviewState = {
  batchId: string;
  headers: string[];
  sampleRows: Record<string, unknown>[];
  totalRows: number;
  suggestedMapping: MappingRules;
};

export default function UploadPage() {
  const [step, setStep] = useState<Step>("upload");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  function handlePreviewReady(result: PreviewState) {
    setPreview(result);
    setStep("mapping");
  }

  function handleImportComplete(importSummary: ImportSummary) {
    setSummary(importSummary);
    setStep("complete");
  }

  function handleReset() {
    setPreview(null);
    setSummary(null);
    setStep("upload");
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">رفع بيانات</h1>
        <p className="mt-1 text-muted-foreground">
          استيراد ملفات Excel أو CSV وربط الأعمدة بحقول النظام
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        <StepBadge
          active={step === "upload"}
          done={step !== "upload"}
          num={1}
          label="رفع الملف"
        />
        <div className="h-px w-8 bg-border" />
        <StepBadge
          active={step === "mapping"}
          done={step === "complete"}
          num={2}
          label="ربط الأعمدة"
        />
        <div className="h-px w-8 bg-border" />
        <StepBadge
          active={step === "complete"}
          done={false}
          num={3}
          label="النتيجة"
        />
      </div>

      {step === "upload" && (
        <UploadDropzone onPreviewReady={handlePreviewReady} />
      )}

      {step === "mapping" && preview && (
        <MappingAssistant
          batchId={preview.batchId}
          headers={preview.headers}
          sampleRows={preview.sampleRows}
          totalRows={preview.totalRows}
          initialMapping={preview.suggestedMapping}
          onImportComplete={handleImportComplete}
        />
      )}

      {step === "complete" && summary && (
        <ImportReview summary={summary} onReset={handleReset} />
      )}
    </section>
  );
}

function StepBadge({
  num,
  label,
  active,
  done,
}: {
  num: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={[
          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
          active
            ? "bg-primary text-primary-foreground"
            : done
              ? "bg-green-500 text-white"
              : "bg-muted text-muted-foreground",
        ].join(" ")}
      >
        {done ? "✓" : num}
      </span>
      <span
        className={
          active ? "font-medium text-foreground" : "text-muted-foreground"
        }
      >
        {label}
      </span>
    </div>
  );
}
