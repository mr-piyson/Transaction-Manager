/**
 * Shared permission loading — used by both the tRPC context (lib/trpc/server.ts)
 * and the server route guards (lib/permissions/server.ts).
 *
 * Kept in one place so the org-role resolution and RolePermission lookup cannot
 * drift between the API and the route layer.
 */

import type { OrgRole, PlatformRole } from "@prisma/client";
import db from "@/lib/db";
import type { Action, PermissionUser } from "./engine";

/** Minimal shape of a user row with its active org role. */
export interface PermissionUserRow {
  id: string;
  platformRole: PlatformRole;
  organizationId: string | null;
  userOrganizationRoles: {
    role: OrgRole;
    roleId: string | null;
    customRole: { systemKey: string | null } | null;
  }[];
}

/** The active org role's effective key (custom systemKey wins over the enum). */
export function resolveOrgRole(row: PermissionUserRow): string | null {
  const uor = row.userOrganizationRoles[0];
  return uor?.customRole?.systemKey ?? uor?.role ?? null;
}

/**
 * Resolves the permission set for an already-loaded user row. Runs the
 * RolePermission lookup (skipped for SUPER_ADMIN).
 */
export async function resolvePermissionUser(
  row: PermissionUserRow,
): Promise<PermissionUser> {
  const uor = row.userOrganizationRoles[0];
  let permissions: Action[] = [];

  if (uor?.roleId && row.platformRole !== "SUPER_ADMIN") {
    const rolePerms = await db.rolePermission.findMany({
      where: { roleId: uor.roleId },
      select: { permission: { select: { code: true } } },
    });
    permissions = rolePerms.map((rp) => rp.permission.code as Action);
  }

  return {
    id: row.id,
    platformRole: row.platformRole,
    orgRole: resolveOrgRole(row) ?? undefined,
    organizationId: row.organizationId ?? undefined,
    permissions,
  };
}

const permissionUserSelect = {
  id: true,
  platformRole: true,
  organizationId: true,
  userOrganizationRoles: {
    where: { isActive: true, deletedAt: null },
    select: {
      role: true,
      roleId: true,
      customRole: { select: { systemKey: true } },
    },
    take: 1,
  },
} as const;

/** Loads a user row by id (active only) and resolves its permission set. */
export async function loadPermissionUser(
  userId: string,
): Promise<PermissionUser | null> {
  const row = await db.user.findUnique({
    where: { id: userId, isActive: true, deletedAt: null },
    select: permissionUserSelect,
  });
  if (!row) return null;
  return resolvePermissionUser(row as PermissionUserRow);
}
