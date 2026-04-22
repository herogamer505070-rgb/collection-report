import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { CasesTable } from "@/components/dashboard/cases-table";
import { CasesToolbar } from "@/components/dashboard/cases-table/toolbar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Upload } from "lucide-react";

export const metadata: Metadata = {
  title: "حالات التحصيل | نظام التحصيل",
  description: "قائمة حالات التحصيل مع إمكانية البحث والتصفية",
};

export default function CasesPage() {
  return (
    <NuqsAdapter>
      <section className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              حالات التحصيل
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              إدارة ومتابعة جميع حالات التحصيل
            </p>
          </div>
          <Button variant="outline" size="sm" id="cases-upload-link" render={<Link href="/upload" />}>
            <Upload className="me-2 h-4 w-4" />
            رفع بيانات جديدة
          </Button>
        </div>

        {/* Filters toolbar */}
        <CasesToolbar />

        {/* Table */}
        <CasesTable />
      </section>
    </NuqsAdapter>
  );
}
