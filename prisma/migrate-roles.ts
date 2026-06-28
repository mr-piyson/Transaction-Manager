/**
 * One-time migration: seed system Role rows and populate roleId FKs
 * from existing OrgRole enum values.
 *
 * Run with: npx tsx prisma/migrate-roles.ts
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const SYSTEM_ROLES = [
  { systemKey: 'OWNER',      name: 'Owner',      icon: 'crown',      color: '#eab308' },
  { systemKey: 'ADMIN',      name: 'Admin',      icon: 'shield',     color: '#3b82f6' },
  { systemKey: 'MANAGER',    name: 'Manager',    icon: 'briefcase',  color: '#8b5cf6' },
  { systemKey: 'ACCOUNTANT', name: 'Accountant', icon: 'calculator', color: '#06b6d4' },
  { systemKey: 'SALES',      name: 'Sales',      icon: 'trending-up',color: '#10b981' },
  { systemKey: 'WAREHOUSE',  name: 'Warehouse',  icon: 'package',    color: '#f59e0b' },
  { systemKey: 'VIEWER',     name: 'Viewer',     icon: 'eye',        color: '#6b7280' },
] as const;

async function main() {
  console.log('Seeding system Role rows...');

  const roleMap: Record<string, string> = {};

  for (const sr of SYSTEM_ROLES) {
    const role = await db.role.upsert({
      where: { systemKey: sr.systemKey },
      update: { name: sr.name, icon: sr.icon, color: sr.color },
      create: {
        name: sr.name,
        icon: sr.icon,
        color: sr.color,
        isSystem: true,
        systemKey: sr.systemKey,
      },
    });
    roleMap[sr.systemKey] = role.id;
  }

  console.log('Migrating UserOrganizationRole rows...');
  const uors = await db.userOrganizationRole.findMany({ where: { roleId: null } });
  for (const uor of uors) {
    const roleId = roleMap[uor.role];
    if (roleId) {
      await db.userOrganizationRole.update({ where: { id: uor.id }, data: { roleId } });
    }
  }
  console.log(`  Updated ${uors.length} UserOrganizationRole rows`);

  console.log('Migrating RolePermission rows...');
  const rps = await db.rolePermission.findMany({ where: { roleId: null } });
  for (const rp of rps) {
    const roleId = roleMap[rp.role];
    if (roleId) {
      await db.rolePermission.update({ where: { id: rp.id }, data: { roleId } });
    }
  }
  console.log(`  Updated ${rps.length} RolePermission rows`);

  console.log('Migrating ApprovalStep rows...');
  const steps = await db.approvalStep.findMany({ where: { roleId: null } });
  for (const step of steps) {
    const roleId = roleMap[step.role];
    if (roleId) {
      await db.approvalStep.update({ where: { id: step.id }, data: { roleId } });
    }
  }
  console.log(`  Updated ${steps.length} ApprovalStep rows`);

  console.log('Migration complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
