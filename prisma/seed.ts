import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const permissions = [
  // ── Users & Roles ─────────────────────────────────────────
  { code: 'user:manage',    label: 'Manage Users',          module: 'Users & Roles' },
  { code: 'user:view',      label: 'View Users',            module: 'Users & Roles' },
  { code: 'role:manage',    label: 'Manage Roles',          module: 'Users & Roles' },

  // ── Organization Settings ─────────────────────────────────
  { code: 'org:manage',     label: 'Manage Organization',   module: 'Organization' },
  { code: 'org:view',       label: 'View Organization',     module: 'Organization' },

  // ── Invoicing ─────────────────────────────────────────────
  { code: 'invoice:create',  label: 'Create Invoices',       module: 'Invoicing' },
  { code: 'invoice:view',    label: 'View Invoices',         module: 'Invoicing' },
  { code: 'invoice:edit',    label: 'Edit Invoices',         module: 'Invoicing' },
  { code: 'invoice:delete',  label: 'Delete Invoices',       module: 'Invoicing' },
  { code: 'invoice:approve', label: 'Approve Invoices',      module: 'Invoicing' },

  // ── Purchasing ────────────────────────────────────────────
  { code: 'purchase:create',  label: 'Create Purchase Orders', module: 'Purchasing' },
  { code: 'purchase:view',    label: 'View Purchase Orders',   module: 'Purchasing' },
  { code: 'purchase:edit',    label: 'Edit Purchase Orders',   module: 'Purchasing' },
  { code: 'purchase:delete',  label: 'Delete Purchase Orders', module: 'Purchasing' },
  { code: 'purchase:approve', label: 'Approve Purchase Orders',module: 'Purchasing' },

  // ── Inventory ─────────────────────────────────────────────
  { code: 'stock:view',    label: 'View Stock',             module: 'Inventory' },
  { code: 'stock:adjust',  label: 'Adjust Stock',           module: 'Inventory' },
  { code: 'warehouse:manage', label: 'Manage Warehouses',   module: 'Inventory' },
  { code: 'item:create',   label: 'Create Items',           module: 'Inventory' },
  { code: 'item:edit',     label: 'Edit Items',             module: 'Inventory' },

  // ── Customers ─────────────────────────────────────────────
  { code: 'customer:create', label: 'Create Customers',     module: 'Customers' },
  { code: 'customer:view',   label: 'View Customers',       module: 'Customers' },
  { code: 'customer:edit',   label: 'Edit Customers',       module: 'Customers' },
  { code: 'customer:delete', label: 'Delete Customers',     module: 'Customers' },

  // ── Suppliers ─────────────────────────────────────────────
  { code: 'supplier:create', label: 'Create Suppliers',     module: 'Suppliers' },
  { code: 'supplier:view',   label: 'View Suppliers',       module: 'Suppliers' },
  { code: 'supplier:edit',   label: 'Edit Suppliers',       module: 'Suppliers' },
  { code: 'supplier:delete', label: 'Delete Suppliers',     module: 'Suppliers' },

  // ── Reports ───────────────────────────────────────────────
  { code: 'report:financial', label: 'Financial Reports',   module: 'Reports' },
  { code: 'report:sales',     label: 'Sales Reports',       module: 'Reports' },
  { code: 'report:purchases', label: 'Purchase Reports',    module: 'Reports' },
  { code: 'report:inventory', label: 'Inventory Reports',   module: 'Reports' },
  { code: 'report:tax',       label: 'Tax Reports',         module: 'Reports' },

  // ── Accounting ────────────────────────────────────────────
  { code: 'account:create', label: 'Create Accounts',       module: 'Accounting' },
  { code: 'account:view',   label: 'View Accounts',         module: 'Accounting' },
  { code: 'account:edit',   label: 'Edit Accounts',         module: 'Accounting' },
  { code: 'account:delete', label: 'Delete Accounts',       module: 'Accounting' },
  { code: 'journal:entry',  label: 'Journal Entries',       module: 'Accounting' },

  // ── Tax ───────────────────────────────────────────────────
  { code: 'tax:manage', label: 'Manage Tax Rates',          module: 'Tax' },
  { code: 'tax:view',   label: 'View Tax Rates',            module: 'Tax' },
];

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
  console.log('Seeding system roles...');
  for (const sr of SYSTEM_ROLES) {
    await db.role.upsert({
      where: { systemKey: sr.systemKey },
      update: { name: sr.name, icon: sr.icon, color: sr.color },
      create: { ...sr, isSystem: true },
    });
  }
  console.log(`Seeded ${SYSTEM_ROLES.length} system roles.`);

  console.log('Seeding permissions...');
  for (const perm of permissions) {
    await db.permission.upsert({
      where: { code: perm.code },
      update: { label: perm.label, module: perm.module },
      create: perm,
    });
  }
  console.log(`Seeded ${permissions.length} permissions.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
