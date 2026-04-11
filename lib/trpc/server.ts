import { getSession } from '@/auth/auth-server';
import { initTRPC, TRPCError } from '@trpc/server';
import db from '@/lib/db';

// Define the context
export const createContext = async () => {
  // Fetch the current session using better-auth
  const sessionData = await getSession();

  return {
    db,
    user: sessionData?.user || null,
    session: sessionData?.session || null,
  };
};

// Initialize tRPC with the context type
export const t = initTRPC.context<typeof createContext>().create();

/**
 * ================================
 * Middlewares
 * ================================
 */

// Create an Authentication Middleware
const authMiddleware = t.middleware(({ ctx, next }) => {
  if (!ctx.user || !ctx.session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    });
  }

  // Pass the user to the next procedure, guaranteeing it is not null
  return next({
    ctx: {
      ...ctx,
      // Type override: user and session are strictly non-null here
      user: ctx.user,
      session: ctx.session,
    },
  });
});

// Base router
export const router = t.router;
// Base procedure
export const publicProcedure = t.procedure;
// Authed procedure
export const protectedProcedure = t.procedure.use(authMiddleware);
