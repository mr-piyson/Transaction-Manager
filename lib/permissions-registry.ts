/**
 * Permission definitions — SINGLE SOURCE OF TRUTH.
 *
 * This registry drives everything:
 *   - DB seeding (`prisma db seed` via prisma/seed/index.ts)
 *   - The CASL `Action` type in lib/abilities.ts (derived from this array,
 *     so a code present here but missing elsewhere — or vice versa — fails
 *     to compile instead of silently breaking authorization)
 *   - Boot-time permission sync (server/shared/permission-sync.ts)
 *
 * IMPORTANT: codes MUST match what routers pass to assertCan(), e.g.
 * "invoice:create" ↔ assertCan(ctx.ability, "invoice:create", "Invoice").
 *
 * To add a feature's permissions:
 *   1. Add entries here (module = display group in Settings → Permissions).
 *   2. Map the resource prefix in RESOURCE_TO_SUBJECT_MAP (lib/abilities.ts).
 *   3. Add mutation codes to MUTATION_ACTIONS (lib/abilities.ts).
 *   4. Deploy — rows and OWNER grants are synced automatically at boot.
 */

export interface PermissionDefinition {
  code: string;
  label: string;
  module: string;
}

export const PERMISSIONS = [
  // ── Users & Roles ─────────────────────────────────────────
  { code: "user:manage", label: "Manage Users", module: "Users & Roles" },
  { code: "role:manage", label: "Manage Roles", module: "Users & Roles" },

  // ── Organization Settings ─────────────────────────────────
  {
    code: "org:settings:read",
    label: "View Organization Settings",
    module: "Organization",
  },
  {
    code: "org:settings:update",
    label: "Update Organization Settings",
    module: "Organization",
  },

  // ── Exchange Rates ────────────────────────────────────────
  {
    code: "exchange-rate:read",
    label: "View Exchange Rates",
    module: "Exchange Rates",
  },
  {
    code: "exchange-rate:update",
    label: "Manage Exchange Rates",
    module: "Exchange Rates",
  },
  {
    code: "exchange-rate:sync",
    label: "Sync Exchange Rates",
    module: "Exchange Rates",
  },

  // ── Invoicing ─────────────────────────────────────────────
  { code: "invoice:create", label: "Create Invoices", module: "Invoicing" },
  { code: "invoice:read", label: "View Invoices", module: "Invoicing" },
  { code: "invoice:update", label: "Edit Invoices", module: "Invoicing" },
  { code: "invoice:delete", label: "Delete Invoices", module: "Invoicing" },
  { code: "invoice:send", label: "Send Invoices", module: "Invoicing" },
  { code: "invoice:cancel", label: "Cancel Invoices", module: "Invoicing" },
  { code: "invoice:approve", label: "Approve Invoices", module: "Invoicing" },
  {
    code: "invoice:payment:create",
    label: "Record Invoice Payments",
    module: "Invoicing",
  },
  {
    code: "invoice:payment:delete",
    label: "Delete Invoice Payments",
    module: "Invoicing",
  },

  // ── Purchasing ────────────────────────────────────────────
  { code: "po:create", label: "Create Purchase Orders", module: "Purchasing" },
  { code: "po:read", label: "View Purchase Orders", module: "Purchasing" },
  { code: "po:update", label: "Edit Purchase Orders", module: "Purchasing" },
  { code: "po:delete", label: "Delete Purchase Orders", module: "Purchasing" },
  {
    code: "po:approve",
    label: "Approve Purchase Orders",
    module: "Purchasing",
  },
  {
    code: "po:receive",
    label: "Receive Purchase Orders",
    module: "Purchasing",
  },

  // ── Inventory ─────────────────────────────────────────────
  { code: "stock:read", label: "View Stock", module: "Inventory" },
  { code: "stock:adjust", label: "Adjust Stock", module: "Inventory" },
  { code: "stock:transfer", label: "Transfer Stock", module: "Inventory" },
  { code: "item:create", label: "Create Items", module: "Inventory" },
  { code: "item:read", label: "View Items", module: "Inventory" },
  { code: "item:update", label: "Edit Items", module: "Inventory" },
  { code: "item:delete", label: "Delete Items", module: "Inventory" },

  // ── Customers ─────────────────────────────────────────────
  { code: "customer:create", label: "Create Customers", module: "Customers" },
  { code: "customer:read", label: "View Customers", module: "Customers" },
  { code: "customer:update", label: "Edit Customers", module: "Customers" },
  { code: "customer:delete", label: "Delete Customers", module: "Customers" },

  // ── Suppliers ─────────────────────────────────────────────
  { code: "supplier:read", label: "View Suppliers", module: "Purchasing" },
  { code: "supplier:create", label: "Create Suppliers", module: "Purchasing" },
  { code: "supplier:update", label: "Edit Suppliers", module: "Purchasing" },
  { code: "supplier:delete", label: "Delete Suppliers", module: "Purchasing" },

  // ── Warehouses ────────────────────────────────────────────
  { code: "warehouse:read", label: "View Warehouses", module: "Inventory" },
  { code: "warehouse:create", label: "Create Warehouses", module: "Inventory" },
  { code: "warehouse:update", label: "Edit Warehouses", module: "Inventory" },
  { code: "warehouse:delete", label: "Delete Warehouses", module: "Inventory" },

  // ── Expenses ──────────────────────────────────────────────
  { code: "expense:create", label: "Create Expenses", module: "Expenses" },
  { code: "expense:read", label: "View Expenses", module: "Expenses" },
  { code: "expense:update", label: "Edit Expenses", module: "Expenses" },
  { code: "expense:delete", label: "Delete Expenses", module: "Expenses" },

  // ── Incomes ───────────────────────────────────────────────
  { code: "income:create", label: "Create Incomes", module: "Incomes" },
  { code: "income:read", label: "View Incomes", module: "Incomes" },
  { code: "income:update", label: "Edit Incomes", module: "Incomes" },
  { code: "income:delete", label: "Delete Incomes", module: "Incomes" },

  // ── Subscriptions ─────────────────────────────────────────
  {
    code: "subscription:read",
    label: "View Subscriptions",
    module: "Subscriptions",
  },
  {
    code: "subscription:create",
    label: "Create Subscriptions",
    module: "Subscriptions",
  },
  {
    code: "subscription:update",
    label: "Edit Subscriptions",
    module: "Subscriptions",
  },
  {
    code: "subscription:delete",
    label: "Delete Subscriptions",
    module: "Subscriptions",
  },
  {
    code: "subscription:renew",
    label: "Record Subscription Renewals",
    module: "Subscriptions",
  },

  // ── Reports ───────────────────────────────────────────────
  { code: "report:financial", label: "Financial Reports", module: "Reports" },
  { code: "report:inventory", label: "Inventory Reports", module: "Reports" },
  { code: "report:sales", label: "Sales Reports", module: "Reports" },

  // ── Categories ────────────────────────────────────────────
  { code: "category:read", label: "View Categories", module: "Categories" },
  { code: "category:create", label: "Create Categories", module: "Categories" },
  { code: "category:update", label: "Edit Categories", module: "Categories" },
  { code: "category:delete", label: "Delete Categories", module: "Categories" },

  // ── Units ─────────────────────────────────────────────────
  { code: "unit:read", label: "View Units", module: "Units" },
  { code: "unit:create", label: "Create Units", module: "Units" },
  { code: "unit:update", label: "Edit Units", module: "Units" },
  { code: "unit:delete", label: "Delete Units", module: "Units" },

  // ── Accounting ────────────────────────────────────────────
  { code: "journal:entry", label: "Journal Entries", module: "Accounting" },

 
] as const;

/** Every valid permission code, as a compile-time union. */
export type PermissionCode = (typeof PERMISSIONS)[number]["code"];

/** Distinct resource prefixes ("invoice", "po", "expense", ...). */
export function getResourcePrefixes(): Set<string> {
  return new Set(PERMISSIONS.map((p) => p.code.split(":")[0]));
}

/**
 * Codes that boot sync / org-setup never auto-grant to non-OWNER roles
 * (platform-level capabilities).
 */
const NON_AUTO_GRANT_PREFIXES = ["org:", "user:"];

export function isAutoGrantable(code: string): boolean {
  return !NON_AUTO_GRANT_PREFIXES.some((prefix) => code.startsWith(prefix));
}
