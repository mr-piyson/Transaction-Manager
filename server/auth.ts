import { z } from 'zod';
import { protactedProcedure, publicProcedure, t } from '@/lib/trpc/server';
import { TRPCError } from '@trpc/server';
import db from '@/lib/db';
import { auth } from '@/auth/auth-server';
import { headers } from 'next/headers';

export const authRouter = t.router({
  signIn: publicProcedure
    .input(
      z.object({
        email: z.email(),
        password: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const { email, password } = input;
        const user = await auth.api.signInEmail({
          body: {
            email,
            password,
          },
        });
        return user;
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to create account',
        });
      }
    }),
  signUp: publicProcedure
    .input(
      z.object({
        name: z.string(),
        email: z.email(),
        password: z.string(),
        image: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { name, email, password, image } = input;
    }),
  // Getting current session
  getSession: publicProcedure.query(async () => {
    // We pass headers to Better-Auth to validate the session cookie
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session;
  }),
});
