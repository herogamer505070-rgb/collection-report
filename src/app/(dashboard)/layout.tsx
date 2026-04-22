import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getRequiredCompanyContext } from "@/lib/auth/get-company-context";
import { CompanyContextProvider } from "@/context/company-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Resolve full tenant context server-side. Redirects to /login if the
  // session is invalid or the user has no active company membership.
  let ctx;
  try {
    ctx = await getRequiredCompanyContext();
  } catch {
    redirect("/login");
  }

  return (
    <CompanyContextProvider value={ctx}>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar user={ctx.user} />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </CompanyContextProvider>
  );
}
