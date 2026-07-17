/**
 * Seed orchestrator — single source of truth for database initialization.
 * Exports seed functions used by prisma/seed.ts and setup.router.ts
 *
 * Usage:
 *   import { seedRoles, seedPermissions, seedCurrencies, seedAll } from '@/seed';
 */

import type { PrismaClient } from '@prisma/client';
import { SYSTEM_ROLES } from './roles';
import { PERMISSIONS } from './permissions';
import { CURRENCIES } from './currencies';

// Re-export data for direct access
export { SYSTEM_ROLES } from './roles';
export { PERMISSIONS } from './permissions';
export { CURRENCIES } from './currencies';

export type { SystemRoleDefinition } from './roles';
export type { PermissionDefinition } from './permissions';
export type { CurrencyDefinition } from './currencies';

/**
 * Seed system roles (idempotent — uses upsert).
 * Returns the number of roles seeded.
 */
export async function seedRoles(db: PrismaClient): Promise<number> {
  for (const role of SYSTEM_ROLES) {
    await db.role.upsert({
      where: { systemKey: role.systemKey },
      update: { name: role.name, icon: role.icon, color: role.color },
      create: { ...role, isSystem: true },
    });
  }
  return SYSTEM_ROLES.length;
}

/**
 * Seed permissions (idempotent — uses upsert).
 * Returns the number of permissions seeded.
 */
export async function seedPermissions(db: PrismaClient): Promise<number> {
  for (const perm of PERMISSIONS) {
    await db.permission.upsert({
      where: { code: perm.code },
      update: { label: perm.label, module: perm.module },
      create: perm,
    });
  }
  return PERMISSIONS.length;
}

/**
 * Seed currencies (idempotent — uses upsert).
 * Returns the number of currencies seeded.
 */
export async function seedCurrencies(db: PrismaClient): Promise<number> {
  for (const currency of CURRENCIES) {
    await db.currency.upsert({
      where: { code: currency.code },
      update: {
        name: currency.name,
        symbol: currency.symbol,
        precision: currency.precision,
      },
      create: {
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol,
        precision: currency.precision,
        separator: ',',
        decimal: '.',
        isActive: true,
        syncSource: 'SEED',
      },
    });
  }
  return CURRENCIES.length;
}

/**
 * Seed all global reference data (roles, permissions, currencies).
 * Safe to call multiple times — all operations are idempotent.
 */
export async function seedAll(db: PrismaClient): Promise<{
  roles: number;
  permissions: number;
  currencies: number;
}> {
  const roles = await seedRoles(db);
  const permissions = await seedPermissions(db);
  const currencies = await seedCurrencies(db);

  return { roles, permissions, currencies };
}
