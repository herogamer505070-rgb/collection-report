import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import type { NormalizedRow, ImportSummary } from "@/types/imports";
import { validateRow } from "./validate-row";

const CHUNK_SIZE = 100;

type CaseStatus = "pending" | "paid" | "partial" | "overdue" | "invalid";

function deriveStatus(
  amountDue: number,
  amountPaid: number,
  dueDate: string | null,
): CaseStatus {
  if (amountDue <= 0) return "invalid";
  if (amountPaid >= amountDue) return "paid";
  if (amountPaid > 0) return "partial";
  // amountPaid === 0
  if (dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    if (due < today) return "overdue";
  }
  return "pending";
}

function generateFingerprint(companyId: string, row: NormalizedRow): string {
  const parts = [
    companyId,
    row.contractNumber ?? "",
    row.unitCode ?? "",
    row.projectName ?? "",
    row.dueDate ?? "",
    row.amountDue.toFixed(2),
    row.paymentType,
  ];
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

/**
 * Upserts a batch of normalized rows into customers + collection_cases.
 * Checks for cancel_requested status between chunks.
 *
 * @param admin  - Supabase admin client (bypasses RLS)
 * @param rows   - All normalized rows
 * @param companyId
 * @param batchId - import_batches.id; used for cancel check + linking cases
 */
export async function upsertBatch(
  admin: SupabaseClient<Database>,
  rows: NormalizedRow[],
  companyId: string,
  batchId: string,
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    totalRows: rows.length,
    inserted: 0,
    updated: 0,
    invalid: 0,
    duplicates: 0,
    skipped: 0,
    cancelled: false,
    errors: [],
  };

  for (let chunkStart = 0; chunkStart < rows.length; chunkStart += CHUNK_SIZE) {
    // Check for cancellation between chunks
    const { data: batch } = await admin
      .from("import_batches")
      .select("status")
      .eq("id", batchId)
      .single();

    if (batch?.status === "cancel_requested") {
      await admin
        .from("import_batches")
        .update({ status: "cancelled" })
        .eq("id", batchId);
      summary.cancelled = true;
      break;
    }

    const chunk = rows.slice(chunkStart, chunkStart + CHUNK_SIZE);

    for (let i = 0; i < chunk.length; i++) {
      const row = chunk[i]!;
      const rowIndex = chunkStart + i + 1;

      const validation = validateRow(row);
      if (validation.status === "invalid") {
        summary.invalid++;
        summary.errors.push({ rowIndex, errors: validation.errors });
        continue;
      }
      if (validation.status === "skipped") {
        summary.skipped++;
        continue;
      }

      // -------------------------------------------------------
      // Upsert customer
      // -------------------------------------------------------
      let customerId: string;

      if (row.externalCustomerId) {
        const { data: existingCustomer, error: custErr } = await admin
          .from("customers")
          .upsert(
            {
              company_id: companyId,
              external_customer_id: row.externalCustomerId,
              name: row.customerName,
              phone_e164: row.phoneE164,
            },
            {
              onConflict: "company_id,external_customer_id",
              ignoreDuplicates: false,
            },
          )
          .select("id")
          .single();

        if (custErr || !existingCustomer) {
          summary.invalid++;
          summary.errors.push({ rowIndex, errors: ["فشل حفظ بيانات العميل"] });
          continue;
        }
        customerId = existingCustomer.id;
      } else {
        // No external ID: create a new customer row
        const { data: newCustomer, error: custErr } = await admin
          .from("customers")
          .insert({
            company_id: companyId,
            name: row.customerName,
            phone_e164: row.phoneE164,
          })
          .select("id")
          .single();

        if (custErr || !newCustomer) {
          summary.invalid++;
          summary.errors.push({ rowIndex, errors: ["فشل إنشاء سجل العميل"] });
          continue;
        }
        customerId = newCustomer.id;
      }

      // -------------------------------------------------------
      // Upsert collection case
      // -------------------------------------------------------
      const fingerprint = generateFingerprint(companyId, row);
      const identitySource: "external_id" | "fingerprint" = row.externalCaseId
        ? "external_id"
        : "fingerprint";

      const casePayload = {
        company_id: companyId,
        customer_id: customerId,
        import_batch_id: batchId,
        external_case_id: row.externalCaseId,
        case_fingerprint: fingerprint,
        case_identity_source: identitySource,
        contract_number: row.contractNumber,
        unit_code: row.unitCode,
        project_name: row.projectName,
        amount_due: row.amountDue,
        amount_paid: row.amountPaid,
        payment_type: row.paymentType,
        due_date: row.dueDate,
        status: deriveStatus(row.amountDue, row.amountPaid, row.dueDate),
        raw_row: row.rawRow as unknown as Json,
      };

      let isNew = false;
      let upsertError: unknown = null;

      if (row.externalCaseId) {
        const { error } = await admin
          .from("collection_cases")
          .upsert(casePayload, {
            onConflict: "company_id,external_case_id",
            ignoreDuplicates: false,
          });
        upsertError = error;
        isNew = !error;
      } else {
        const { error } = await admin
          .from("collection_cases")
          .upsert(casePayload, {
            onConflict: "company_id,case_fingerprint",
            ignoreDuplicates: false,
          });
        upsertError = error;
        isNew = !error;
      }

      if (upsertError) {
        summary.invalid++;
        summary.errors.push({ rowIndex, errors: ["فشل حفظ الحالة"] });
      } else if (isNew) {
        summary.inserted++;
      } else {
        summary.updated++;
      }
    }
  }

  return summary;
}
