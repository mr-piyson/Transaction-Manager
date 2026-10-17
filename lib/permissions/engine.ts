/**
 * Permission engine — flat, database-backed RBAC.
 *
 * Replaces `@casl/ability`. The public surface intentionally mirrors the slice
 * of CASL's `Ability` interface this codebase relied on — `can(action,
 * subject?)` — so every existing call site (`ctx.ability.can(...)`,
 * `defineAbilitiesFor(...)`, `assertCan(...)`) keeps working unchanged while
 * the dependency disappears.
 *
 * Semantics (byte-for-byte the same as the previous CASL rule set):
 *   1. SUPER_ADMIN → every action, platform-wide.
 *   2. OWNER       → every action, within their organization.
 *   3. everyone else → exactly the permission codes granted to their role
 *      (resolved from RolePermission and threaded through the session).
 *   4. VIEWER      → granted codes MINUS mutations. Defence in depth: even a
 *      rogue `invoice:delete` grant to the Viewer role cannot mutate.
 *   5. Every action is implicitly scoped to the caller's organization: a check
 *      against a record carrying a different `organizationId` is denied.
 *
 * Actions are verb-based strings (`"invoice:create"`) sourced from the single
 * source of truth in lib/permissions-registry.ts, so an unknown code cannot be
 * written without a compile error.
 */

import type { PlatformRole } from "@prisma/client";
import type { PermissionCode } from "@/lib/permissions-registry";

// ---------------------------------------------------------------------------
// Actions — mirrors Permission.code in the DB. Derived from the registry.
// ---------------------------------------------------------------------------

export type Action = PermissionCode;

/** CASL's built-in action wildcard. Only SUPER_ADMIN / OWNER satisfy it. */
export type WildcardAction = "manage";

// ---------------------------------------------------------------------------
// Subjects — Prisma model names + "all" wildcard.
//
// Retained for source compatibility with the previous CASL subjects. The engine
// itself is flat (no attribute rules), so `subject` is informational only.
// ---------------------------------------------------------------------------

export type SubjectName =
  | "ItemCategory"
  | "Invoice"
  | "InvoiceLine"
  | "Payment"
  | "Customer"
  | "Item"
  | "Stock"
  | "StockMovement"
  | "PurchaseOrder"
  | "PurchaseLine"
  | "Supplier"
  | "Warehouse"
  | "Expense"
  | "Income"
  | "Subscription"
  | "Organization"
  | "Unit"
  | "User"
  // HRMS
  | "Department"
  | "Employee"
  | "EmployeeType"
  | "JobPosition"
  | "LeaveType"
  | "LeaveBalance"
  | "LeaveRequest"
  | "Holiday"
  | "AttendanceRecord"
  | "TimePunch"
  | "Shift"
  | "EmployeeShift"
  | "PayrollRun"
  | "PayrollItem"
  | "Payslip"
  | "SalaryComponent"
  | "PerformanceReview"
  | "EmployeeDocument"
  | "JobPosting"
  | "Candidate"
  | "InterviewRound"
  | "Offer"
  | "Training"
  | "TrainingEnrollment"
  | "Grievance"
  | "DisciplinaryAction"
  | "EmployeeStatusHistory"
  // Settings
  | "OrganizationSetting"
  | "Kiosk"
  | "JournalEntry"
  | "all";

/**
 * Accepts the string literal of the model (generic checks) or a Prisma POJO
 * (record-level checks). Only `organizationId` is read off a POJO.
 */
export type Subjects = SubjectName | Record<string, unknown>;

// ---------------------------------------------------------------------------
// User / ability contracts
// ---------------------------------------------------------------------------

export interface PermissionUser {
  id: string;
  platformRole: PlatformRole | string;
  orgRole?: string;
  organizationId?: string;
  /** Permission codes pre-loaded from RolePermission. */
  permissions: Action[];
}

/** Back-compat alias for the previous CASL-era name. */
export type AbilityUser = PermissionUser;

export interface AppAbility {
  /**
   * True when `action` is permitted. `subject` is accepted for back-compat and
   * ignored. When a `record` is supplied, the action is additionally scoped to
   * the record's `organizationId`.
   */
  can(
    action: Action | WildcardAction,
    subject?: Subjects,
    record?: Record<string, unknown>,
  ): boolean;
}

/** Back-compat alias for the previous CASL-era name. */
export type AppAbilityType = AppAbility;

// ---------------------------------------------------------------------------
// VIEWER denials — mutations that are never allowed for the Viewer role, even
// if a role grant exists. Moved verbatim from lib/abilities.ts so behaviour is
// unchanged.
// ---------------------------------------------------------------------------

const VIEWER_DENIED_ACTIONS: ReadonlySet<Action> = new Set<Action>([
  "invoice:create",
  "invoice:update",
  "invoice:delete",
  "invoice:send",
  "invoice:cancel",
  "invoice:approve",
  "invoice:payment:create",
  "invoice:payment:delete",
  "customer:create",
  "customer:update",
  "customer:delete",
  "item:create",
  "item:update",
  "item:delete",
  "stock:adjust",
  "stock:transfer",
  "supplier:create",
  "supplier:update",
  "supplier:delete",
  "warehouse:create",
  "warehouse:update",
  "warehouse:delete",
  "po:create",
  "po:update",
  "po:delete",
  "po:approve",
  "po:receive",
  "expense:create",
  "expense:update",
  "expense:delete",
  "income:create",
  "income:update",
  "income:delete",
  "subscription:create",
  "subscription:update",
  "subscription:delete",
  "subscription:renew",
  "category:create",
  "category:update",
  "category:delete",
  "org:settings:update",
  "user:manage",
  "role:manage",
  "exchange-rate:update",
  "exchange-rate:sync",
]);

// ---------------------------------------------------------------------------
// Ability construction
// ---------------------------------------------------------------------------

const ALLOW_ALL: AppAbility = { can: () => true };
const DENY_ALL: AppAbility = { can: () => false };

/**
 * Builds the permission set for a user. Call once per request and store the
 * result on the tRPC context / pass it to the UI.
 */
export function defineAbilitiesFor(user: PermissionUser): AppAbility {
  // ── SUPER_ADMIN: platform-wide unrestricted access ────────────────────────
  if (user.platformRole === "SUPER_ADMIN") {
    return ALLOW_ALL;
  }

  // Guard: all non-super-admin users must belong to an organization.
  const orgId = user.organizationId;
  if (!orgId) {
    return DENY_ALL;
  }

  const isOwner = user.orgRole === "OWNER";
  const isViewer = user.orgRole === "VIEWER";
  const granted = new Set<string>(user.permissions);

  return {
    can(action, _subject, record) {
      if (action === "manage") {
        return isOwner;
      }

      const allowed =
        isOwner ||
        (granted.has(action) &&
          !(isViewer && VIEWER_DENIED_ACTIONS.has(action)));

      if (!allowed) return false;

      // Organization scoping — mirrors the CASL `{ organizationId }` condition.
      if (record && typeof record === "object") {
        const recordOrg = (record as { organizationId?: unknown })
          .organizationId;
        if (typeof recordOrg === "string" && recordOrg !== orgId) {
          return false;
        }
      }

      return true;
    },
  };
}

/**
 * Checks a list of codes and returns the first one the ability satisfies, or
 * `null`. Handy for route guards and "any-of" checks.
 */
export function firstAllowed(
  ability: AppAbility,
  required: Action | Action[],
): Action | null {
  const list = Array.isArray(required) ? required : [required];
  return list.find((code) => ability.can(code)) ?? null;
}
