/**
 * settings.router.ts
 *
 * Unified settings router. Groups every app-configuration concern:
 *   - organization   : profile, branding, defaults
 *   - users          : list, invite, role management, activate/deactivate
 *   - sessions       : list active sessions, revoke
 *   - categories     : item categories (name + color)
 *   - taxRates       : VAT / tax rate library
 *   - warehouses     : storage locations
 *   - expenseCategories : expense classification
 *   - currency       : supported currency display (read-only enum list)
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, adminProcedure } from '@/lib/trpc/server';
import { requireOrgId, assertOwnership } from './_shared';

// ─── Reusable sub-schemas ────────────────────────────────────────────────────

const colorHex = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color e.g. #3B82F6')
  .optional();

const currencyEnum = z.enum(['BHD', 'USD', 'EUR', 'GBP', 'SAR', 'AED', 'KWD', 'OMR', 'QAR', 'EGP']);

// ─── Router ──────────────────────────────────────────────────────────────────

export const settingsRouter = router({
  // ===========================================================================
  // ORGANIZATION
  // ===========================================================================

  org: router({
    /** Full org profile — everything needed to render all settings sections */
    get: protectedProcedure.query(async ({ ctx }) => {
      const orgId = requireOrgId(ctx.organizationId);
      return ctx.prisma.organization.findUniqueOrThrow({
        where: { id: orgId },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          stampImage: true,
          address: true,
          phone: true,
          email: true,
          website: true,
          taxId: true,
          currency: true,
          paymentTermsDays: true,
          defaultTermsText: true,
          createdAt: true,
        },
      });
    }),

    /** Update org general profile */
    updateProfile: adminProcedure
      .input(
        z.object({
          name: z.string().min(1, 'Organization name is required').optional(),
          address: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().email('Invalid email').optional().or(z.literal('')),
          website: z.string().url('Invalid URL').optional().or(z.literal('')),
          taxId: z.string().optional(),
          logo: z.string().optional(),
          stampImage: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const orgId = requireOrgId(ctx.organizationId);
        return ctx.prisma.organization.update({ where: { id: orgId }, data: input });
      }),

    /** Update billing / invoice defaults */
    updateDefaults: adminProcedure
      .input(
        z.object({
          currency: currencyEnum.optional(),
          paymentTermsDays: z.number().int().min(0).max(365).optional(),
          defaultTermsText: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const orgId = requireOrgId(ctx.organizationId);
        return ctx.prisma.organization.update({ where: { id: orgId }, data: input });
      }),
  }),

  // ===========================================================================
  // USERS
  // ===========================================================================

  users: router({
    /** List all users in the org with their org-level role */
    list: adminProcedure.query(async ({ ctx }) => {
      const orgId = requireOrgId(ctx.organizationId);

      const users = await ctx.prisma.user.findMany({
        where: { organizationId: orgId },
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          email: true,
          emailVerified: true,
          image: true,
          isActive: true,
          createdAt: true,
          userOrganizationRoles: {
            where: { organizationId: orgId },
            select: { role: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      return users.map((u) => ({
        ...u,
        orgRole: u.userOrganizationRoles[0]?.role ?? 'USER',
      }));
    }),

    /** Get a single user */
    getById: adminProcedure
      .input(z.object({ userId: z.string() }))
      .query(async ({ ctx, input }) => {
        const orgId = requireOrgId(ctx.organizationId);

        const user = await ctx.prisma.user.findUnique({
          where: { id: input.userId },
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            emailVerified: true,
            image: true,
            isActive: true,
            locale: true,
            createdAt: true,
            organizationId: true,
            userOrganizationRoles: {
              where: { organizationId: orgId },
              select: { role: true },
            },
          },
        });

        if (!user || user.organizationId !== orgId) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }

        return { ...user, orgRole: user.userOrganizationRoles[0]?.role ?? 'USER' };
      }),

    /** Update org-level role for a user (ADMIN / USER) */
    setRole: adminProcedure
      .input(
        z.object({
          userId: z.string(),
          role: z.enum(['ADMIN', 'USER']),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const orgId = requireOrgId(ctx.organizationId);

        // Prevent stripping your own admin if you're the only one
        if (input.userId === ctx.user.id && input.role === 'USER') {
          const adminCount = await ctx.prisma.userOrganizationRole.count({
            where: { organizationId: orgId, role: 'ADMIN' },
          });
          if (adminCount <= 1) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Cannot remove the last admin from the organization',
            });
          }
        }

        return ctx.prisma.userOrganizationRole.upsert({
          where: {
            userId_organizationId: { userId: input.userId, organizationId: orgId },
          },
          create: { userId: input.userId, organizationId: orgId, role: input.role },
          update: { role: input.role },
        });
      }),

    /** Activate / deactivate a user */
    setActive: adminProcedure
      .input(z.object({ userId: z.string(), isActive: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const orgId = requireOrgId(ctx.organizationId);

        if (input.userId === ctx.user.id && !input.isActive) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'You cannot deactivate your own account',
          });
        }

        const user = await ctx.prisma.user.findUnique({
          where: { id: input.userId },
          select: { organizationId: true },
        });
        if (!user || user.organizationId !== orgId) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }

        return ctx.prisma.user.update({
          where: { id: input.userId },
          data: { isActive: input.isActive },
        });
      }),

    /** Update the caller's own profile (name, locale, image) */
    updateMyProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).optional(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          locale: z.enum(['en', 'ar']).optional(),
          image: z.string().url().optional().or(z.literal('')),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        return ctx.prisma.user.update({
          where: { id: ctx.user.id },
          data: input,
        });
      }),

    /** Get the caller's own profile */
    me: protectedProcedure.query(async ({ ctx }) => {
      const orgId = ctx.organizationId;
      const user = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: ctx.user.id },
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          email: true,
          emailVerified: true,
          image: true,
          isActive: true,
          locale: true,
          createdAt: true,
          userOrganizationRoles: orgId
            ? { where: { organizationId: orgId }, select: { role: true } }
            : false,
        },
      });
      return {
        ...user,
        orgRole: (user.userOrganizationRoles as { role: string }[])[0]?.role ?? 'USER',
      };
    }),
  }),

  // ===========================================================================
  // SESSIONS
  // ===========================================================================

  sessions: router({
    /** List all active sessions for the current user */
    listMine: protectedProcedure.query(async ({ ctx }) => {
      const now = new Date();
      return ctx.prisma.session.findMany({
        where: { userId: ctx.user.id, expiresAt: { gt: now } },
        select: {
          id: true,
          token: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          expiresAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }),

    /** List all org sessions — admin only (for security audit) */
    listOrg: adminProcedure.query(async ({ ctx }) => {
      const orgId = requireOrgId(ctx.organizationId);
      const now = new Date();

      const users = await ctx.prisma.user.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true, email: true },
      });
      const userIds = users.map((u) => u.id);
      const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

      const sessions = await ctx.prisma.session.findMany({
        where: { userId: { in: userIds }, expiresAt: { gt: now } },
        select: {
          id: true,
          userId: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          expiresAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return sessions.map((s) => ({ ...s, user: userMap[s.userId] }));
    }),

    /** Revoke a specific session by ID */
    revoke: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const session = await ctx.prisma.session.findUnique({
          where: { id: input.sessionId },
          select: { userId: true },
        });

        if (!session) throw new TRPCError({ code: 'NOT_FOUND' });

        // Users can revoke their own sessions; admins can revoke any in their org
        const isOwn = session.userId === ctx.user.id;
        if (!isOwn) {
          const orgId = requireOrgId(ctx.organizationId);
          const targetUser = await ctx.prisma.user.findUnique({
            where: { id: session.userId },
            select: { organizationId: true },
          });
          if (targetUser?.organizationId !== orgId || ctx.orgRole === 'USER') {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
        }

        await ctx.prisma.session.delete({ where: { id: input.sessionId } });
        return { success: true };
      }),

    /** Revoke ALL sessions for the current user except the active one */
    revokeAllMine: protectedProcedure.mutation(async ({ ctx }) => {
      const currentToken = ctx.session.session.token;
      await ctx.prisma.session.deleteMany({
        where: { userId: ctx.user.id, token: { not: currentToken } },
      });
      return { success: true };
    }),
  }),

  // ===========================================================================
  // CATEGORIES  (item categories)
  // ===========================================================================

  categories: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const orgId = requireOrgId(ctx.organizationId);
      return ctx.prisma.itemCategory.findMany({
        where: { organizationId: orgId, deletedAt: null },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          color: true,
          isActive: true,
          _count: { select: { items: true } },
        },
      });
    }),

    create: adminProcedure
      .input(z.object({ name: z.string().min(1), color: colorHex }))
      .mutation(async ({ ctx, input }) => {
        const orgId = requireOrgId(ctx.organizationId);

        const exists = await ctx.prisma.itemCategory.findFirst({
          where: { name: input.name, organizationId: orgId, deletedAt: null },
        });
        if (exists) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Category name already exists' });
        }

        return ctx.prisma.itemCategory.create({
          data: { name: input.name, color: input.color, organizationId: orgId },
        });
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1).optional(),
          color: colorHex,
          isActive: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const orgId = requireOrgId(ctx.organizationId);
        const { id, ...data } = input;

        const existing = await ctx.prisma.itemCategory.findUnique({
          where: { id },
          select: { organizationId: true },
        });
        assertOwnership(existing, orgId, 'Category');

        if (data.name) {
          const dupe = await ctx.prisma.itemCategory.findFirst({
            where: { name: data.name, organizationId: orgId, deletedAt: null, id: { not: id } },
          });
          if (dupe) throw new TRPCError({ code: 'CONFLICT', message: 'Name already in use' });
        }

        return ctx.prisma.itemCategory.update({ where: { id }, data });
      }),

    delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      const existing = await ctx.prisma.itemCategory.findUnique({
        where: { id: input.id },
        select: { organizationId: true, _count: { select: { items: true } } },
      });
      if (!existing) {
        throw new TRPCError({
          code: 'BAD_GATEWAY',
          message: 'Item Category is not exist',
        });
      }
      assertOwnership(existing, orgId, 'Category');

      if (existing._count.items > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot delete category with ${existing._count.items} item(s). Reassign them first.`,
        });
      }

      return ctx.prisma.itemCategory.update({
        where: { id: input.id },
        data: { deletedAt: new Date(), isActive: false },
      });
    }),
  }),

  // ===========================================================================
  // TAX RATES
  // ===========================================================================

  taxRates: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const orgId = requireOrgId(ctx.organizationId);
      return ctx.prisma.taxRate.findMany({
        where: { organizationId: orgId, isActive: true },
        orderBy: { rate: 'asc' },
        select: {
          id: true,
          name: true,
          rate: true,
          isDefault: true,
          isActive: true,
          _count: { select: { invoiceLines: true } },
        },
      });
    }),

    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1),
          rate: z.number().min(0).max(100),
          isDefault: z.boolean().default(false),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const orgId = requireOrgId(ctx.organizationId);

        const exists = await ctx.prisma.taxRate.findFirst({
          where: { name: input.name, organizationId: orgId, isActive: true },
        });
        if (exists)
          throw new TRPCError({ code: 'CONFLICT', message: 'Tax rate name already exists' });

        return ctx.prisma.$transaction(async (tx) => {
          // Only one default at a time
          if (input.isDefault) {
            await tx.taxRate.updateMany({
              where: { organizationId: orgId },
              data: { isDefault: false },
            });
          }
          return tx.taxRate.create({
            data: { ...input, organizationId: orgId },
          });
        });
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1).optional(),
          rate: z.number().min(0).max(100).optional(),
          isDefault: z.boolean().optional(),
          isActive: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const orgId = requireOrgId(ctx.organizationId);
        const { id, ...data } = input;

        const existing = await ctx.prisma.taxRate.findUnique({
          where: { id },
          select: { organizationId: true },
        });
        assertOwnership(existing, orgId, 'TaxRate');

        return ctx.prisma.$transaction(async (tx) => {
          if (data.isDefault) {
            await tx.taxRate.updateMany({
              where: { organizationId: orgId, id: { not: id } },
              data: { isDefault: false },
            });
          }
          return tx.taxRate.update({ where: { id }, data });
        });
      }),

    delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      const existing = await ctx.prisma.taxRate.findUnique({
        where: { id: input.id },
        select: {
          organizationId: true,
          isDefault: true,
          _count: { select: { invoiceLines: true } },
        },
      });
      if (!existing) {
        throw new TRPCError({
          code: 'BAD_GATEWAY',
          message: 'tax rate is not exist',
        });
      }
      assertOwnership(existing, orgId, 'TaxRate');

      if (existing._count.invoiceLines > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `This tax rate is used on ${existing._count.invoiceLines} invoice line(s) and cannot be deleted`,
        });
      }
      if (existing.isDefault) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete the default tax rate. Assign a new default first.',
        });
      }

      return ctx.prisma.taxRate.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),
  }),

  // ===========================================================================
  // WAREHOUSES
  // ===========================================================================

  warehouses: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const orgId = requireOrgId(ctx.organizationId);
      return ctx.prisma.warehouse.findMany({
        where: { organizationId: orgId, deletedAt: null },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          address: true,
          isDefault: true,
          isActive: true,
          _count: { select: { stock: true } },
        },
      });
    }),

    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1),
          address: z.string().optional(),
          isDefault: z.boolean().default(false),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const orgId = requireOrgId(ctx.organizationId);

        const exists = await ctx.prisma.warehouse.findFirst({
          where: { name: input.name, organizationId: orgId, deletedAt: null },
        });
        if (exists)
          throw new TRPCError({ code: 'CONFLICT', message: 'Warehouse name already exists' });

        return ctx.prisma.$transaction(async (tx) => {
          if (input.isDefault) {
            await tx.warehouse.updateMany({
              where: { organizationId: orgId },
              data: { isDefault: false },
            });
          }
          return tx.warehouse.create({ data: { ...input, organizationId: orgId } });
        });
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1).optional(),
          address: z.string().optional(),
          isDefault: z.boolean().optional(),
          isActive: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const orgId = requireOrgId(ctx.organizationId);
        const { id, ...data } = input;

        const existing = await ctx.prisma.warehouse.findUnique({
          where: { id },
          select: { organizationId: true },
        });
        assertOwnership(existing, orgId, 'Warehouse');

        return ctx.prisma.$transaction(async (tx) => {
          if (data.isDefault) {
            await tx.warehouse.updateMany({
              where: { organizationId: orgId, id: { not: id } },
              data: { isDefault: false },
            });
          }
          return tx.warehouse.update({ where: { id }, data });
        });
      }),

    delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      const existing = await ctx.prisma.warehouse.findUnique({
        where: { id: input.id },
        select: {
          organizationId: true,
          isDefault: true,
          _count: { select: { stock: true } },
        },
      });
      if (!existing) {
        throw new TRPCError({
          code: 'BAD_GATEWAY',
          message: 'Warehouse is not exist',
        });
      }
      assertOwnership(existing, orgId, 'Warehouse');

      if (existing.isDefault) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete the default warehouse. Set another as default first.',
        });
      }

      const stockCount = await ctx.prisma.stock.aggregate({
        where: { warehouseId: input.id },
        _sum: { quantity: true },
      });

      if ((stockCount._sum.quantity ?? 0) > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete warehouse with stock on hand. Transfer stock first.',
        });
      }

      return ctx.prisma.warehouse.update({
        where: { id: input.id },
        data: { deletedAt: new Date(), isActive: false },
      });
    }),
  }),

  // ===========================================================================
  // EXPENSE CATEGORIES
  // ===========================================================================

  expenseCategories: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const orgId = requireOrgId(ctx.organizationId);
      return ctx.prisma.expenseCategory.findMany({
        where: { organizationId: orgId, deletedAt: null, isActive: true },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          isActive: true,
          _count: { select: { expenses: true } },
        },
      });
    }),

    create: adminProcedure
      .input(z.object({ name: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const orgId = requireOrgId(ctx.organizationId);

        const exists = await ctx.prisma.expenseCategory.findFirst({
          where: { name: input.name, organizationId: orgId, deletedAt: null },
        });
        if (exists) throw new TRPCError({ code: 'CONFLICT', message: 'Category already exists' });

        return ctx.prisma.expenseCategory.create({
          data: { name: input.name, organizationId: orgId },
        });
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1).optional(),
          isActive: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const orgId = requireOrgId(ctx.organizationId);
        const { id, ...data } = input;
        const existing = await ctx.prisma.expenseCategory.findUnique({
          where: { id },
          select: { organizationId: true },
        });
        assertOwnership(existing, orgId, 'ExpenseCategory');
        return ctx.prisma.expenseCategory.update({ where: { id }, data });
      }),

    delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);
      const existing = await ctx.prisma.expenseCategory.findUnique({
        where: { id: input.id },
        select: { organizationId: true, _count: { select: { expenses: true } } },
      });
      if (!existing) {
        throw new TRPCError({
          code: 'BAD_GATEWAY',
          message: 'Expense category is not exist',
        });
      }
      assertOwnership(existing, orgId, 'ExpenseCategory');

      if (existing._count.expenses > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot delete — ${existing._count.expenses} expense(s) use this category.`,
        });
      }

      return ctx.prisma.expenseCategory.update({
        where: { id: input.id },
        data: { deletedAt: new Date(), isActive: false },
      });
    }),
  }),

  // ===========================================================================
  // CURRENCY  (read-only enum + formatting metadata)
  // ===========================================================================

  currencies: router({
    list: protectedProcedure.query(() => {
      return [
        { code: 'BHD', symbol: 'BD', label: 'Bahraini Dinar', precision: 3 },
        { code: 'USD', symbol: '$', label: 'US Dollar', precision: 2 },
        { code: 'EUR', symbol: '€', label: 'Euro', precision: 2 },
        { code: 'GBP', symbol: '£', label: 'British Pound', precision: 2 },
        { code: 'SAR', symbol: 'SR', label: 'Saudi Riyal', precision: 2 },
        { code: 'AED', symbol: 'AED', label: 'UAE Dirham', precision: 2 },
        { code: 'KWD', symbol: 'KD', label: 'Kuwaiti Dinar', precision: 3 },
        { code: 'OMR', symbol: 'OR', label: 'Omani Rial', precision: 3 },
        { code: 'QAR', symbol: 'QR', label: 'Qatari Riyal', precision: 2 },
        { code: 'EGP', symbol: 'E£', label: 'Egyptian Pound', precision: 2 },
      ] as const;
    }),
  }),
});
