import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { jwt } from 'better-auth/plugins';
import db from './database';
import { env } from './env';
import { headers } from 'next/headers';

export const auth = betterAuth({
  trustedProxyHeaders: true,
  advanced: {
    disableOriginCheck: true,
  },
  database: prismaAdapter(db, {
    provider: env.DATABASE_PROVIDER,
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [jwt()],
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'USER',
      },
      organizationId: {
        type: 'number',
      },
      firstName: {
        type: 'string',
      },
      lastName: {
        type: 'string',
      },
    },
  },
});

/**
 * Retrieves the current authenticated session.
 * Uses better-auth session API.
 * @returns The session object if authenticated, otherwise null.
 */
export async function getSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}

/**
 * Retrieves the current authenticated user from the session.
 * Uses better-auth session API.
 * @returns The user object if authenticated, otherwise null.
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) {
    return null;
  }
  return session.user;
}
