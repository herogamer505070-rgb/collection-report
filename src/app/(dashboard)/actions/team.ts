"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredCompanyContext } from "@/lib/auth/get-company-context";
import { requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditEvent } from "@/lib/auth/audit-log";
import type { ActionResult, CompanyUser } from "@/types/cases";
import type { UserRole } from "@/types/domain";

// ---------------------------------------------------------------------------
// List team members (with emails)
// ---------------------------------------------------------------------------

export type TeamMember = {
  userId: string;
  email: string | null;
  role: UserRole;
  isActive: boolean;
  joinedAt: string;
};

export async function getTeamMembers(): Promise<TeamMember[]> {
  const ctx = await getRequiredCompanyContext();
  requirePermission(ctx.user, "team.read");
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("company_users")
    .select("user_id, role, is_active, created_at")
    .eq("company_id", ctx.companyId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  // Fetch emails in parallel from auth.users (admin SDK)
  const members = await Promise.all(
    data.map(async (row) => {
      let email: string | null = null;
      try {
        const { data: authUser } = await admin.auth.admin.getUserById(row.user_id);
        email = authUser?.user?.email ?? null;
      } catch {
        // individual lookup failure — show userId only
      }
      return {
        userId: row.user_id,
        email,
        role: row.role as UserRole,
        isActive: row.is_active,
        joinedAt: row.created_at,
      };
    }),
  );

  return members;
}

// ---------------------------------------------------------------------------
// Invite user (sends a magic link via Supabase Auth)
// ---------------------------------------------------------------------------

const InviteSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح"),
  role: z.enum(["admin", "manager", "collector"], {
    message: "الدور غير صالح",
  }),
});

export async function inviteTeamMember(
  formData: FormData,
): Promise<ActionResult<{ email: string }>> {
  const ctx = await getRequiredCompanyContext();
  requirePermission(ctx.user, "team.manage");
  const admin = createAdminClient();

  const parsed = InviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }

  const { email, role } = parsed.data;

  // Invite user via Supabase (creates auth user + sends invite email)
  const { data: invited, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        company_id: ctx.companyId,
        role,
        invited_by: ctx.user.id,
      },
    });

  if (inviteError) {
    console.error("[inviteTeamMember] error:", inviteError);
    return {
      ok: false,
      error: inviteError.message.includes("already been registered")
        ? "هذا البريد الإلكتروني مسجّل مسبقاً."
        : "فشل إرسال الدعوة. حاول مرة أخرى.",
    };
  }

  const newUserId = invited.user.id;

  // Upsert into company_users
  const { error: cuError } = await admin.from("company_users").upsert(
    {
      company_id: ctx.companyId,
      user_id: newUserId,
      role,
      is_active: true,
    },
    { onConflict: "company_id,user_id" },
  );

  if (cuError) {
    console.error("[inviteTeamMember] company_users upsert error:", cuError);
    return { ok: false, error: "تم إرسال الدعوة لكن فشل حفظ الدور." };
  }

  await recordAuditEvent({
    companyId: ctx.companyId,
    actorUserId: ctx.user.id,
    entityType: "company_users",
    entityId: newUserId,
    action: "member_invite",
    afterState: { email, role },
  });

  revalidatePath("/dashboard/team");
  return { ok: true, data: { email } };
}

// ---------------------------------------------------------------------------
// Update role
// ---------------------------------------------------------------------------

export async function updateTeamMemberRole(
  userId: string,
  role: UserRole,
): Promise<ActionResult> {
  const ctx = await getRequiredCompanyContext();
  requirePermission(ctx.user, "team.manage");

  // Prevent self-demotion
  if (userId === ctx.user.id) {
    return { ok: false, error: "لا يمكنك تغيير دورك الخاص." };
  }

  const admin = createAdminClient();

  const { data: before } = await admin
    .from("company_users")
    .select("role")
    .eq("company_id", ctx.companyId)
    .eq("user_id", userId)
    .single();

  if (!before) {
    return { ok: false, error: "المستخدم غير موجود في هذه الشركة." };
  }

  const { error } = await admin
    .from("company_users")
    .update({ role })
    .eq("company_id", ctx.companyId)
    .eq("user_id", userId);

  if (error) return { ok: false, error: "فشل تحديث الدور." };

  await recordAuditEvent({
    companyId: ctx.companyId,
    actorUserId: ctx.user.id,
    entityType: "company_users",
    entityId: userId,
    action: "role_change",
    beforeState: { role: before.role },
    afterState: { role },
  });

  revalidatePath("/dashboard/team");
  return { ok: true, data: undefined };
}

// ---------------------------------------------------------------------------
// Deactivate / Reactivate
// ---------------------------------------------------------------------------

export async function setTeamMemberActive(
  userId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const ctx = await getRequiredCompanyContext();
  requirePermission(ctx.user, "team.manage");

  if (userId === ctx.user.id) {
    return { ok: false, error: "لا يمكنك تعطيل حسابك الخاص." };
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("company_users")
    .update({ is_active: isActive })
    .eq("company_id", ctx.companyId)
    .eq("user_id", userId);

  if (error) {
    return {
      ok: false,
      error: isActive ? "فشل إعادة تفعيل المستخدم." : "فشل تعطيل المستخدم.",
    };
  }

  await recordAuditEvent({
    companyId: ctx.companyId,
    actorUserId: ctx.user.id,
    entityType: "company_users",
    entityId: userId,
    action: isActive ? "member_reactivate" : "member_deactivate",
    afterState: { isActive },
  });

  revalidatePath("/dashboard/team");
  return { ok: true, data: undefined };
}

// Re-export for use by other modules
export type { CompanyUser };
