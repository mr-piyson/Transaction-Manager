/**
 * Boot-time permission sync — makes permission seeding zero-touch.
 *
 * Runs once at server start (see instrumentation.ts). Idempotent, additive:
 *   1. Ensures every Permission row from lib/permissions-registry.ts exists.
 *   2. For each organization's OWNER system-role copy, grants any permission
 *      code that NO system role in that org holds yet (i.e. codes introduced
 *      after the org was created — the setup-time broad grant only covered
 *      what existed back then).
 *
 * It never revokes or touches existing RolePermission rows; fine-grained
 * grants for other roles are managed via Settings → Permissions (matrix UI).
 * Label/module edits in the registry propagate via `prisma db seed`.
 *
 * Opt out with DISABLE_PERMISSION_SYNC=true.
 */

import type { OrgRole } from "@prisma/client";
import db from "@/lib/db";
import { isAutoGrantable, PERMISSIONS } from "@/lib/permissions-registry";

export interface PermissionSyncSummary {
  permissionsCreated: number;
  ownerGrantsCreated: number;
}

export async function syncPermissionsAndGrants(): Promise<PermissionSyncSummary> {
  // ── 1. Ensure Permission rows exist (create-only; cheap) ─────────────────
  const existingPermissions = await db.permission.findMany({
    select: { id: true, code: true },
  });
  const codeToId = new Map(existingPermissions.map((p) => [p.code, p.id]));

  const missing = PERMISSIONS.filter((p) => !codeToId.has(p.code));
  let permissionsCreated = 0;
  if (missing.length > 0) {
    const result = await db.permission.createMany({
      data: missing.map((p) => ({
        code: p.code,
        label: p.label,
        module: p.module,
      })),
      skipDuplicates: true,
    });
    permissionsCreated = result.count;
    for (const p of await db.permission.findMany({
      where: { code: { in: missing.map((m) => m.code) } },
      select: { id: true, code: true },
    })) {
      codeToId.set(p.code, p.id);
    }
  }

  // ── 2. Top up OWNER role copies with unheld permission codes ────────────
  const orgRoles = await db.role.findMany({
    where: {
      organizationId: { not: null },
      isSystem: true,
      deletedAt: null,
    },
    select: { id: true, systemKey: true, organizationId: true },
  });

  // Group non-VIEWER system role copies by org; find the OWNER copy per org.
  const ownerByOrg = new Map<string, string>();
  const allRoleIds: string[] = [];
  for (const role of orgRoles) {
    // Org copies carry systemKey "<BASE>_<cuid orgId>" — recover the base key.
    const baseKey = (role.systemKey ?? "").split("_")[0];
    if (!baseKey || baseKey === "VIEWER" || !role.organizationId) continue;

    allRoleIds.push(role.id);
    if (baseKey === "OWNER") {
      ownerByOrg.set(role.organizationId, role.id);
    }
  }

  let ownerGrantsCreated = 0;
  if (ownerByOrg.size > 0 && allRoleIds.length > 0) {
    const existingGrants = await db.rolePermission.findMany({
      where: { roleId: { in: allRoleIds } },
      select: { roleId: true, permissionId: true },
    });
    const heldPairs = new Set(
      existingGrants.map((g) => `${g.roleId}:${g.permissionId}`),
    );

    const grantableCodes = PERMISSIONS.map((p) => p.code).filter((code) =>
      isAutoGrantable(code),
    );

    const toCreate: {
      role: OrgRole;
      roleId: string;
      permissionId: string;
    }[] = [];
    for (const ownerRoleId of ownerByOrg.values()) {
      for (const code of grantableCodes) {
        const permissionId = codeToId.get(code);
        if (!permissionId) continue;
        if (heldPairs.has(`${ownerRoleId}:${permissionId}`)) continue;
        toCreate.push({
          role: "OWNER" satisfies OrgRole,
          roleId: ownerRoleId,
          permissionId,
        });
      }
    }

    if (toCreate.length > 0) {
      const result = await db.rolePermission.createMany({
        data: toCreate,
        skipDuplicates: true,
      });
      ownerGrantsCreated = result.count;
    }
  }

  return { permissionsCreated, ownerGrantsCreated };
}
