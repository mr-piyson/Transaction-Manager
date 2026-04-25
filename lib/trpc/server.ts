import { initTRPC, TRPCError } from '@trpc/server';
import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import superjson from 'superjson';
import { ZodError } from 'zod';
import type { Role } from '@prisma/client';
import { auth } from '@/auth/auth-server';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export async function createContext(opts: FetchCreateContextFnOptions) {
  const session = await auth.api.getSession({ headers: opts.req.headers });

  return {
    prisma,
    session,
    user: session?.user ?? null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

// ---------------------------------------------------------------------------
// tRPC init
// ---------------------------------------------------------------------------

export const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;

// ---------------------------------------------------------------------------
// Reusable middleware
// ---------------------------------------------------------------------------

/** Requires a valid Better Auth session. Attaches user + org to ctx. */
const enforceAuth = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  if (!ctx.user.isActive) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Account is disabled' });
  }

  // Resolve the user's org-level role
  const orgRole = ctx.user.organizationId
    ? await ctx.prisma.userOrganizationRole.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.user.id,
            organizationId: ctx.user.organizationId,
          },
        },
        select: { role: true },
      })
    : null;

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      session: ctx.session,
      organizationId: ctx.user.organizationId ?? null,
      orgRole: (orgRole?.role ?? ctx.user.role) as Role,
    },
  });
});

/** Requires ADMIN or SUPER_ADMIN role. */
const enforceAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  const orgRole = ctx.user.organizationId
    ? await ctx.prisma.userOrganizationRole.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.user.id,
            organizationId: ctx.user.organizationId!,
          },
        },
        select: { role: true },
      })
    : null;

  const role = orgRole?.role ?? ctx.user.role;

  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      session: ctx.session,
      organizationId: ctx.user.organizationId ?? null,
      orgRole: role as Role,
    },
  });
});

// ---------------------------------------------------------------------------
// Procedure builders
// ---------------------------------------------------------------------------

export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(enforceAuth);
export const adminProcedure = t.procedure.use(enforceAdmin);
