/**
 * Canonical entry point for the company (tenant) context hook.
 *
 * Re-exports `useCompanyContext` from the context module so that all
 * consuming components import from a stable hooks path:
 *
 *   import { useCompanyContext } from "@/hooks/use-company-context";
 *
 * This keeps the src/hooks directory aligned with the blueprint's folder
 * structure while co-locating the implementation with its context provider.
 */
export { useCompanyContext } from "@/context/company-context";
