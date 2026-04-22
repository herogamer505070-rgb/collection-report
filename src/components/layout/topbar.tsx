"use client";

import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, ChevronDown } from "lucide-react";
import type { SessionUser } from "@/types/domain";

type TopbarProps = {
  user: SessionUser;
};

export function Topbar({ user }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Simple title mapping
  const getPageTitle = () => {
    if (pathname === "/dashboard") return "لوحة المؤشرات";
    if (pathname.startsWith("/cases")) return "حالات التحصيل";
    if (pathname.startsWith("/upload")) return "رفع بيانات";
    if (pathname.startsWith("/settings")) return "الإعدادات";
    return "";
  };

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("تم تسجيل الخروج");
    router.push("/login");
  }

  return (
    <header className="flex h-20 items-center justify-between border-b border-border/40 bg-background/80 backdrop-blur-xl px-6 sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{getPageTitle()}</h2>
      </div>
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/20">
              <User className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-muted-foreground hidden sm:block hover:text-foreground transition-colors">
              {user.email}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-card/95 backdrop-blur-md border-border/50">
            <DropdownMenuLabel>حسابي</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
              <span>تسجيل الخروج</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
