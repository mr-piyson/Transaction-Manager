import { z } from 'zod';
import { NotFoundError } from '@/lib/error';
import { protectedProcedure, router } from '@/lib/trpc/context';
import { currencyCodeSchema } from '@/lib/validations';

export const organizationsRouter = router({
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
        email: z.email().optional().or(z.literal('')).optional(),
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
