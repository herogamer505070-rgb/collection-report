"use server";

import { revalidatePath } from "next/cache";
import { getRequiredCompanyContext } from "@/lib/auth/get-company-context";
import { requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseWorkbook } from "@/lib/imports/parse-workbook";
import { suggestMapping } from "@/lib/imports/suggest-mapping";
import { normalizeRow } from "@/lib/imports/normalize-row";
import { upsertBatch } from "@/lib/imports/upsert-batch";
import { recordAuditEvent } from "@/lib/auth/audit-log";
import type {
  MappingRules,
  PreviewResult,
  RunImportResult,
} from "@/types/imports";

/**
 * Step 1: Upload file to Storage, parse headers + sample rows, create batch record.
 * Returns headers, suggested mapping, and sample data for the mapping assistant.
 */
export async function uploadAndPreviewFile(
  formData: FormData,
): Promise<PreviewResult> {
  const ctx = await getRequiredCompanyContext();
  requirePermission(ctx.user, "imports.manage");

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { ok: false, error: "لم يتم اختيار ملف." };
  }

  const name = file.name.toLowerCase();
  const fileKind: "xlsx" | "csv" = name.endsWith(".csv") ? "csv" : "xlsx";

  if (
    !name.endsWith(".xlsx") &&
    !name.endsWith(".xls") &&
    !name.endsWith(".csv")
  ) {
    return {
      ok: false,
      error: "نوع الملف غير مدعوم. يُرجى رفع ملف xlsx أو csv.",
    };
  }

  if (file.size > 20 * 1024 * 1024) {
    return { ok: false, error: "حجم الملف يتجاوز 20 ميجابايت." };
  }

  const admin = createAdminClient();

  // Upload to Supabase Storage
  const buffer = Buffer.from(await file.arrayBuffer());
  const batchId = crypto.randomUUID();
  const storagePath = `${ctx.companyId}/${batchId}/${file.name}`;

  const { error: uploadError } = await admin.storage
    .from("imports")
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return { ok: false, error: "فشل رفع الملف. حاول مرة أخرى." };
  }

  // Parse workbook
  let parsed;
  try {
    parsed = parseWorkbook(buffer, fileKind);
  } catch (err) {
    console.error("Parse error:", err);
    return {
      ok: false,
      error: "فشل قراءة الملف. تأكد من صحة تنسيق Excel أو CSV.",
    };
  }

  if (parsed.headers.length === 0) {
    return { ok: false, error: "الملف فارغ أو لا يحتوي على بيانات." };
  }

  // Create import batch record
  const { error: batchError } = await admin.from("import_batches").insert({
    id: batchId,
    company_id: ctx.companyId,
    uploaded_by_user_id: ctx.user.id,
    storage_path: storagePath,
    source_filename: file.name,
    total_rows: parsed.totalRows,
    status: "pending",
  });

  if (batchError) {
    console.error("Batch insert error:", batchError);
    return { ok: false, error: "حدث خطأ أثناء تسجيل عملية الاستيراد." };
  }

  const suggestedMapping = suggestMapping(parsed.headers);

  return {
    ok: true,
    batchId,
    headers: parsed.headers,
    sampleRows: parsed.rows.slice(0, 5),
    totalRows: parsed.totalRows,
    suggestedMapping,
  };
}

/**
 * Step 2: Run the import using the confirmed mapping rules.
 * Downloads the file from Storage, normalizes and upserts all rows in chunks.
 */
export async function runImport(
  batchId: string,
  mappingRules: MappingRules,
): Promise<RunImportResult> {
  const ctx = await getRequiredCompanyContext();
  requirePermission(ctx.user, "imports.manage");

  const admin = createAdminClient();

  // Verify batch belongs to this company
  const { data: batch, error: batchErr } = await admin
    .from("import_batches")
    .select("storage_path, status, source_filename")
    .eq("id", batchId)
    .eq("company_id", ctx.companyId)
    .single();

  if (batchErr || !batch) {
    return { ok: false, error: "لم يتم العثور على عملية الاستيراد." };
  }

  if (batch.status !== "pending") {
    return { ok: false, error: "عملية الاستيراد ليست في حالة انتظار." };
  }

  // Mark as processing
  await admin
    .from("import_batches")
    .update({ status: "processing" })
    .eq("id", batchId);

  await recordAuditEvent({
    companyId: ctx.companyId,
    actorUserId: ctx.user.id,
    entityType: "import_batches",
    entityId: batchId,
    action: "import_start",
    metadata: { filename: batch.source_filename, mappingRules },
  });

  // Download file from Storage
  const { data: fileBlob, error: downloadErr } = await admin.storage
    .from("imports")
    .download(batch.storage_path);

  if (downloadErr || !fileBlob) {
    await admin
      .from("import_batches")
      .update({
        status: "failed",
        error_report: { error: "فشل تحميل الملف من التخزين" },
      })
      .eq("id", batchId);
    return { ok: false, error: "فشل تحميل الملف. حاول مرة أخرى." };
  }

  const buffer = Buffer.from(await fileBlob.arrayBuffer());
  const fileKind: "xlsx" | "csv" = batch.storage_path.endsWith(".csv")
    ? "csv"
    : "xlsx";

  let parsed;
  try {
    parsed = parseWorkbook(buffer, fileKind);
  } catch (err) {
    console.error("Parse error during import:", err);
    await admin
      .from("import_batches")
      .update({ status: "failed", error_report: { error: "فشل قراءة الملف" } })
      .eq("id", batchId);
    return { ok: false, error: "فشل قراءة الملف." };
  }

  // Normalize all rows
  const normalizedRows = parsed.rows.map((raw) =>
    normalizeRow(raw, mappingRules),
  );

  // Run upsert in chunks with cooperative cancellation
  const summary = await upsertBatch(
    admin,
    normalizedRows,
    ctx.companyId,
    batchId,
  );

  // Update batch with final summary
  const finalStatus = summary.cancelled ? "cancelled" : "completed";
  await admin
    .from("import_batches")
    .update({
      status: finalStatus,
      valid_rows: summary.inserted + summary.updated,
      invalid_rows: summary.invalid,
      duplicate_rows: summary.duplicates,
      error_report:
        summary.errors.length > 0 ? { errors: summary.errors } : null,
    })
    .eq("id", batchId);

  await recordAuditEvent({
    companyId: ctx.companyId,
    actorUserId: ctx.user.id,
    entityType: "import_batches",
    entityId: batchId,
    action: summary.cancelled ? "import_cancelled" : "import_complete",
    afterState: {
      inserted: summary.inserted,
      updated: summary.updated,
      invalid: summary.invalid,
      skipped: summary.skipped,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/cases");

  return { ok: true, summary };
}

/**
 * Cancel a running import (cooperative — stops between chunks).
 */
export async function cancelImport(
  batchId: string,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getRequiredCompanyContext();
  requirePermission(ctx.user, "imports.manage");

  const admin = createAdminClient();

  const { error } = await admin
    .from("import_batches")
    .update({ status: "cancel_requested" })
    .eq("id", batchId)
    .eq("company_id", ctx.companyId)
    .in("status", ["pending", "processing"]);

  if (error) {
    return { ok: false, error: "فشل إلغاء الاستيراد." };
  }

  return { ok: true };
}
