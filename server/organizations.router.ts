import { z } from 'zod';
import { ConflictError, NotFoundError } from '@/lib/error';
import { protectedProcedure, publicProcedure, router } from '@/lib/trpc/context';
import { currencyCodeSchema } from '@/lib/validations';
import { auth } from '@/auth/auth-server';

const setupSchema = z.object({
  language: z.string().min(1),
  currency: currencyCodeSchema,
  orgName: z.string().min(2),
  slug: z
    .string()
    .min(3)
    .regex(/^[a-z0-9-]+$/),
  website: z.string().optional().or(z.literal('')),
  adminFirstName: z.string().min(2),
  adminLastName: z.string().optional(),
  adminEmail: z.email(),
  adminPassword: z.string().min(6),
});

export const organizationsRouter = router({
  setup: publicProcedure.input(setupSchema).mutation(async ({ ctx, input }) => {
    const existingOrg = await ctx.db.organization.findUnique({ where: { slug: input.slug } });
    if (existingOrg) throw new ConflictError(`Organization slug "${input.slug}" is already taken.`);

    // 1. Create org + sequences in a transaction
    const { org } = await ctx.db.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: input.orgName,
          slug: input.slug,
          website: input.website || null,
          currency: input.currency,
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

      return { org };
    });

    // 2. Create user via Better Auth (handles hashing + Account + Session)
    const { user } = await auth.api.signUpEmail({
      body: {
        name: `${input.adminFirstName} ${input.adminLastName ?? ''}`.trim(),
        email: input.adminEmail,
        password: input.adminPassword,
        firstName: input.adminFirstName,
        lastName: input.adminLastName ?? '',
        organizationId: org.id,
        isActive: true,
      },
      headers: ctx.req.headers,
    });

    // 3. Update user to SUPER_ADMIN + create org membership
    await ctx.db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { platformRole: 'SUPER_ADMIN' },
      });

      await tx.userOrganizationRole.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: 'OWNER',
        },
      });
    });

    return { organizationId: org.id, userId: user.id };
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
