import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CompanyContext, SessionUser, UserRole } from "@/types/domain";

/**
 * Resolves the full CompanyContext for the currently authenticated user.
 *
 * Resolution order:
 *   1. Verify the session with the SSR client (never trust client-supplied claims).
 *   2. Fetch the user's active company membership via the admin client.
 *   3. Fetch the company row (name, slug) via the admin client.
 *
 * Returns null if:
 *   - There is no valid session.
 *   - The user has no active membership in any company.
 *   - The company row cannot be found.
 *
 * This function is intended for use in Server Components and Server Actions
 * only. Client Components receive the resolved context via CompanyContextProvider.
 */
export async function getCompanyContext(): Promise<CompanyContext | null> {
  // Step 1 — identify the current user from the SSR cookie session.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Step 2 — fetch company membership using the admin client so RLS does not
  // interfere with this lookup (the admin client has full access and we gate
  // on the result ourselves).
  const admin = createAdminClient();

  const { data: membership } = await admin
    .from("company_users")
    .select("company_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!membership) return null;

  // Step 3 — fetch the company profile.
  const { data: company } = await admin
    .from("companies")
    .select("id, name, slug")
    .eq("id", membership.company_id)
    .single();

  if (!company) return null;

  const sessionUser: SessionUser = {
    id: user.id,
    email: user.email,
    companyId: company.id,
    role: membership.role as UserRole,
  };

  return {
    user: sessionUser,
    companyId: company.id,
    companyName: company.name,
    companySlug: company.slug ?? null,
  };
}

/**
 * Same as getCompanyContext but throws if the context cannot be resolved.
 * Use this in Server Actions and Server Components where an unauthenticated
 * or unregistered caller must never receive a successful response.
 */
export async function getRequiredCompanyContext(): Promise<CompanyContext> {
  const ctx = await getCompanyContext();
  if (!ctx) throw new Error("Unauthenticated or company context missing");
  return ctx;
}
