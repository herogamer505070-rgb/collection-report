import type { Metadata } from "next";
import { getRequiredCompanyContext } from "@/lib/auth/get-company-context";
import { hasPermission } from "@/lib/auth/permissions";
import { getTeamMembers } from "@/app/(dashboard)/actions/team";
import { TeamMembersTable } from "@/components/dashboard/team/members-table";
import { InviteTeamMemberForm } from "@/components/dashboard/team/invite-form";

export const metadata: Metadata = {
  title: "إدارة الفريق | نظام التحصيل",
  description: "عرض وإدارة أعضاء فريق التحصيل",
};

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const [ctx, members] = await Promise.all([
    getRequiredCompanyContext(),
    getTeamMembers(),
  ]);

  const canManage = hasPermission(ctx.user, "team.manage");

  return (
    <section className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">إدارة الفريق</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {members.filter((m) => m.isActive).length} عضو نشط في{" "}
          <span className="font-medium text-foreground">{ctx.companyName}</span>
        </p>
      </div>

      {/* Invite form — admin/manager only */}
      {canManage && <InviteTeamMemberForm />}

      {/* Members list */}
      <TeamMembersTable
        members={members}
        currentUserId={ctx.user.id}
        canManage={canManage}
      />
    </section>
  );
}
