import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { jwt } from 'better-auth/plugins';
import db from './database';

export const auth = betterAuth({
  trustedProxyHeaders: true,
  trustedOrigins: [
    'http://localhost:3005',
    'http://192.168.3.35:3005', // Allow your local network
    'https://*.ngrok-free.app', // Example: Allow all ngrok tunnels
    'https://*.trycloudflare.com', // Example: Allow Cloudflare tunnels
  ],
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
