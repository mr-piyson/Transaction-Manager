import { TRPCError } from '@trpc/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/auth/auth-server';
import { protectedProcedure, publicProcedure, t } from '@/lib/trpc/context';

export const authRouter = t.router({
  signIn: publicProcedure
    .input(
      z.object({
        email: z.email(),
        password: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { email, password } = input;
        const user = await auth.api.signInEmail({
          body: { email, password },
          headers: ctx.req.headers,
        });
        return user;
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to sign in',
        });
      }
    }),
  signUp: publicProcedure
    .input(
      z.object({
        name: z.string(),
        email: z.email(),
        password: z.string(),
        image: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { name, email, password, image } = input;
      const nameParts = name.trim().split(/\s+/);
      try {
        const result = await auth.api.signUpEmail({
          body: {
            name,
            email,
            password,
            image,
            firstName: nameParts[0] ?? name,
            lastName: nameParts.slice(1).join(' ') || '',
            isActive: true,
          } as any,
          headers: ctx.req.headers,
        });
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to sign up',
        });
      }
    }),
  // Getting current session
  session: publicProcedure.query(async () => {
    // We pass headers to Better-Auth to validate the session cookie
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session;
  }),

  // ── SIGN OUT ───────────────────────────────────────────────────────────
  signOut: protectedProcedure.mutation(async ({ ctx }) => {
    // Invalidate the session in Better Auth
    await auth.api.signOut({ headers: ctx.req.headers });
    return { success: true };
  }),

  // ── UPDATE PROFILE ─────────────────────────────────────────────────────
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255).optional(),
        firstName: z.string().max(100).optional(),
        lastName: z.string().max(100).optional(),
        locale: z.enum(['en', 'ar']).optional(),
        timezone: z.string().max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db.user.update({
        where: { id: ctx.user.id },
        data: input,
        select: {
          id: true,
          name: true,
          email: true,
          firstName: true,
          lastName: true,
          locale: true,
          timezone: true,
        },
      });

      return updated;
    }),

  // ── CHANGE PASSWORD ────────────────────────────────────────────────────
  // Delegates to Better Auth's built-in password change endpoint.
  // Returns a redirect token the client sends to /api/auth/change-password.
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(8),
        newPassword: z.string().min(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await auth.api.changePassword({
        headers: ctx.req.headers,
        body: {
          currentPassword: input.currentPassword,
          newPassword: input.newPassword,
        },
      });

      if (!result) {
        throw new Error('Password change failed. Check your current password.');
      }

      return { success: true };
    }),

  // ── LIST SESSIONS ─────────────────────────────────────────────────────
  listSessions: protectedProcedure.query(async ({ ctx }) => {
    const sessions = await auth.api.listSessions({
      headers: ctx.req.headers,
    });
    return sessions;
  }),

  // ── REVOKE SINGLE SESSION ─────────────────────────────────────────────
  revokeSession: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await auth.api.revokeSession({
        headers: ctx.req.headers,
        body: { token: input.token },
      });
      return { success: true };
    }),

  // ── REVOKE ALL OTHER SESSIONS ─────────────────────────────────────────
  revokeOtherSessions: protectedProcedure.mutation(async ({ ctx }) => {
    await auth.api.revokeOtherSessions({
      headers: ctx.req.headers,
    });
    return { success: true };
  }),
});
