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
 * EXCEPTION: use the `assertCan` helper inside procedures for inline CASL
 * checks so that denials throw consistent ForbiddenError instances.
 */

import { subject as caslSubject } from '@casl/ability';
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import type { Action, AppAbilityType, Subjects } from '../abilities';
import { ForbiddenError, UnauthorizedError } from '../error';
import type { Context } from './server';

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
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
        // Strip stack in production
        stack: process.env.NODE_ENV === 'development' ? shape.data.stack : undefined,
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

  if (process.env.NODE_ENV === 'development') {
    const status = result.ok ? 'OK' : 'ERR';
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
      code: 'FORBIDDEN',
      message: 'Your account is not associated with an organization. Contact your administrator.',
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
// assertCan — inline CASL check helper
//
// Use inside procedure bodies (not middleware) so you can pass the actual
// Prisma record for field-level and condition-level checks.
//
// Usage:
//   assertCan(ctx.ability, "invoice:update", "Invoice", existingInvoice);
// ---------------------------------------------------------------------------

export function assertCan(
  ability: AppAbilityType,
  action: Action,
  subjectName: Subjects,
  record?: Record<string, unknown>,
): void {
  const target = record ? caslSubject(subjectName as string, record) : subjectName;

  if (!ability.can(action, target as Subjects)) {
    const [resource, ...rest] = action.split(':');
    throw new ForbiddenError(rest.join(':') || action, resource ?? action);
  }
}

// ---------------------------------------------------------------------------
// Exported procedure builders
// ---------------------------------------------------------------------------

/** No authentication required. */
export const publicProcedure = t.procedure.use(loggerMiddleware);

/** Requires a valid session. user is non-null. */
export const protectedProcedure = t.procedure.use(loggerMiddleware).use(isAuthed);

/**
 * Requires session + org membership.
 * user.organizationId is non-null.
 * Use this for all ERP domain operations.
 */
export const orgProcedure = t.procedure.use(loggerMiddleware).use(isAuthed).use(hasOrg);
