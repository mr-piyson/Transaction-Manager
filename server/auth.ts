import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string | null;
  slug?: string;
}

/**
 * Retrieves the current authenticated user from the session.
 * Uses better-auth session API.
 * @returns The user object if authenticated, otherwise null.
 */
export async function getCurrentUser() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) return null;

    // Map better-auth user to the format expected by the app
    return {
      ...session.user,
      userId: session.user.id,
      // slug: session.user.organization?.slug, // If needed, would need a join
    };
  } catch (error) {
    return null;
  }
}
