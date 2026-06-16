import { z } from 'zod';
import { ConflictError, NotFoundError } from '@/lib/error';
import { protectedProcedure, publicProcedure, router } from '@/lib/trpc/context';
import { currencyCodeSchema } from '@/lib/validations';
import { writeAuditLog } from './audit.service';

const setupSchema = z.object({
  language: z.string().min(1),
  currency: currencyCodeSchema,
  orgName: z.string().min(2),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/),
  website: z.string().optional().or(z.literal('')),
  adminFirstName: z.string().min(2),
  adminLastName: z.string().optional(),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(6),
});

export const organizationsRouter = router({
  setup: publicProcedure.input(setupSchema).mutation(async ({ ctx, input }) => {
    const existingOrg = await ctx.db.organization.findUnique({ where: { slug: input.slug } });
    if (existingOrg) throw new ConflictError(`Organization slug "${input.slug}" is already taken.`);

    return ctx.db.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: input.orgName,
          slug: input.slug,
          website: input.website || null,
          currency: input.currency,
        },
      });

      const user = await tx.user.create({
        data: {
          name: `${input.adminFirstName} ${input.adminLastName ?? ''}`.trim(),
          email: input.adminEmail,
          firstName: input.adminFirstName,
          lastName: input.adminLastName ?? null,
          organizationId: org.id,
          platformRole: 'SUPER_ADMIN',
          isActive: true,
        },
      });

      await tx.userOrganizationRole.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: 'OWNER',
        },
      });

      await tx.documentSequence.createMany({
        data: [
          { prefix: 'INV', organizationId: org.id },
          { prefix: 'QTE', organizationId: org.id },
          { prefix: 'CN', organizationId: org.id },
          { prefix: 'PFI', organizationId: org.id },
          { prefix: 'DN', organizationId: org.id },
          { prefix: 'PO', organizationId: org.id },
        ],
      });

      return { organizationId: org.id, userId: user.id };
    });
  }),

  get: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.user.organizationId;
    if (!orgId) throw new NotFoundError('Organization');

    const org = await ctx.db.organization.findUnique({
      where: { id: orgId },
      include: { settings: true },
    });
    if (!org) throw new NotFoundError('Organization', orgId);
    return org;
  }),

  update: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal('')).optional(),
        website: z.string().optional().or(z.literal('')).optional(),
        taxId: z.string().optional(),
        crNumber: z.string().optional(),
        currency: currencyCodeSchema.optional(),
        paymentTermsDays: z.number().int().optional(),
        defaultTermsText: z.string().optional(),
        vatRegistered: z.boolean().optional(),
        fiscalYearStartMonth: z.number().int().min(1).max(12).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;
      if (!orgId) throw new NotFoundError('Organization');

      return ctx.db.organization.update({ where: { id: orgId }, data: input });
    }),
});
