import type { SessionUser, UserRole } from "@/types/domain";

export type Permission =
  | "dashboard.read"
  | "cases.read"
  | "cases.manage"
  | "cases.assign"
  | "notes.read"
  | "notes.create"
  | "notes.delete"
  | "imports.read"
  | "imports.manage"
  | "whatsapp.read"
  | "whatsapp.send"
  | "whatsapp.configure"
  | "team.read"
  | "team.manage"
  | "audit.read";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    "dashboard.read",
    "cases.read",
    "cases.manage",
    "cases.assign",
    "notes.read",
    "notes.create",
    "notes.delete",
    "imports.read",
    "imports.manage",
    "whatsapp.read",
    "whatsapp.send",
    "whatsapp.configure",
    "team.read",
    "team.manage",
    "audit.read",
  ],
  manager: [
    "dashboard.read",
    "cases.read",
    "cases.manage",
    "notes.read",
    "notes.create",
    "imports.read",
    "whatsapp.read",
    "whatsapp.send",
    "team.read",
  ],
  collector: [
    "dashboard.read",
    "cases.read",
    "notes.read",
    "notes.create",
    "whatsapp.send",
  ],
};

export function hasPermission(
  user: SessionUser,
  permission: Permission,
): boolean {
  return ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false;
}

export function requirePermission(
  user: SessionUser,
  permission: Permission,
): void {
  if (!hasPermission(user, permission)) {
    throw new Error(`Forbidden: missing permission ${permission}`);
  }
}
