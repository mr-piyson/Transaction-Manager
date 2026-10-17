/**
 * Route → permission manifest.
 *
 * Single declarative map of which permission each **page route** requires. It
 * is the reference the server route guards (app/(dashboard)/**\/layout.tsx and
 * the /new and /[id]/edit pages) and the CI completeness check
 * (scripts/check-permissions.mjs) are written against.
 *
 * The app enforces authorization at two levels:
 *   1. Route level (this file) — UX / defence in depth: a crafted URL cannot
 *      reach a screen the user has no permission for.
 *   2. API level (tRPC `.require(...)` / `assertCan(...)`) — the real security
 *      boundary. Route guards never replace it.
 *
 * Resolution convention:
 *   • `/new`            → `create`
 *   • `/[id]/edit`      → `update`
 *   • anything else     → `read` (list + detail)
 */

import type { Action } from "./engine";

export interface RoutePermissionRule {
  /** Path prefix without a trailing slash. Longest match wins. */
  match: string;
  /** Permission required to view the list / detail routes. */
  read: Action | Action[];
  /** Permission required to open `/new`. */
  create?: Action;
  /** Permission required to open `/[id]/edit`. */
  update?: Action;
}

export const ROUTE_PERMISSIONS: readonly RoutePermissionRule[] = [
  {
    match: "/erp/documents/invoices",
    read: "invoice:read",
    create: "invoice:create",
    update: "invoice:update",
  },
  {
    // Quotations are Invoice rows with type = QUOTE.
    match: "/erp/documents/quotations",
    read: "invoice:read",
    create: "invoice:create",
    update: "invoice:update",
  },
  {
    match: "/erp/items",
    read: "item:read",
    create: "item:create",
    update: "item:update",
  },
  {
    match: "/erp/customers",
    read: "customer:read",
    create: "customer:create",
    update: "customer:update",
  },
  {
    match: "/erp/suppliers",
    read: "supplier:read",
    create: "supplier:create",
    update: "supplier:update",
  },
  {
    match: "/erp/warehouses",
    read: "warehouse:read",
    create: "warehouse:create",
    update: "warehouse:update",
  },
  {
    match: "/erp/purchase-orders",
    read: "po:read",
    create: "po:create",
    update: "po:update",
  },
  {
    match: "/erp/expenses",
    read: "expense:read",
    create: "expense:create",
    update: "expense:update",
  },
  {
    match: "/erp/incomes",
    read: "income:read",
    create: "income:create",
    update: "income:update",
  },
  {
    // Contracts reuse invoicing permissions (matching server/contracts).
    match: "/erp/contracts",
    read: "invoice:read",
    update: "invoice:update",
  },
  {
    match: "/erp/subscriptions",
    read: "subscription:read",
    create: "subscription:create",
    update: "subscription:update",
  },
  {
    match: "/erp/stock",
    read: "stock:read",
  },
  {
    // Reports: any report permission grants access; each report page narrows
    // further through its own procedure checks.
    match: "/erp/reports",
    read: ["report:financial", "report:inventory", "report:sales"],
  },
  {
    match: "/settings",
    read: "org:settings:read",
  },
  {
    match: "/settings/permissions",
    read: "role:manage",
  },
  {
    match: "/settings/users",
    read: "user:manage",
  },
] as const;

function normalize(pathname: string): string {
  if (!pathname) return "/";
  const stripped = pathname.split("?")[0].split("#")[0];
  if (stripped.length > 1 && stripped.endsWith("/")) {
    return stripped.slice(0, -1);
  }
  return stripped;
}

/**
 * Returns the permission required to render `pathname`, or `null` when the
 * route is intentionally open to any authenticated org member (e.g. the
 * dashboard home and notifications).
 */
export function resolveRoutePermission(
  pathname: string,
): Action | Action[] | null {
  const path = normalize(pathname);

  const rule = ROUTE_PERMISSIONS.filter(
    (r) => path === r.match || path.startsWith(`${r.match}/`),
  ).sort((a, b) => b.match.length - a.match.length)[0];

  if (!rule) return null;

  const tail = path.slice(rule.match.length);

  if (/(^|\/)new$/.test(tail) && rule.create) return rule.create;
  if (/\/edit$/.test(tail) && rule.update) return rule.update;

  return rule.read;
}
