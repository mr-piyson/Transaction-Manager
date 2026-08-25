/**
 * One-time backfill: creates the subscription:* Permission rows and grants
 * them to every non-VIEWER system role in every existing organization.
 *
 * New organizations receive these grants automatically during setup
 * (see server/setup/setup.router.ts). This script covers organizations that
 * existed before the Subscriptions feature was introduced.
 *
 * Run with: bun run prisma/backfill-subscription-permissions.ts
 *
 * Safe to run multiple times (idempotent).
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { type OrgRole, PrismaClient } from "@prisma/client";
import { PERMISSIONS } from "./seed/permissions";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const SUBSCRIPTION_PERMISSIONS = PERMISSIONS.filter((p) =>
  p.code.startsWith("subscription:"),
);

async function main() {
  console.log("🔧 Backfilling subscription permissions...\n");

  if (SUBSCRIPTION_PERMISSIONS.length === 0) {
    throw new Error("No subscription:* permissions found in the seed list.");
  }

  // 1. Ensure the Permission rows exist (global, not org-scoped).
  const permissionRows: { id: string; code: string }[] = [];
  for (const perm of SUBSCRIPTION_PERMISSIONS) {
    const row = await db.permission.upsert({
      where: { code: perm.code },
      update: { label: perm.label, module: perm.module },
      create: perm,
      select: { id: true, code: true },
    });
    permissionRows.push(row);
  }
  console.log(
    `  ✓ Ensured ${permissionRows.length} subscription permissions exist.`,
  );

  // 2. Grant them to every non-VIEWER org-scoped system role copy,
  //    mirroring the grant logic in setup.router.ts.
  const orgRoles = await db.role.findMany({
    where: { organizationId: { not: null }, isSystem: true, deletedAt: null },
    select: { id: true, systemKey: true, organizationId: true },
  });

  let granted = 0;
  let viewersSkipped = 0;
  const touchedOrgs = new Set<string>();

  for (const role of orgRoles) {
    // Org copies carry systemKey "<BASE>_<cuid orgId>" — recover the base key.
    const baseKey = (role.systemKey ?? "").split("_")[0];

    if (!baseKey || !role.organizationId) continue;

    if (baseKey === "VIEWER") {
      viewersSkipped++;
      continue;
    }

    const result = await db.rolePermission.createMany({
      data: permissionRows.map((perm) => ({
        role: baseKey as OrgRole,
        roleId: role.id,
        permissionId: perm.id,
      })),
      skipDuplicates: true,
    });

    granted += result.count;
    touchedOrgs.add(role.organizationId);
  }

  console.log(
    `  ✓ Processed ${orgRoles.length} org role(s) in ${touchedOrgs.size} organization(s): ${granted} new grant row(s), ${viewersSkipped} VIEWER role(s) skipped.`,
  );
  console.log("\n✅ Subscription permission backfill complete.");
}

main()
  .catch((error) => {
    console.error("\n❌ Backfill failed:", error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
