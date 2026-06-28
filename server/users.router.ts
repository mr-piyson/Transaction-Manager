import { hashPassword } from 'better-auth/crypto';
import { z } from 'zod';
import { ForbiddenError, NotFoundError } from '@/lib/error';
import { assertCan, orgProcedure, router } from '@/lib/trpc/context';
import { writeAuditLog } from './audit.service';

const userBaseSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  firstName: z.string().max(255).optional(),
  lastName: z.string().max(255).optional(),
});

const roleSelect = { id: true, name: true, description: true, icon: true, color: true, isSystem: true, systemKey: true, organizationId: true };

const userRoleInclude = (orgId: string) => ({
  userOrganizationRoles: {
    where: { organizationId: orgId, deletedAt: null },
    select: { id: true, role: true, jobTitle: true, isActive: true, roleId: true, customRole: { select: { id: true, name: true, icon: true, color: true, systemKey: true } } },
  },
});

export const usersRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    assertCan(ctx.ability, 'user:manage', 'User');
    const orgId = ctx.user.organizationId!;

    return ctx.db.user.findMany({
      where: { organizationId: orgId, deletedAt: null },
      include: userRoleInclude(orgId),
      orderBy: { createdAt: 'desc' },
    });
  }),

  create: orgProcedure
    .input(
      userBaseSchema.extend({
        roleId: z.string().cuid(),
        isActive: z.boolean().default(true),
        password: z.string().min(6).max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'user:manage', 'User');
      const orgId = ctx.user.organizationId!;

      const existingUser = await ctx.db.user.findFirst({
        where: { email: input.email },
        select: { id: true, deletedAt: true, organizationId: true },
      });

      if (existingUser) {
        if (existingUser.deletedAt) {
          throw new ForbiddenError('create', `User with email "${input.email}" was previously deleted. Contact support to restore.`);
        }
        if (existingUser.organizationId) {
          throw new ForbiddenError('create', `User with email "${input.email}" already belongs to an organization.`);
        }
      }

      return ctx.db.$transaction(async (tx) => {
        let user;

        if (existingUser) {
          user = await tx.user.update({
            where: { id: existingUser.id },
            data: {
              name: input.name,
              firstName: input.firstName,
              lastName: input.lastName,
              isActive: input.isActive,
              organizationId: orgId,
              locale: 'en',
            },
            include: userRoleInclude(orgId),
          });
        } else {
          user = await tx.user.create({
            data: {
              name: input.name,
              email: input.email,
              firstName: input.firstName,
              lastName: input.lastName,
              isActive: input.isActive,
              organizationId: orgId,
              locale: 'en',
              userOrganizationRoles: {
                create: { roleId: input.roleId, organizationId: orgId },
              },
            },
            include: userRoleInclude(orgId),
          });
        }

        if (input.password) {
          const hashed = await hashPassword(input.password);
          const existingAccount = existingUser
            ? await tx.account.findFirst({ where: { userId: existingUser.id, providerId: 'credential' }, select: { id: true } })
            : null;
          await tx.account.upsert({
            where: { id: existingAccount?.id ?? '' },
            create: { userId: user.id, providerId: 'credential', accountId: input.email, password: hashed },
            update: { password: hashed },
          });
        }

        await writeAuditLog(
          { entityType: 'User', entityId: user.id, action: 'CREATE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
          tx,
        );

        return tx.user.findUnique({
          where: { id: user.id },
          include: {
            ...userRoleInclude(orgId),
            accounts: {
              where: { providerId: 'credential' },
              select: { id: true },
            },
          },
        });
      });
    }),

  update: orgProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        name: z.string().min(1).max(255).optional(),
        email: z.string().email().optional(),
        firstName: z.string().max(255).optional(),
        lastName: z.string().max(255).optional(),
        roleId: z.string().cuid().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'user:manage', 'User');
      const orgId = ctx.user.organizationId!;
      const { id, roleId, ...data } = input;

      const existing = await ctx.db.user.findFirst({
        where: { id, organizationId: orgId, deletedAt: null },
        include: {
          userOrganizationRoles: {
            where: { organizationId: orgId, deletedAt: null },
            select: { id: true, roleId: true },
          },
        },
      });
      if (!existing) throw new NotFoundError('User', id);
      if (existing.platformRole === 'SUPER_ADMIN') throw new ForbiddenError('update', 'Cannot modify SUPER_ADMIN users.');

      return ctx.db.$transaction(async (tx) => {
        await tx.user.update({ where: { id }, data });

        if (roleId) {
          const existingRole = existing.userOrganizationRoles[0];
          if (existingRole) {
            if (existingRole.roleId !== roleId) {
              await tx.userOrganizationRole.update({ where: { id: existingRole.id }, data: { roleId } });
            }
          } else {
            await tx.userOrganizationRole.create({ data: { userId: id, organizationId: orgId, roleId } });
          }
        }

        await writeAuditLog(
          { entityType: 'User', entityId: id, action: 'UPDATE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
          tx,
        );

        return tx.user.findUnique({
          where: { id },
          include: {
            ...userRoleInclude(orgId),
            accounts: {
              where: { providerId: 'credential' },
              select: { id: true },
            },
          },
        });
      });
    }),

  setPassword: orgProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        newPassword: z.string().min(6).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'user:manage', 'User');

      const user = await ctx.db.user.findFirst({
        where: { id: input.id, organizationId: ctx.user.organizationId, deletedAt: null },
        select: { id: true, email: true },
      });
      if (!user) throw new NotFoundError('User', input.id);

      const hashed = await hashPassword(input.newPassword);

      await ctx.db.$transaction(async (tx) => {
        const existingAccount = await tx.account.findFirst({
          where: { userId: user.id, providerId: 'credential' },
          select: { id: true },
        });

        if (existingAccount) {
          await tx.account.update({
            where: { id: existingAccount.id },
            data: { password: hashed },
          });
        } else {
          await tx.account.create({
            data: {
              userId: user.id,
              providerId: 'credential',
              accountId: user.email ?? user.id,
              password: hashed,
            },
          });
        }

        await writeAuditLog(
          { entityType: 'User', entityId: user.id, action: 'UPDATE', organizationId: ctx.user.organizationId!, userId: ctx.user.id, ipAddress: ctx.ipAddress },
          tx,
        );
      });

      return { success: true };
    }),

  sendPasswordReset: orgProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'user:manage', 'User');

      const user = await ctx.db.user.findFirst({
        where: { id: input.id, organizationId: ctx.user.organizationId, deletedAt: null },
        select: { id: true, email: true },
      });
      if (!user) throw new NotFoundError('User', input.id);

      const { auth } = await import('@/auth/auth-server');
      await auth.api.requestPasswordReset({
        body: {
          email: user.email!,
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3005'}/auth/reset-password`,
        },
      });

      return { success: true };
    }),

  toggleActive: orgProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'user:manage', 'User');

      const user = await ctx.db.user.findFirst({
        where: { id: input.id, organizationId: ctx.user.organizationId, deletedAt: null },
        select: { id: true, isActive: true, platformRole: true },
      });
      if (!user) throw new NotFoundError('User', input.id);
      if (user.platformRole === 'SUPER_ADMIN') throw new ForbiddenError('toggle', 'Cannot toggle SUPER_ADMIN users.');

      return ctx.db.user.update({
        where: { id: input.id },
        data: { isActive: !user.isActive },
        select: { id: true, isActive: true },
      });
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'user:manage', 'User');

      const user = await ctx.db.user.findFirst({
        where: { id: input.id, organizationId: ctx.user.organizationId, deletedAt: null },
        select: { id: true, platformRole: true },
      });
      if (!user) throw new NotFoundError('User', input.id);
      if (user.platformRole === 'SUPER_ADMIN') throw new ForbiddenError('delete', 'Cannot delete SUPER_ADMIN users.');
      if (input.id === ctx.user.id) throw new ForbiddenError('delete', 'Cannot delete yourself.');

      await ctx.db.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: input.id },
          data: { deletedAt: new Date(), isActive: false, organizationId: null },
        });
        await tx.userOrganizationRole.updateMany({
          where: { userId: input.id, organizationId: ctx.user.organizationId },
          data: { deletedAt: new Date(), isActive: false },
        });
        await writeAuditLog(
          { entityType: 'User', entityId: input.id, action: 'DELETE', organizationId: ctx.user.organizationId!, userId: ctx.user.id, ipAddress: ctx.ipAddress },
          tx,
        );
      });

      return { success: true };
    }),

  // ── Dynamic Roles CRUD ──────────────────────────────────────────────────

  roles: {
    list: orgProcedure.query(async ({ ctx }) => {
      assertCan(ctx.ability, 'user:manage', 'User');
      const orgId = ctx.user.organizationId!;

      return ctx.db.role.findMany({
        where: {
          OR: [
            { isSystem: true },
            { organizationId: orgId },
          ],
          deletedAt: null,
        },
        select: roleSelect,
        orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      });
    }),

    create: orgProcedure
      .input(
        z.object({
          name: z.string().min(1).max(100),
          description: z.string().max(500).optional(),
          icon: z.string().max(50).optional(),
          color: z.string().max(7).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'role:manage', 'all');

        return ctx.db.role.create({
          data: {
            name: input.name,
            description: input.description,
            icon: input.icon,
            color: input.color,
            organizationId: ctx.user.organizationId!,
          },
        });
      }),

    update: orgProcedure
      .input(
        z.object({
          id: z.string().cuid(),
          name: z.string().min(1).max(100).optional(),
          description: z.string().max(500).optional(),
          icon: z.string().max(50).optional(),
          color: z.string().max(7).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'role:manage', 'all');
        const { id, ...data } = input;

        const role = await ctx.db.role.findFirst({
          where: { id, organizationId: ctx.user.organizationId, deletedAt: null },
        });
        if (!role) throw new NotFoundError('Role', id);
        if (role.isSystem) throw new ForbiddenError('update', 'Cannot modify system roles.');

        return ctx.db.role.update({ where: { id }, data });
      }),

    delete: orgProcedure
      .input(z.object({ id: z.string().cuid() }))
      .mutation(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'role:manage', 'all');

        const role = await ctx.db.role.findFirst({
          where: { id: input.id, organizationId: ctx.user.organizationId, deletedAt: null },
        });
        if (!role) throw new NotFoundError('Role', input.id);
        if (role.isSystem) throw new ForbiddenError('delete', 'Cannot delete system roles.');

        await ctx.db.$transaction(async (tx) => {
          await tx.rolePermission.deleteMany({ where: { roleId: input.id } });
          await tx.role.update({ where: { id: input.id }, data: { deletedAt: new Date() } });
        });

        return { success: true };
      }),
  },

  // ── Permissions ──────────────────────────────────────────────────────────

  permissions: {
    list: orgProcedure.query(async ({ ctx }) => {
      assertCan(ctx.ability, 'user:manage', 'User');

      const permissions = await ctx.db.permission.findMany({
        orderBy: [{ module: 'asc' }, { code: 'asc' }],
      });

      return permissions.reduce<Record<string, { code: string; label: string; description: string | null }[]>>(
        (acc, p) => {
          const module = p.module || 'Other';
          if (!acc[module]) acc[module] = [];
          acc[module].push({ code: p.code, label: p.label, description: p.description });
          return acc;
        },
        {},
      );
    }),

    listAll: orgProcedure.query(async ({ ctx }) => {
      assertCan(ctx.ability, 'user:manage', 'User');
      return ctx.db.permission.findMany({ orderBy: [{ module: 'asc' }, { code: 'asc' }] });
    }),
  },

  orgRoles: orgProcedure.query(async ({ ctx }) => {
    assertCan(ctx.ability, 'user:manage', 'User');
    const orgId = ctx.user.organizationId!;

    return ctx.db.role.findMany({
      where: {
        OR: [
          { isSystem: true },
          { organizationId: orgId },
        ],
        deletedAt: null,
      },
      select: roleSelect,
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  }),

  // ── Role Permissions ────────────────────────────────────────────────────

  rolePermissions: {
    list: orgProcedure
      .input(z.object({ roleId: z.string().cuid() }))
      .query(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'user:manage', 'User');

        const rolePerms = await ctx.db.rolePermission.findMany({
          where: { roleId: input.roleId },
          include: { permission: true },
        });
        return rolePerms.map((rp) => rp.permission);
      }),

    update: orgProcedure
      .input(z.object({ roleId: z.string().cuid(), permissionIds: z.array(z.string().cuid()) }))
      .mutation(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'role:manage', 'all');

        const role = await ctx.db.role.findUnique({ where: { id: input.roleId }, select: { systemKey: true } });

        await ctx.db.$transaction(async (tx) => {
          await tx.rolePermission.deleteMany({ where: { roleId: input.roleId } });
          if (input.permissionIds.length > 0) {
            await tx.rolePermission.createMany({
              data: input.permissionIds.map((permissionId) => ({
                roleId: input.roleId,
                role: (role?.systemKey ?? 'VIEWER') as any,
                permissionId,
              })),
            });
          }
        });

        return { success: true };
      }),
  },

  countByRole: orgProcedure.query(async ({ ctx }) => {
    assertCan(ctx.ability, 'user:manage', 'User');
    const orgId = ctx.user.organizationId!;

    const counts = await ctx.db.userOrganizationRole.groupBy({
      by: ['roleId'],
      where: { organizationId: orgId, deletedAt: null, roleId: { not: null } },
      _count: { userId: true },
    });

    const roles = await ctx.db.role.findMany({
      where: { id: { in: counts.map((c) => c.roleId!).filter(Boolean) } },
      select: { id: true, name: true, systemKey: true },
    });

    const roleMap = new Map(roles.map((r) => [r.id, r]));
    const result: Record<string, number> = {};
    for (const c of counts) {
      const key = roleMap.get(c.roleId!)?.systemKey ?? roleMap.get(c.roleId!)?.name ?? c.roleId!;
      result[key] = c._count.userId;
    }
    return result;
  }),
});
