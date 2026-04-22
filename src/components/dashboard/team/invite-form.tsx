"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus } from "lucide-react";
import { inviteTeamMember } from "@/app/(dashboard)/actions/team";

const ROLE_OPTIONS = [
  { value: "collector", label: "محصّل" },
  { value: "manager", label: "مدير" },
  { value: "admin", label: "مسؤول" },
] as const;

export function InviteTeamMemberForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("collector");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("email", email);
    fd.append("role", role);

    startTransition(async () => {
      const result = await inviteTeamMember(fd);
      if (result.ok) {
        toast.success(`تم إرسال دعوة إلى ${result.data.email}`);
        setEmail("");
        setRole("collector");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-4 w-4 text-muted-foreground" />
          دعوة عضو جديد
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 space-y-1.5" style={{ minWidth: 200 }}>
            <Label htmlFor="invite-email">البريد الإلكتروني</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              disabled={isPending}
              dir="ltr"
            />
          </div>
          <div className="w-36 space-y-1.5">
            <Label htmlFor="invite-role">الدور</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v ?? "collector")}
              disabled={isPending}
            >
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            id="invite-submit"
            type="submit"
            disabled={isPending || !email}
          >
            {isPending ? "جارٍ الإرسال..." : "إرسال الدعوة"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
