import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { jwt } from 'better-auth/plugins';
import db from './database';

export const auth = betterAuth({
  trustedProxyHeaders: true,
  advanced: {
    disableOriginCheck: true,
  },
  database: prismaAdapter(db, {
    provider: 'sqlite',
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
