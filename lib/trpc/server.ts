import type { Prisma } from '@prisma/client';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth/auth-server';
import { type AppAbilityType, defineAbilitiesFor } from '@/lib/abilities';
import db from '../db';

// ---------------------------------------------------------------------------
// 1. Standalone Select Block (Best Practice: Prevents Circular Types)
// ---------------------------------------------------------------------------
const userSelect = {
  id: true,
  name: true,
  email: true,
  organizationId: true,
  platformRole: true,
  userOrganizationRoles: {
    where: {
      isActive: true,
      deletedAt: null,
    },
    select: { role: true },
    take: 1,
  },
} as const;

// ---------------------------------------------------------------------------
// 2. Automated Type Inference (Best Practice: Zero-Maintenance Database Sync)
// ---------------------------------------------------------------------------
type DbUserPayload = Prisma.UserGetPayload<{ select: typeof userSelect }>;

export type ContextUser = Omit<DbUserPayload, 'userOrganizationRoles'> & {
  orgRole: import('@prisma/client').OrgRole | null;
  permissions: string[];
};

// ---------------------------------------------------------------------------
// 3. Explicit Context Contract (Best Practice: Fast Compilation & Fail-Fast Safety)
// ---------------------------------------------------------------------------
export interface Context {
  db: typeof db;
  req: NextRequest;
  ipAddress: string;
  session: Awaited<ReturnType<typeof auth.api.getSession>> | null;
  user: ContextUser | null;
  ability: AppAbilityType;
}

// ---------------------------------------------------------------------------
// 4. Request Context Builder (Best Practice: Decoupled Web/Adapter Layer)
// ---------------------------------------------------------------------------
export async function createContext(opts: FetchCreateContextFnOptions): Promise<Context> {
  // Cast standard Request to NextRequest to preserve custom properties (cookies, nextUrl)
  const { req } = opts as unknown as { req: NextRequest };

  const ipAddress =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  // Resolve Auth Session
  let betterSession: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
  try {
    betterSession = await auth.api.getSession({ headers: req.headers });
  } catch {
    // Treat invalid tokens as unauthenticated
  }

  // Early Return: Unauthenticated User Branch
  if (!betterSession?.user) {
    return {
      db,
      req,
      ipAddress,
      session: null,
      user: null,
      ability: defineAbilitiesFor({
        id: '',
        platformRole: 'USER',
        permissions: [],
      }),
    };
  }

  // Fetch Full User Database Record
  const dbUser = await db.user.findUnique({
    where: { id: betterSession.user.id, isActive: true, deletedAt: null },
    select: {
      ...userSelect,
      userOrganizationRoles: {
        ...userSelect.userOrganizationRoles,
        where: {
          ...userSelect.userOrganizationRoles.where,
          organizationId: betterSession.user.organizationId ?? undefined,
        },
      },
    },
  });

  // Early Return: Session Valid but User Row Missing/Deactivated
  if (!dbUser) {
    return {
      db,
      req,
      ipAddress,
      session: betterSession,
      user: null,
      ability: defineAbilitiesFor({
        id: '',
        platformRole: 'USER',
        permissions: [],
      }),
    };
  }

  const orgRole = dbUser.userOrganizationRoles[0]?.role ?? null;
  let permissionCodes: string[] = [];

  // Load Permissions synchronously into context to prevent N+1 queries downstream
  if (orgRole && dbUser.platformRole !== 'SUPER_ADMIN') {
    const rolePerms = await db.rolePermission.findMany({
      where: { role: orgRole },
      select: { permission: { select: { code: true } } },
    });
    permissionCodes = rolePerms.map((rp) => rp.permission.code);
  }

  const contextUser: ContextUser = {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    organizationId: dbUser.organizationId,
    platformRole: dbUser.platformRole,
    orgRole,
    permissions: permissionCodes,
  };

  // Synchronously compute CASL Ability for direct procedure access
  const ability = defineAbilitiesFor({
    id: dbUser.id,
    platformRole: dbUser.platformRole,
    orgRole: orgRole ?? undefined,
    organizationId: dbUser.organizationId ?? undefined,
    permissions: permissionCodes as import('@/lib/abilities').Action[],
  });

  return {
    db,
    req,
    ipAddress,
    session: betterSession,
    user: contextUser,
    ability,
  };
}
