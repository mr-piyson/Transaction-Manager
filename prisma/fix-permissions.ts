/**
 * One-time data migration to fix permission codes after CASL authorization
 * implementation.
 *
 * This script:
 * 1. Creates any missing permissions from the new canonical list.
 * 2. Renames 1:1 legacy permission codes to their new CASL-aligned codes.
 * 3. Expands 1:many composite legacy codes into granular CASL actions.
 * 4. Deletes orphaned permissions that have no CASL mapping.
 * 5. Cleans up dangling rolePermissions.
 *
 * Run with: bun run prisma/fix-permissions.ts
 *
 * Safe to run multiple times (idempotent).
 */

import { PrismaClient, OrgRole } from '@prisma/client';
import { PERMISSIONS } from './seed/index';

const db = new PrismaClient();

// ─── Mappings ────────────────────────────────────────────────────────────────

const ONE_TO_ONE_MAPPING: Record<string, string> = {
  'org:manage': 'org:settings:update',
  'org:view': 'org:settings:read',
  'invoice:view': 'invoice:read',
  'invoice:edit': 'invoice:update',
  'purchase:create': 'po:create',
  'purchase:view': 'po:read',
  'purchase:edit': 'po:update',
  'purchase:delete': 'po:delete',
  'purchase:approve': 'po:approve',
  'stock:view': 'stock:read',
  'item:edit': 'item:update',
  'customer:view': 'customer:read',
  'customer:edit': 'customer:update',
  'hr:employee:create': 'employee:create',
  'hr:employee:view': 'employee:read',
  'hr:employee:edit': 'employee:update',
  'hr:attendance:view': 'attendance:read',
};

const ONE_TO_MANY_MAPPING: Record<string, string[]> = {
  'hr:leave:manage': [
    'leave:request:create',
    'leave:request:read',
    'leave:request:update',
    'leave:request:approve',
  ],
  'hr:payroll:manage': [
    'payroll:read',
    'payroll:create',
    'payroll:process',
    'payroll:complete',
    'payroll:cancel',
  ],
  'hr:recruitment:manage': [
    'job-posting:read',
    'job-posting:create',
    'job-posting:update',
    'job-posting:delete',
    'candidate:read',
    'candidate:create',
    'candidate:update',
    'candidate:delete',
    'candidate:status:update',
    'interview:read',
    'interview:create',
    'interview:update',
    'offer:read',
    'offer:create',
    'offer:update',
    'offer:respond',
  ],
  'hr:training:manage': [
    'training:read',
    'training:create',
    'training:update',
    'training:delete',
    'training:enroll',
  ],
  'hr:performance:manage': [
    'performance:read',
    'performance:create',
    'performance:update',
    'performance:delete',
    'performance:submit',
    'performance:acknowledge',
  ],
};

const UNMAPPED_CODES = new Set([
  'user:view',
  'warehouse:manage',
  'supplier:create',
  'supplier:view',
  'supplier:edit',
  'supplier:delete',
  'report:purchases',
  'report:tax',
  'account:create',
  'account:view',
  'account:edit',
  'account:delete',
  'tax:manage',
  'tax:view',
  'crm:lead:create',
  'crm:lead:view',
  'crm:lead:edit',
  'crm:lead:delete',
  'crm:opportunity:create',
  'crm:opportunity:view',
  'crm:opportunity:edit',
  'crm:campaign:manage',
  'crm:contact:manage',
  'crm:pipeline:manage',
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function ensurePermissionsExist() {
  const existingCodes = new Set(
    (await db.permission.findMany({ select: { code: true } })).map((p) => p.code),
  );

  const missing = PERMISSIONS.filter((p) => !existingCodes.has(p.code));
  if (missing.length === 0) {
    console.log(`  ✓ All ${PERMISSIONS.length} permissions already exist.`);
    return;
  }

  console.log(`  + Creating ${missing.length} missing permissions...`);
  await db.permission.createMany({
    data: missing.map((p) => ({
      code: p.code,
      label: p.label,
      module: p.module,
    })),
    skipDuplicates: true,
  });
  console.log(`  ✓ Created ${missing.length} permissions.`);
}

async function renameOneToOne() {
  const oldCodes = Object.keys(ONE_TO_ONE_MAPPING);
  const oldPermissions = await db.permission.findMany({
    where: { code: { in: oldCodes } },
    select: { id: true, code: true },
  });

  if (oldPermissions.length === 0) {
    console.log('  ✓ No 1:1 legacy permissions to rename.');
    return;
  }

  console.log(`  ~ Renaming ${oldPermissions.length} legacy permissions...`);

  for (const perm of oldPermissions) {
    const newCode = ONE_TO_ONE_MAPPING[perm.code];
    const existing = await db.permission.findUnique({
      where: { code: newCode },
      select: { id: true },
    });

    if (existing) {
      console.log(`    - ${perm.code}: target ${newCode} already exists, reassigning rolePermissions...`);
      const count = await db.rolePermission.updateMany({
        where: { permissionId: perm.id },
        data: { permissionId: existing.id },
      });
      await db.permission.delete({ where: { id: perm.id } });
      console.log(`      → Moved ${count.count} rolePermission rows.`);
    } else {
      await db.permission.update({
        where: { id: perm.id },
        data: { code: newCode },
      });
      console.log(`    - ${perm.code} → ${newCode}`);
    }
  }

  console.log(`  ✓ Renamed ${oldPermissions.length} permissions.`);
}

async function expandOneToMany() {
  const oldCodes = Object.keys(ONE_TO_MANY_MAPPING);
  const oldPermissions = await db.permission.findMany({
    where: { code: { in: oldCodes } },
    select: { id: true, code: true },
  });

  if (oldPermissions.length === 0) {
    console.log('  ✓ No 1:many legacy permissions to expand.');
    return;
  }

  console.log(`  ~ Expanding ${oldPermissions.length} composite permissions into granular ones...`);

  for (const oldPerm of oldPermissions) {
    const newCodes = ONE_TO_MANY_MAPPING[oldPerm.code];
    if (!newCodes) continue;

    const newPerms = await db.permission.findMany({
      where: { code: { in: newCodes } },
      select: { id: true, code: true },
    });

    if (newPerms.length === 0) {
      console.log(`    ! Warning: no target permissions found for ${oldPerm.code}`);
      continue;
    }

    const newPermIds = newPerms.map((p) => p.id);
    const existingRps = await db.rolePermission.findMany({
      where: { permissionId: oldPerm.id },
      select: { id: true, role: true, roleId: true },
    });

    if (existingRps.length === 0) {
      console.log(`    - ${oldPerm.code}: no rolePermissions to migrate.`);
    } else {
      const toCreate: { role: OrgRole; roleId: string | null; permissionId: string }[] = [];
      for (const rp of existingRps) {
        for (const permId of newPermIds) {
          toCreate.push({ role: rp.role, roleId: rp.roleId, permissionId: permId });
        }
      }

      // Delete old rolePermissions first to avoid unique constraint conflicts
      await db.rolePermission.deleteMany({ where: { permissionId: oldPerm.id } });

      // Insert in batches to avoid overwhelming the DB
      const BATCH = 50;
      for (let i = 0; i < toCreate.length; i += BATCH) {
        const batch = toCreate.slice(i, i + BATCH);
        try {
          await db.rolePermission.createMany({
            data: batch,
            skipDuplicates: true,
          });
        } catch {
          // If createMany fails due to unique constraints, fall back to individual creates
          for (const row of batch) {
            try {
              await db.rolePermission.create({ data: row });
            } catch {
              // Already exists, skip
            }
          }
        }
      }

      console.log(
        `    - ${oldPerm.code}: migrated ${existingRps.length} role(s) to ${newPermIds.length} granular permission(s).`,
      );
    }

    await db.permission.delete({ where: { id: oldPerm.id } });
  }

  console.log('  ✓ Expanded composite permissions.');
}

async function deleteUnmapped() {
  const allPerms = await db.permission.findMany({
    select: { id: true, code: true },
  });

  const toDelete = allPerms.filter((p) => UNMAPPED_CODES.has(p.code));
  if (toDelete.length === 0) {
    console.log('  ✓ No unmapped permissions to delete.');
    return;
  }

  console.log(`  ~ Deleting ${toDelete.length} unmapped permissions...`);

  const idsToDelete = toDelete.map((p) => p.id);
  await db.rolePermission.deleteMany({
    where: { permissionId: { in: idsToDelete } },
  });
  await db.permission.deleteMany({
    where: { id: { in: idsToDelete } },
  });

  console.log(`  ✓ Deleted ${toDelete.length} permissions and their rolePermissions.`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔧 Starting permission migration...\n');

  try {
    await ensurePermissionsExist();
    await renameOneToOne();
    await expandOneToMany();
    await deleteUnmapped();

    console.log('\n✅ Permission migration completed successfully.');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
