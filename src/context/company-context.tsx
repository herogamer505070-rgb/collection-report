"use client";

import { createContext, use } from "react";
import type { CompanyContext } from "@/types/domain";

// ---------------------------------------------------------------------------
// Context definition
// ---------------------------------------------------------------------------

const CompanyCtx = createContext<CompanyContext | null>(null);
CompanyCtx.displayName = "CompanyContext";

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * CompanyContextProvider
 *
 * Wraps the dashboard shell and makes the resolved CompanyContext available
 * to every Client Component below it — without additional fetches.
 *
 * The value is serialised by the parent Server Component
 * (dashboard layout) and passed as a plain prop, so it is safe to use
 * with React Server Components / Next.js App Router streaming.
 *
 * Usage in the dashboard layout (Server Component):
 *
 *   const ctx = await getRequiredCompanyContext();
 *   return (
 *     <CompanyContextProvider value={ctx}>
 *       {children}
 *     </CompanyContextProvider>
 *   );
 */
export function CompanyContextProvider({
  value,
  children,
}: {
  value: CompanyContext;
  children: React.ReactNode;
}) {
  return <CompanyCtx value={value}>{children}</CompanyCtx>;
}

// ---------------------------------------------------------------------------
// Consumer hook — exported from this file for co-location.
// The canonical re-export lives in src/hooks/use-company-context.ts.
// ---------------------------------------------------------------------------

/**
 * Returns the CompanyContext for the currently authenticated tenant user.
 *
 * Must be called from a Client Component that is a descendant of
 * CompanyContextProvider. Throws with a descriptive message if called
 * outside the provider — this is intentional; a missing provider is always
 * a programming error, not a runtime condition.
 */
export function useCompanyContext(): CompanyContext {
  const ctx = use(CompanyCtx);
  if (!ctx) {
    throw new Error(
      "useCompanyContext must be called inside <CompanyContextProvider>. " +
        "Ensure the dashboard layout wraps its children with this provider.",
    );
  }
  return ctx;
}
