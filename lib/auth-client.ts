import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  // Dynamically grab the current URL depending on where the app is opened
  baseURL:
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3005',
});

export const { signIn, signUp, signOut, useSession } = authClient;
