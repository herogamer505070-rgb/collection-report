"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { runImport } from "@/app/(dashboard)/actions/imports";
import type {
  MappingRules,
  SemanticField,
  ImportSummary,
} from "@/types/imports";

const FIELD_LABELS: Record<SemanticField, string> = {
  customerName: "اسم العميل",
  phone: "رقم الهاتف",
  externalCustomerId: "كود العميل",
  externalCaseId: "كود الحالة",
  amountDue: "المبلغ المستحق",
  amountPaid: "المبلغ المحصل",
  dueDate: "تاريخ الاستحقاق",
  projectName: "المشروع",
  unitCode: "الوحدة",
  contractNumber: "العقد",
};

const SEMANTIC_FIELDS = Object.keys(FIELD_LABELS) as SemanticField[];

type Props = {
  batchId: string;
  headers: string[];
  sampleRows: Record<string, unknown>[];
  totalRows: number;
  initialMapping: MappingRules;
  onImportComplete: (summary: ImportSummary) => void;
};

export function MappingAssistant({
  batchId,
  headers,
  sampleRows,
  totalRows,
  initialMapping,
  onImportComplete,
}: Props) {
  const [mapping, setMapping] = useState<MappingRules>(initialMapping);
  const [isPending, startTransition] = useTransition();

  // mapping is field → column; we want column → field for display
  const columnToField = Object.fromEntries(
    (Object.entries(mapping) as [SemanticField, string][])
      .filter((entry): entry is [SemanticField, string] => entry[1] != null)
      .map(([field, col]) => [col, field]),
  );

  function handleFieldChange(header: string, field: string) {
    setMapping((prev) => {
      const next = { ...prev };
      // Remove header from any existing field assignment
      for (const [f, col] of Object.entries(next)) {
        if (col === header) delete next[f as SemanticField];
      }
      if (field !== "__none__") {
        next[field as SemanticField] = header;
      }
      return next;
    });
  }

  function handleRun() {
    startTransition(async () => {
      const result = await runImport(batchId, mapping);
      if (result.ok) {
        onImportComplete(result.summary);
      } else {
        toast.error(result.error);
      }
    });
  }

  const assignedFields = new Set(Object.keys(mapping));
  const mappedCount = assignedFields.size;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>ربط الأعمدة بالحقول</CardTitle>
            <Badge variant="outline">
              {totalRows} صف &mdash; {mappedCount} حقول مربوطة
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-52">عمود الملف</TableHead>
                  <TableHead className="w-52">الحقل المرتبط</TableHead>
                  <TableHead>أمثلة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {headers.map((header) => (
                  <TableRow key={header}>
                    <TableCell className="font-medium" dir="ltr">
                      {header}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={columnToField[header] ?? "__none__"}
                        onValueChange={(v) =>
                          handleFieldChange(header, v ?? "__none__")
                        }
                        disabled={isPending}
                      >
                        <SelectTrigger className="w-44">
                          <SelectValue placeholder="— تجاهل —" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— تجاهل —</SelectItem>
                          {SEMANTIC_FIELDS.map((field) => (
                            <SelectItem
                              key={field}
                              value={field}
                              disabled={
                                field in mapping && mapping[field] !== header
                              }
                            >
                              {FIELD_LABELS[field]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell
                      className="text-sm text-muted-foreground"
                      dir="ltr"
                    >
                      {sampleRows
                        .slice(0, 2)
                        .map((r) => String(r[header] ?? ""))
                        .filter(Boolean)
                        .join(" · ")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Button
              onClick={handleRun}
              disabled={isPending || mappedCount === 0}
            >
              {isPending ? "جاري الاستيراد..." : `بدء استيراد ${totalRows} صف`}
            </Button>
            {mappedCount === 0 && (
              <p className="text-sm text-destructive">
                يجب ربط عمود واحد على الأقل
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
