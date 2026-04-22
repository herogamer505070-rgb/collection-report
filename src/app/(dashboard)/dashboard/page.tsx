import type { Metadata } from "next";
import { getRequiredCompanyContext } from "@/lib/auth/get-company-context";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import {
  AgingChart,
  StatusDistributionChart,
  OutstandingByProjectChart,
} from "@/components/dashboard/charts";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Upload, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "لوحة المؤشرات | نظام التحصيل",
  description: "ملخص مؤشرات الأداء والتحصيل",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ctx = await getRequiredCompanyContext();

  return (
    <section className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            لوحة المؤشرات
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            مرحباً،{" "}
            <span className="font-medium text-foreground">{ctx.user.email}</span>
            {" · "}
            <span className="font-medium text-foreground">{ctx.companyName}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            id="dashboard-upload-link"
            render={<Link href="/dashboard/upload" />}
          >
            <Upload className="me-2 h-4 w-4" />
            رفع بيانات
          </Button>
          <Button
            size="sm"
            id="dashboard-cases-link"
            render={<Link href="/dashboard/cases" />}
          >
            عرض جميع الحالات
            <ArrowLeft className="ms-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <KpiCards />

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <AgingChart />
        <StatusDistributionChart />
        <OutstandingByProjectChart />
      </div>
    </section>
  );
}
