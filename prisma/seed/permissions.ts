/**
 * Permission definitions — single source of truth.
 * Used by: prisma/seed.ts, setup.router.ts
 */

export interface PermissionDefinition {
  code: string;
  label: string;
  module: string;
}

export const PERMISSIONS: readonly PermissionDefinition[] = [
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

  // ── HRMS ──────────────────────────────────────────────────
  { code: 'hr:employee:create', label: 'Create Employees',        module: 'HRMS' },
  { code: 'hr:employee:view',   label: 'View Employees',          module: 'HRMS' },
  { code: 'hr:employee:edit',   label: 'Edit Employees',          module: 'HRMS' },
  { code: 'hr:leave:manage',    label: 'Manage Leave Requests',    module: 'HRMS' },
  { code: 'hr:attendance:view', label: 'View Attendance',         module: 'HRMS' },
  { code: 'hr:payroll:manage',  label: 'Manage Payroll',          module: 'HRMS' },
  { code: 'hr:recruitment:manage', label: 'Manage Recruitment',   module: 'HRMS' },
  { code: 'hr:training:manage', label: 'Manage Training',         module: 'HRMS' },
  { code: 'hr:performance:manage', label: 'Manage Performance',   module: 'HRMS' },

  // ── CRM ───────────────────────────────────────────────────
  { code: 'crm:lead:create',  label: 'Create Leads',             module: 'CRM' },
  { code: 'crm:lead:view',    label: 'View Leads',               module: 'CRM' },
  { code: 'crm:lead:edit',    label: 'Edit Leads',               module: 'CRM' },
  { code: 'crm:lead:delete',  label: 'Delete Leads',             module: 'CRM' },
  { code: 'crm:opportunity:create', label: 'Create Opportunities', module: 'CRM' },
  { code: 'crm:opportunity:view',   label: 'View Opportunities',   module: 'CRM' },
  { code: 'crm:opportunity:edit',   label: 'Edit Opportunities',   module: 'CRM' },
  { code: 'crm:campaign:manage', label: 'Manage Campaigns',       module: 'CRM' },
  { code: 'crm:contact:manage', label: 'Manage Contacts',         module: 'CRM' },
  { code: 'crm:pipeline:manage', label: 'Manage Pipelines',       module: 'CRM' },
] as const;
