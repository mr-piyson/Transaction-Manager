import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import db from '@/lib/database';
import { env } from '@/lib/env';
import { Role } from '@prisma/client';

// --- Types & Constants ---
export interface TokenPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
  role: Role;
  slug?: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: TokenPayload;
}

export const COOKIE_NAMES = {
  ACCESS: 'access_token',
  REFRESH: 'refresh_token',
} as const;

export const EXPIRY = {
  ACCESS_TOKEN_EXPIRY: 60 * 60 * 24, // Matches your original 24h logic
  REFRESH_TOKEN_EXPIRY: 60 * 60 * 24 * 7,
};

/**
 * Generates new access and refresh tokens, persists the session to the database,
 * and sets the corresponding secure cookies.
 * @param userId - The unique identifier of the user.
 * @param email - The user's email address to be encoded in the access token.
 * @returns An object containing the generated `accessToken` and `refreshToken`.
 */

export async function issueSession(userId: string, email: string, role: Role, slug?: string) {
  const accessToken = jwt.sign({ userId, email, role, slug }, env.JWT_SECRET_ACCESS, {
    expiresIn: EXPIRY.ACCESS_TOKEN_EXPIRY,
  });
  const refreshToken = jwt.sign({ userId }, env.JWT_SECRET_REFRESH, {
    expiresIn: EXPIRY.REFRESH_TOKEN_EXPIRY,
  });

  // 1. Persist Refresh Token
  const expiresAt = new Date(Date.now() + EXPIRY.REFRESH_TOKEN_EXPIRY * 1000);
  await db.token.deleteMany({ where: { userId, type: 'refresh' } });
  await db.token.create({
    data: { userId, value: refreshToken, expiresAt, type: 'refresh' },
  });

  // 2. Set Cookies
  const cookieStore = await cookies();
  const baseOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };

  cookieStore.set(COOKIE_NAMES.ACCESS, accessToken, {
    ...baseOptions,
    maxAge: EXPIRY.ACCESS_TOKEN_EXPIRY,
  });
  cookieStore.set(COOKIE_NAMES.REFRESH, refreshToken, {
    ...baseOptions,
    maxAge: EXPIRY.REFRESH_TOKEN_EXPIRY,
  });

  return { accessToken, refreshToken };
}

/**
 * Invalidates a user session by deleting the refresh token from the database
 * and removing session cookies from the client.
 * @param refreshToken - (Optional) The current refresh token to be revoked in the DB.
 */
export async function clearSession(refreshToken?: string) {
  const cookieStore = await cookies();
  if (refreshToken) {
    await db.token.deleteMany({
      where: { value: refreshToken, type: 'refresh' },
    });
  }
  cookieStore.delete(COOKIE_NAMES.ACCESS);
  cookieStore.delete(COOKIE_NAMES.REFRESH);
}
