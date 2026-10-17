/**
 *
 * tRPC initialisation and base procedure builders.
 *
 * THREE PROCEDURE TIERS:
 *
 * publicProcedure  — No auth required (health checks, auth endpoints).
 *
 * protectedProcedure — Requires a valid Better Auth session.
 *   Injects `user` into ctx and guarantees it is non-null.
 *   Use for SUPER_ADMIN operations that aren't org-scoped.
 *
 * orgProcedure — Requires session + org membership.
 *   Additionally guarantees `user.organizationId` is set.
 *   This is the procedure to use for 99% of ERP operations.
 *   CASL ability is already in ctx from createContext.
 *
 * AUTHORIZATION PATTERN:
 * Do NOT put permission checks in middleware — they belong in procedure bodies
 * where you have full context (the specific record being accessed, not just
 * the action type). Middleware enforces authentication; procedures enforce
 * authorization.
 *
 * EXCEPTION: use the `assertCan` helper inside procedures for inline
 * record-level permission checks so that denials throw consistent ForbiddenError
 * instances. Action-level checks should use `.require(code)` instead.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { Action, AppAbilityType, Subjects } from "@/lib/permissions";
import { ForbiddenError, UnauthorizedError } from "../error";
import type { Context } from "./server";

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

export const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // Structured Zod field errors — available as trpcError.data.zodError
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
        // Strip stack in production
        stack:
          process.env.NODE_ENV === "development" ? shape.data.stack : undefined,
      },
    };
  },
});

export const router = t.router;
export const middleware = t.middleware;

// ---------------------------------------------------------------------------
// Logging middleware
// Runs for every request — logs method, duration, error codes.
// Replace with your APM SDK (Datadog, Sentry, etc.) as needed.
// ---------------------------------------------------------------------------

const loggerMiddleware = middleware(async ({ path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const durationMs = Date.now() - start;

  if (process.env.NODE_ENV === "development") {
    const status = result.ok ? "OK" : "ERR";
    console.log(`[tRPC] ${type} ${path} — ${status} (${durationMs}ms)`);
  }

  return result;
});

// ---------------------------------------------------------------------------
// Auth middleware — throws if session is missing
// ---------------------------------------------------------------------------

const isAuthed = middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new UnauthorizedError();
  }
  return next({
    ctx: {
      ...ctx,
      // Narrow the type — user is guaranteed non-null after this middleware
      user: ctx.user,
    },
  });
});

// ---------------------------------------------------------------------------
// Org membership middleware — throws if user has no org association
// ---------------------------------------------------------------------------

const hasOrg = middleware(({ ctx, next }) => {
  if (!ctx.user) throw new UnauthorizedError();
  if (!ctx.user.organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Your account is not associated with an organization. Contact your administrator.",
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: {
        ...ctx.user,
        // After this middleware organizationId is guaranteed non-null
        organizationId: ctx.user.organizationId,
      },
    },
  });
});

// ---------------------------------------------------------------------------
// assertCan — inline record-level permission helper
//
// Use inside procedure bodies AFTER fetching a record, to enforce organization
// scoping / per-record rules. For action-level checks prefer `.require(code)`.
//
// Usage:
//   assertCan(ctx.ability, "invoice:update", "Invoice", existingInvoice);
// ---------------------------------------------------------------------------

export function assertCan(
  ability: AppAbilityType,
  action: Action,
  // The subject is informational only (the engine is flat); kept so the ~40
  // record-level call sites that pass a Prisma record keep their signature.
  _subjectName?: Subjects,
  record?: Record<string, unknown>,
): void {
  if (!ability.can(action, _subjectName, record)) {
    const [resource, ...rest] = action.split(":");
    throw new ForbiddenError(rest.join(":") || action, resource ?? action);
  }
}

// ---------------------------------------------------------------------------
// Exported procedure builders
// ---------------------------------------------------------------------------

/** No authentication required. */
export const publicProcedure = t.procedure.use(loggerMiddleware);

/**
 * Permission middleware backing `.require(...)`.
 *
 * Declarative action-level checks: the required permission is visible on the
 * procedure signature instead of buried in the body, and the CI check
 * (scripts/check-permissions.mjs) can assert every procedure declares one.
 * Record/state checks still use inline `assertCan(...)` after the fetch.
 */
const permissionMiddleware = (required: Action | Action[]) =>
  middleware(({ ctx, next }) => {
    const list = Array.isArray(required) ? required : [required];
    if (!list.some((code) => ctx.ability.can(code))) {
      const [resource, ...rest] = list[0].split(":");
      throw new ForbiddenError(rest.join(":") || list[0], resource ?? list[0]);
    }
    return next();
  });

const protectedProcedureBase = t.procedure.use(loggerMiddleware).use(isAuthed);

/**
 * Requires a valid session. user is non-null.
 * `.require(code)` adds a declarative permission check.
 */
export const protectedProcedure = Object.assign(protectedProcedureBase, {
  require: (required: Action | Action[]) =>
    protectedProcedureBase.use(permissionMiddleware(required)),
});

const orgProcedureBase = t.procedure
  .use(loggerMiddleware)
  .use(isAuthed)
  .use(hasOrg);

/**
 * Requires session + org membership.
 * user.organizationId is non-null.
 * Use this for all ERP domain operations.
 *
 * `.require(code)` adds a declarative permission check (see permissionMiddleware).
 */
export const orgProcedure = Object.assign(orgProcedureBase, {
  require: (required: Action | Action[]) =>
    orgProcedureBase.use(permissionMiddleware(required)),
});
