import { z } from 'zod';
import { base, authed, t } from '@/trpc/server';
import { TRPCError } from '@trpc/server';
import db from '@/lib/db';
import { auth } from '@/lib/auth';

export async function checkOrganization() {
  return (await db.organization.count({})) > 0;
}

export async function getOrganization(id: string) {
  return await db.organization.findUnique({
    where: {
      id: Number(id),
    },
  });
}

export const organizationRouter = t.router({
  checkOrganization: base.query(async () => {
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

  createOrganization: authed
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

  setup: base
    .input(
      z.object({
        orgName: z.string(),
        slug: z.string(),
        website: z.string().optional(),
        adminFirstName: z.string(),
        adminLastName: z.string(),
        adminEmail: z.string().email(),
        adminPassword: z.string(),
        currency: z.string(),
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
});
