/**
 * Public entry point for the permission system (client-safe).
 *
 * Server-only helpers — `requirePermission`, `getRequestAuth` — live in
 * `./server` and must be imported from there.
 */

export * from "./engine";
export * from "./routes";

export {
  type PermissionCode,
  type PermissionDefinition,
  PERMISSIONS,
  getResourcePrefixes,
  isAutoGrantable,
} from "@/lib/permissions-registry";

import type { Action, Subjects } from "./engine";

/** Back-compat aliases for the previous `@/lib/permissions` surface. */
export type AppActions = Action;
export type AppSubjects = Subjects;
