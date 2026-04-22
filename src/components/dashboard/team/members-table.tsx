"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, ShieldCheck, ChevronDown } from "lucide-react";
import { formatDate } from "@/lib/format/dates";
import {
  updateTeamMemberRole,
  setTeamMemberActive,
  type TeamMember,
} from "@/app/(dashboard)/actions/team";
import type { UserRole } from "@/types/domain";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "مسؤول",
  manager: "مدير",
  collector: "محصّل",
};

const ROLE_COLORS: Record<
  UserRole,
  "default" | "secondary" | "destructive" | "outline"
> = {
  admin: "destructive",
  manager: "default",
  collector: "secondary",
};

interface TeamMembersTableProps {
  members: TeamMember[];
  currentUserId: string;
  canManage: boolean;
}

function MemberRow({
  member,
  currentUserId,
  canManage,
}: {
  member: TeamMember;
  currentUserId: string;
  canManage: boolean;
}) {
  const [role, setRole] = useState<UserRole>(member.role);
  const [isActive, setIsActive] = useState(member.isActive);
  const [isPending, startTransition] = useTransition();
  const isSelf = member.userId === currentUserId;

  const handleRoleChange = (newRole: string | null) => {
    if (!newRole || newRole === role) return;
    startTransition(async () => {
      const result = await updateTeamMemberRole(member.userId, newRole as UserRole);
      if (result.ok) {
        setRole(newRole as UserRole);
        toast.success("تم تحديث الدور.");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleToggleActive = () => {
    startTransition(async () => {
      const result = await setTeamMemberActive(member.userId, !isActive);
      if (result.ok) {
        setIsActive((prev) => !prev);
        toast.success(isActive ? "تم تعطيل العضو." : "تم تفعيل العضو.");
      } else {
        toast.error(result.error);
      }
    });
  };

  const initials = member.email
    ? member.email.slice(0, 2).toUpperCase()
    : "??";

  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 transition-colors ${
        !isActive ? "opacity-50" : ""
      }`}
    >
      {/* Avatar */}
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>

      {/* Email + meta */}
      <div className="flex-1 space-y-0.5 min-w-0">
        <p
          className="truncate text-sm font-medium text-foreground"
          dir="ltr"
        >
          {member.email ?? member.userId.slice(0, 12) + "…"}
          {isSelf && (
            <span className="ms-2 text-xs text-muted-foreground">(أنت)</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          انضم {formatDate(member.joinedAt)}
          {!isActive && (
            <span className="ms-2 rounded bg-muted px-1 text-destructive">
              معطّل
            </span>
          )}
        </p>
      </div>

      {/* Role badge / selector */}
      {canManage && !isSelf ? (
        <Select
          value={role}
          onValueChange={handleRoleChange}
          disabled={isPending}
        >
          <SelectTrigger
            className="h-7 w-32 text-xs"
            id={`role-select-${member.userId}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["collector", "manager", "admin"] as UserRole[]).map((r) => (
              <SelectItem key={r} value={r} className="text-xs">
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Badge variant={ROLE_COLORS[role]} className="text-xs">
          {ROLE_LABELS[role]}
        </Badge>
      )}

      {/* Deactivate / Reactivate */}
      {canManage && !isSelf && (
        <Button
          id={`toggle-active-${member.userId}`}
          variant={isActive ? "outline" : "secondary"}
          size="sm"
          className="h-7 text-xs"
          onClick={handleToggleActive}
          disabled={isPending}
        >
          {isActive ? "تعطيل" : "تفعيل"}
        </Button>
      )}
    </div>
  );
}

export function TeamMembersTable({
  members,
  currentUserId,
  canManage,
}: TeamMembersTableProps) {
  const activeMembers = members.filter((m) => m.isActive);
  const inactiveMembers = members.filter((m) => !m.isActive);
  const [showInactive, setShowInactive] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-muted-foreground" />
          أعضاء الفريق
          <span className="ms-auto rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
            {activeMembers.length} نشط
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {activeMembers.map((m) => (
          <MemberRow
            key={m.userId}
            member={m}
            currentUserId={currentUserId}
            canManage={canManage}
          />
        ))}

        {inactiveMembers.length > 0 && (
          <>
            <button
              className="flex w-full items-center gap-1 py-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowInactive((v) => !v)}
              id="toggle-inactive-members"
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${showInactive ? "rotate-180" : ""}`}
              />
              {inactiveMembers.length} عضو معطّل
            </button>
            {showInactive &&
              inactiveMembers.map((m) => (
                <MemberRow
                  key={m.userId}
                  member={m}
                  currentUserId={currentUserId}
                  canManage={canManage}
                />
              ))}
          </>
        )}

        {members.length === 0 && (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-sm text-muted-foreground">
            <ShieldCheck className="h-5 w-5" />
            لا يوجد أعضاء بعد. أرسل دعوة أعلاه.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
