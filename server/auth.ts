import db from '@/lib/database';
import { env } from '@/lib/env';
import jwt from 'jsonwebtoken';
import {
  AuthResult,
  clearSession,
  COOKIE_NAMES,
  issueSession,
  TokenPayload,
} from '@/lib/jwt';
import { compare, hash } from 'bcryptjs';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { SIGNUP_SCHEMA } from '@/lib/schemas';

/**
 * Registers a new user, hashes their password, and initializes a session.
 *  @param data - The signup data validated against SIGNUP_SCHEMA.
 * @returns An AuthResult containing the user's basic info or a descriptive error.
 */
export async function signUp(
  data: z.infer<typeof SIGNUP_SCHEMA>,
): Promise<AuthResult> {
  try {
    const validation = SIGNUP_SCHEMA.safeParse(data);
    if (!validation.success)
      return { success: false, error: validation.error.message };

    const existingUser = await db.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existingUser) return { success: false, error: 'User already exists' };

    const user = await db.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: await hash(data.password, 12),
        fullName: data.name,
        firstName: data.name.split(' ')[0],
        lastName: data.name.split(' ').pop() || '',
        role: 'SUPER_ADMIN',
      },
    });

    await issueSession(user.id, user.email);
    return {
      success: true,
      user: { userId: user.id, email: user.email, role: user.role },
    };
  } catch (error) {
    return { success: false, error: 'Registration failed' };
  }
}

/**
 * Authenticates a user by email and password.
 * If successful, issues new session tokens and sets secure cookies.
 * @param credentials - The user's login email and plain-text password.
 * @returns AuthResult indicating success status and user data.
 */
export async function signIn(credentials: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  try {
    const user = await db.user.findUnique({
      where: { email: credentials.email.toLowerCase() },
    });

    if (!user || !(await compare(credentials.password, user.passwordHash))) {
      return { success: false, error: 'Invalid credentials' };
    }

    await issueSession(user.id, user.email);
    return {
      success: true,
      user: { userId: user.id, email: user.email, role: user.role },
    };
  } catch (error) {
    return { success: false, error: 'Login failed' };
  }
}

/**
 * Logs out the current user by clearing their session from the database
 * and removing all authentication cookies.
 * @returns AuthResult with success status.
 */
export async function signOut(): Promise<AuthResult> {
  const cookieStore = await cookies();
  await clearSession(cookieStore.get(COOKIE_NAMES.REFRESH)?.value);
  return { success: true };
}

/**
 * Retrieves the current authenticated user from the session.
 * * This function checks the access token first. If expired, it attempts to
 * validate the refresh token against the database and issue a new session
 * automatically (Silent Refresh).
 * @returns The decoded token payload if authenticated, otherwise null.
 */
export async function getCurrentUser(): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;

    if (accessToken) {
      try {
        return jwt.verify(accessToken, env.JWT_SECRET_ACCESS) as TokenPayload;
      } catch (error) {
        if (!(error instanceof jwt.TokenExpiredError)) return null;
      }
    }

    // Refresh Logic
    const refreshToken = cookieStore.get(COOKIE_NAMES.REFRESH)?.value;
    if (!refreshToken) return null;

    const storedToken = await db.tokens.findUnique({
      where: {
        value: refreshToken,
        type: 'refresh',
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!storedToken || !storedToken.user) {
      await clearSession();
      return null;
    }

    await issueSession(storedToken.userId, storedToken.user.email);
    return {
      userId: storedToken.userId,
      email: storedToken.user.email,
      role: storedToken.user.role,
    };
  } catch (error) {
    return null;
  }
}
