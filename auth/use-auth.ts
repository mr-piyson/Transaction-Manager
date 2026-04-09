import { authClient } from '@/auth/auth-client'; // Adjust path to your client
import { useState } from 'react';

export const useAuth = () => {
  // 1. Get the session state (This already works like a tRPC query)
  const {
    data: session,
    isPending: isSessionLoading,
    error: sessionError,
  } = authClient.useSession();

  // 2. Local state for mutations (login/signup)
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (email: string, password: string) => {
    setIsPending(true);
    setError(null);

    const { data, error: authError } = await authClient.signIn.email(
      {
        email,
        password,
      },
      {
        // Optional: Better-Auth internal hooks
        onError: (ctx) => {
          setError(ctx.error.message || 'An error occurred');
        },
      },
    );

    setIsPending(false);
    return { data, error: authError };
  };

  const signOut = async () => {
    setIsPending(true);
    await authClient.signOut();
    setIsPending(false);
  };

  return {
    // Data
    session,
    user: session?.user ?? null,

    // Status Flags
    isPending: isPending || isSessionLoading,
    error: error || (sessionError ? 'Failed to fetch session' : null),
    isAuthenticated: !!session,

    // Actions
    signIn,
    signOut,
  };
};
