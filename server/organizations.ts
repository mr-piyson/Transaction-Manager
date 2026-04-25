import { z } from 'zod';
import { publicProcedure, protectedProcedure, t, adminProcedure } from '@/lib/trpc/server';
import { TRPCError } from '@trpc/server';
import db from '@/lib/db';
import { auth } from '@/auth/auth-server';
import { CurrencyCode } from '@prisma/client';
import { requireOrgId } from './_shared';

export async function checkOrganization() {
  return (await db.organization.count({})) > 0;
}

export async function getOrganization(id: string) {
  return await db.organization.findUnique({
    where: {
      id: id,
    },
  });
}

export const organizationRouter = t.router({
  checkOrganization: publicProcedure.query(async () => {
    try {
      const orgCount = await db.organization.count();
      return { hasOrganization: orgCount > 0 };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to check organization status',
      });
    }
  }),

  createOrganization: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        address: z.string().optional(),
        website: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const organization = await db.organization.create({
          data: {
            ...input,
            slug: input.name.toLowerCase().replace(/\s/g, '-'),
          },
        });
        return organization;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create organization',
        });
      }
    }),

  setup: publicProcedure
    .input(
      z.object({
        orgName: z.string(),
        slug: z.string(),
        website: z.string().optional(),
        adminFirstName: z.string(),
        adminLastName: z.string(),
        adminEmail: z.string().email(),
        adminPassword: z.string(),
        currency: z.enum(CurrencyCode).default('BHD'),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const existingOrg = await db.organization.findFirst();
        if (existingOrg) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'System already configured',
          });
        }

        const organization = await db.organization.create({
          data: {
            name: input.orgName,
            slug: input.slug,
            website: input.website,
            currency: input.currency,
          },
        });

        const userResult = await auth.api.signUpEmail({
          body: {
            email: input.adminEmail,
            password: input.adminPassword,
            name: `${input.adminFirstName} ${input.adminLastName}`,
            firstName: input.adminFirstName,
            lastName: input.adminLastName,
            role: 'SUPER_ADMIN',
            organizationId: organization.id,
            isActive: true,
          },
        });

        if (!userResult) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create admin user',
          });
        }

        return {
          success: true,
          message: 'System initialized successfully',
          orgId: organization.id,
          slug: organization.slug,
        };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to complete setup',
        });
      }
    }),

  get: protectedProcedure.query(async ({ ctx }) => {
    const orgId = requireOrgId(ctx.organizationId);

    return ctx.prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        address: true,
        phone: true,
        email: true,
        website: true,
        taxId: true,
        currency: true,
        paymentTermsDays: true,
        defaultTermsText: true,
        stampImage: true,
        createdAt: true,
      },
    });
  }),

  // -------------------------------------------------------------------------
  // Update org settings
  // -------------------------------------------------------------------------
  update: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        website: z.string().url().optional().or(z.literal('')),
        taxId: z.string().optional(),
        currency: z
          .enum(['BHD', 'USD', 'EUR', 'GBP', 'SAR', 'AED', 'KWD', 'OMR', 'QAR', 'EGP'])
          .optional(),
        paymentTermsDays: z.number().int().min(0).max(365).optional(),
        defaultTermsText: z.string().optional(),
        logo: z.string().optional(),
        stampImage: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      return ctx.prisma.organization.update({
        where: { id: orgId },
        data: input,
      });
    }),

  // -------------------------------------------------------------------------
  // List all users in the org (admin)
  // -------------------------------------------------------------------------
  listUsers: adminProcedure.query(async ({ ctx }) => {
    const orgId = requireOrgId(ctx.organizationId);

    return ctx.prisma.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        role: true,
        userOrganizationRoles: {
          where: { organizationId: orgId },
          select: { role: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }),

  // -------------------------------------------------------------------------
  // Update a user's org role
  // -------------------------------------------------------------------------
  setUserRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(['ADMIN', 'USER']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      // Can't downgrade yourself if you're the only admin
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
        where: { userId_organizationId: { userId: input.userId, organizationId: orgId } },
        create: { userId: input.userId, organizationId: orgId, role: input.role },
        update: { role: input.role },
      });
    }),
});
