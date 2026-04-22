import type { MappingRules, SemanticField } from "@/types/imports";

type FieldPattern = {
  field: SemanticField;
  patterns: RegExp[];
};

const FIELD_PATTERNS: FieldPattern[] = [
  {
    field: "customerName",
    patterns: [
      /^customer$/i,
      /^client$/i,
      /اسم.*عميل/i,
      /عميل.*اسم/i,
      /client.*name/i,
      /customer.*name/i,
      /^name$/i,
      /^اسم$/i,
      /^العميل$/i,
      /^اسم العميل$/i,
      /^الاسم$/i,
      /^الاسم الكامل$/i,
      /^صاحب العقد$/i,
      /^المالك$/i,
    ],
  },
  {
    field: "phone",
    patterns: [
      /phone/i,
      /mobile/i,
      /tel/i,
      /هاتف/i,
      /موبايل/i,
      /جوال/i,
      /رقم.*هاتف/i,
    ],
  },
  {
    field: "externalCustomerId",
    patterns: [/customer.*id/i, /client.*id/i, /كود.*عميل/i, /رقم.*عميل/i],
  },
  {
    field: "externalCaseId",
    patterns: [
      /case.*id/i,
      /case.*no/i,
      /case.*num/i,
      /invoice/i,
      /رقم.*حالة/i,
      /كود.*حالة/i,
    ],
  },
  {
    field: "amountDue",
    patterns: [
      /amount.*due/i,
      /due.*amount/i,
      /outstanding/i,
      /total.*due/i,
      /المبلغ.*المستحق/i,
      /المستحق/i,
      /قيمة.*القسط/i,
    ],
  },
  {
    field: "amountPaid",
    patterns: [
      /amount.*paid/i,
      /paid.*amount/i,
      /paid/i,
      /المحصل/i,
      /المدفوع/i,
    ],
  },
  {
    field: "dueDate",
    patterns: [
      /due.*date/i,
      /payment.*date/i,
      /date.*due/i,
      /تاريخ.*استحقاق/i,
      /تاريخ.*القسط/i,
      /تاريخ/i,
    ],
  },
  {
    field: "projectName",
    patterns: [/project/i, /development/i, /مشروع/i, /اسم.*مشروع/i],
  },
  {
    field: "unitCode",
    patterns: [
      /unit/i,
      /unit.*code/i,
      /unit.*no/i,
      /وحدة/i,
      /كود.*وحدة/i,
      /رقم.*وحدة/i,
    ],
  },
  {
    field: "contractNumber",
    patterns: [
      /contract/i,
      /contract.*no/i,
      /contract.*num/i,
      /عقد/i,
      /رقم.*عقد/i,
    ],
  },
];

/**
 * Suggests semantic field mappings for a list of spreadsheet column headers.
 * Returns a partial mapping — only columns with a confident match are included.
 */
export function suggestMapping(headers: string[]): MappingRules {
  const mapping: MappingRules = {};
  const usedFields = new Set<SemanticField>();

  for (const header of headers) {
    const trimmed = header.trim();
    for (const { field, patterns } of FIELD_PATTERNS) {
      if (usedFields.has(field)) continue;
      if (patterns.some((re) => re.test(trimmed))) {
        mapping[field] = trimmed;
        usedFields.add(field);
        break;
      }
    }
  }

  return mapping;
}
