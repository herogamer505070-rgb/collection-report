"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCompanyContext } from "@/context/company-context";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import {
  LayoutDashboard,
  Briefcase,
  UploadCloud,
  Settings,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  permission?: Permission;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "لوحة المؤشرات", icon: LayoutDashboard },
  { href: "/dashboard/cases", label: "حالات التحصيل", icon: Briefcase },
  { href: "/dashboard/upload", label: "رفع بيانات", icon: UploadCloud, permission: "imports.read" },
  { href: "/dashboard/settings", label: "الإعدادات", icon: Settings }, // Settings acts as hub
];

export function Sidebar() {
  const pathname = usePathname();
  const ctx = useCompanyContext();

  const roleLabels: Record<string, string> = {
    admin: "مدير نظام",
    manager: "مدير",
    collector: "محصل",
  };

  return (
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col border-l border-border/40 bg-card/50 backdrop-blur-xl">
      <div className="flex flex-col justify-center h-20 border-b border-border/40 px-6">
        <span className="text-lg font-bold text-foreground truncate" title={ctx.companyName}>
          {ctx.companyName}
        </span>
        <span className="text-xs text-muted-foreground mt-0.5 font-medium tracking-wide">
          {roleLabels[ctx.user.role] ?? ctx.user.role}
        </span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems
          .filter((item) => !item.permission || hasPermission(ctx.user, item.permission))
          .map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary shadow-[inset_2px_0_0_0_hsl(var(--primary))]"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} strokeWidth={isActive ? 2.5 : 2} />
                {item.label}
              </Link>
            );
          })}
      </nav>
    </aside>
  );
}
