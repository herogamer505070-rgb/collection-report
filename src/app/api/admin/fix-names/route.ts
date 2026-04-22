import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Common Arabic/English column names for customer name in Excel files
const NAME_KEYS = [
  "اسم العميل",
  "العميل",
  "الاسم",
  "اسم",
  "الاسم الكامل",
  "صاحب العقد",
  "المالك",
  "customer name",
  "client name",
  "name",
  "customer_name",
  "client_name",
];

function extractName(rawRow: Record<string, unknown>): string | null {
  for (const key of NAME_KEYS) {
    const val = rawRow[key];
    if (val != null && String(val).trim() !== "") {
      return String(val).trim();
    }
  }
  // Fuzzy: find any key containing "اسم" or "name"
  for (const key of Object.keys(rawRow)) {
    if (/اسم|name/i.test(key)) {
      const val = rawRow[key];
      if (val != null && String(val).trim() !== "") {
        return String(val).trim();
      }
    }
  }
  return null;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Get all cases with their customer_id and raw_row
  const { data: cases, error } = await admin
    .from("collection_cases")
    .select("id, customer_id, raw_row");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let updated = 0;
  let skipped = 0;
  const sampleKeys: string[] = [];

  for (const c of cases ?? []) {
    if (!c.raw_row || typeof c.raw_row !== "object") {
      skipped++;
      continue;
    }

    const raw = c.raw_row as Record<string, unknown>;

    // Collect sample keys from first case for debugging
    if (sampleKeys.length === 0) {
      sampleKeys.push(...Object.keys(raw).slice(0, 20));
    }

    const name = extractName(raw);
    if (!name) {
      skipped++;
      continue;
    }

    const { error: updateErr } = await admin
      .from("customers")
      .update({ name })
      .eq("id", c.customer_id)
      .is("name", null); // only update if name is still null

    if (!updateErr) updated++;
  }

  return NextResponse.json({
    ok: true,
    total: cases?.length ?? 0,
    updated,
    skipped,
    sampleKeys, // so you can see what columns exist in your Excel
  });
}
