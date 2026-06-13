/**
 *
 * CASL subject and action definitions.
 *
 * DESIGN DECISIONS:
 * 1. Actions are verb-based strings rather than an enum so that new permissions
 * can be added without a code change — they're seeded in the DB.
 * 2. Subjects map 1:1 to Prisma model names so CASL can do field-level checks
 * using actual Prisma model objects (passed via subject() helper).
 * 3. `manage` is CASL's built-in wildcard — avoid assigning it directly in
 * production; keep permissions granular.
 * 4. The `all` subject is CASL's wildcard — only SUPER_ADMIN gets this.
 */

import type { MongoAbility, RawRuleOf } from '@casl/ability';
import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import type { OrgRole, PlatformRole } from '@prisma/client';

// ---------------------------------------------------------------------------
// Actions — mirrors the Permission.code column values in the DB.
// Convention: "resource:action"
// ---------------------------------------------------------------------------

export type Action =
  // Invoices
  | 'invoice:create'
  | 'invoice:read'
  | 'invoice:update'
  | 'invoice:delete'
  | 'invoice:send'
  | 'invoice:cancel'
  | 'invoice:approve'
  | 'invoice:payment:create'
  | 'invoice:payment:delete'
  // Customers
  | 'customer:create'
  | 'customer:read'
  | 'customer:update'
  | 'customer:delete'
  // Items
  | 'item:create'
  | 'item:read'
  | 'item:update'
  | 'item:delete'
  // Stock
  | 'stock:read'
  | 'stock:adjust'
  | 'stock:transfer'
  // Purchase Orders
  | 'po:create'
  | 'po:read'
  | 'po:update'
  | 'po:delete'
  | 'po:approve'
  | 'po:receive'
  // Expenses
  | 'expense:create'
  | 'expense:read'
  | 'expense:update'
  | 'expense:delete'
  // Reports
  | 'report:financial'
  | 'report:inventory'
  | 'report:sales'
  // Settings / admin
  | 'org:settings:read'
  | 'org:settings:update'
  | 'user:manage'
  | 'role:manage';

// ---------------------------------------------------------------------------
// Subjects — Prisma model names + "all" wildcard for SUPER_ADMIN
// ---------------------------------------------------------------------------

export type SubjectName =
  | 'Invoice'
  | 'InvoiceLine'
  | 'Payment'
  | 'Customer'
  | 'Item'
  | 'Stock'
  | 'StockMovement'
  | 'PurchaseOrder'
  | 'PurchaseLine'
  | 'Expense'
  | 'Organization'
  | 'User'
  | 'all';

// Accepts either the string literal of the model (for generic checks)
// or a Prisma POJO (for field/condition checks via the subject() helper).
export type Subjects = SubjectName | Record<string, unknown>;

// Note: We include 'manage' here so CASL recognizes the wildcard action natively.
export type AppAbilityType = MongoAbility<[Action | 'manage', Subjects]>;

export const createAppAbility = (rules?: RawRuleOf<AppAbilityType>[]) =>
  createMongoAbility<AppAbilityType>(rules);

// --------------------------------------------------------------------
// Types & Constants
// --------------------------------------------------------------------

export interface AbilityUser {
  id: string;
  platformRole: PlatformRole;
  orgRole?: OrgRole;
  organizationId?: string;
  /** Pre-loaded permission codes from RolePermission table. */
  permissions: Action[];
}

// Extracted for cleaner code. Used to enforce VIEWER explicit denials.
const MUTATION_ACTIONS: Action[] = [
  'invoice:create',
  'invoice:update',
  'invoice:delete',
  'invoice:send',
  'invoice:cancel',
  'invoice:approve',
  'invoice:payment:create',
  'invoice:payment:delete',
  'customer:create',
  'customer:update',
  'customer:delete',
  'item:create',
  'item:update',
  'item:delete',
  'stock:adjust',
  'stock:transfer',
  'po:create',
  'po:update',
  'po:delete',
  'po:approve',
  'po:receive',
  'expense:create',
  'expense:update',
  'expense:delete',
  'org:settings:update',
  'user:manage',
  'role:manage',
];

/**
 * Maps a permission code prefix to a CASL subject name.
 */
const RESOURCE_TO_SUBJECT_MAP: Record<string, SubjectName> = {
  invoice: 'Invoice',
  customer: 'Customer',
  item: 'Item',
  stock: 'Stock',
  po: 'PurchaseOrder',
  expense: 'Expense',
  org: 'Organization',
  user: 'User',
  report: 'all', // Reports aren't tied to a specific DB model row
  role: 'all',
};

// --------------------------------------------------------------------
// Ability Builder
// --------------------------------------------------------------------

/**
 * Returns a frozen CASL AppAbility for the given user.
 * Call this once per request — store the result in tRPC context.
 */
export function defineAbilitiesFor(user: AbilityUser): AppAbilityType {
  const { can, cannot, build } = new AbilityBuilder<AppAbilityType>(createAppAbility);

  // ─── SUPER_ADMIN: platform-wide unrestricted access ───────────────────────
  if (user.platformRole === 'SUPER_ADMIN') {
    can('manage', 'all');
    return build();
  }

  const orgId = user.organizationId;

  // Guard: all non-super-admin users must have an org
  if (!orgId) {
    return build();
  }

  const orgScope = { organizationId: orgId };

  // ─── OWNER: all actions within their org ──────────────────────────────────
  if (user.orgRole === 'OWNER') {
    can('manage', 'all', orgScope);
    return build();
  }

  // ─── Permission-driven roles ──────────────────────────────────────────────
  // Each permission code maps directly to a CASL (action, subject) rule.
  for (const permission of user.permissions) {
    const resource = permission.split(':')[0];

    if (!resource) continue;

    const subject = RESOURCE_TO_SUBJECT_MAP[resource];
    if (!subject) continue;

    can(permission, subject, orgScope);
  }

  // ─── Explicit denials (cannot) ────────────────────────────────────────────
  // CASL evaluates rules in reverse order. By placing `cannot` at the end,
  // we guarantee that VIEWERs are strictly blocked from mutations,
  // overriding any rogue permissions granted in the database.
  if (user.orgRole === 'VIEWER') {
    cannot(MUTATION_ACTIONS, 'all');
  }

  return build();
}
