import { z } from 'zod';
import { ConflictError, NotFoundError } from '@/lib/error';
import { orgProcedure, router } from '@/lib/trpc/context';
import { currencyCodeSchema } from '@/lib/validations';
import { writeAuditLog } from './audit.service';

const taxRateBaseSchema = z.object({
  name: z.string().min(1).max(100),
  rate: z.number().min(0).max(100),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

const ledgerAccountBaseSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  type: z.enum([
    'ASSET',
    'LIABILITY',
    'EQUITY',
    'REVENUE',
    'EXPENSE',
    'CONTRA_ASSET',
    'CONTRA_REVENUE',
  ]),
  normalBalance: z.enum(['DEBIT', 'CREDIT']),
  parentId: z.cuid2().optional(),
  isActive: z.boolean().default(true),
});

export const settingsRouter = router({
  getOrg: orgProcedure.query(async ({ ctx }) => {
    const org = await ctx.db.organization.findUnique({
      where: { id: ctx.user.organizationId },
      include: { settings: true },
    });
    return org;
  }),

  updateOrg: orgProcedure
    .input(
      z.object({
        name: z.string().min(2).optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        website: z.string().optional(),
        taxId: z.string().optional(),
        crNumber: z.string().optional(),
        currency: currencyCodeSchema.optional(),
        paymentTermsDays: z.number().int().optional(),
        defaultTermsText: z.string().optional(),
        vatRegistered: z.boolean().optional(),
        invoiceFooter: z.string().optional(),
        fiscalYearStartMonth: z.number().int().min(1).max(12).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.organization.update({
        where: { id: ctx.user.organizationId },
        data: input,
      });
    }),

  // Tax Rates
  taxRates: {
    list: orgProcedure.query(async ({ ctx }) => {
      return ctx.db.taxRate.findMany({
        where: { organizationId: ctx.user.organizationId },
        orderBy: { name: 'asc' },
      });
    }),

    create: orgProcedure.input(taxRateBaseSchema).mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;

      const existing = await ctx.db.taxRate.findFirst({
        where: { name: input.name, organizationId: orgId },
        select: { id: true },
      });
      if (existing) throw new ConflictError(`Tax rate "${input.name}" already exists.`);

      return ctx.db.$transaction(async (tx) => {
        if (input.isDefault) {
          await tx.taxRate.updateMany({
            where: { organizationId: orgId, isDefault: true },
            data: { isDefault: false },
          });
        }

        const created = await tx.taxRate.create({
          data: { ...input, rate: input.rate, organizationId: orgId },
        });

        await writeAuditLog(
          {
            entityType: 'TaxRate',
            entityId: created.id,
            action: 'CREATE',
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return created;
      });
    }),

    update: orgProcedure
      .input(taxRateBaseSchema.partial().extend({ id: z.cuid2() }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const orgId = ctx.user.organizationId;

        const existing = await ctx.db.taxRate.findFirst({ where: { id, organizationId: orgId } });
        if (!existing) throw new NotFoundError('TaxRate', id);

        return ctx.db.$transaction(async (tx) => {
          if (data.isDefault) {
            await tx.taxRate.updateMany({
              where: { organizationId: orgId, isDefault: true, NOT: { id } },
              data: { isDefault: false },
            });
          }

          const updated = await tx.taxRate.update({ where: { id }, data });

          await writeAuditLog(
            {
              entityType: 'TaxRate',
              entityId: id,
              action: 'UPDATE',
              organizationId: orgId,
              userId: ctx.user.id,
              ipAddress: ctx.ipAddress,
            },
            tx,
          );

          return updated;
        });
      }),

    delete: orgProcedure.input(z.object({ id: z.cuid2() })).mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.taxRate.findFirst({
        where: { id: input.id, organizationId: ctx.user.organizationId },
        select: { id: true, isDefault: true },
      });
      if (!existing) throw new NotFoundError('TaxRate', input.id);
      if (existing.isDefault) throw new ConflictError('Cannot delete the default tax rate.');

      await ctx.db.$transaction(async (tx) => {
        await tx.taxRate.update({ where: { id: input.id }, data: { isActive: false } });
        await writeAuditLog(
          {
            entityType: 'TaxRate',
            entityId: input.id,
            action: 'DELETE',
            organizationId: ctx.user.organizationId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );
      });

      return { success: true };
    }),
  },

  // Chart of Accounts
  chartOfAccounts: {
    list: orgProcedure.query(async ({ ctx }) => {
      return ctx.db.ledgerAccount.findMany({
        where: { organizationId: ctx.user.organizationId },
        orderBy: { code: 'asc' },
        include: { children: { select: { id: true, code: true, name: true } } },
      });
    }),

    create: orgProcedure.input(ledgerAccountBaseSchema).mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;

      const existing = await ctx.db.ledgerAccount.findFirst({
        where: { code: input.code, organizationId: orgId },
        select: { id: true },
      });
      if (existing) throw new ConflictError(`Account code "${input.code}" already exists.`);

      return ctx.db.$transaction(async (tx) => {
        const created = await tx.ledgerAccount.create({
          data: { ...input, organizationId: orgId },
        });

        await writeAuditLog(
          {
            entityType: 'LedgerAccount',
            entityId: created.id,
            action: 'CREATE',
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return created;
      });
    }),

    update: orgProcedure
      .input(ledgerAccountBaseSchema.partial().extend({ id: z.cuid2() }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const existing = await ctx.db.ledgerAccount.findFirst({
          where: { id, organizationId: ctx.user.organizationId },
        });
        if (!existing) throw new NotFoundError('LedgerAccount', id);

        return ctx.db.$transaction(async (tx) => {
          const updated = await tx.ledgerAccount.update({ where: { id }, data });

          await writeAuditLog(
            {
              entityType: 'LedgerAccount',
              entityId: id,
              action: 'UPDATE',
              organizationId: ctx.user.organizationId,
              userId: ctx.user.id,
              ipAddress: ctx.ipAddress,
            },
            tx,
          );

          return updated;
        });
      }),

    delete: orgProcedure.input(z.object({ id: z.cuid2() })).mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.ledgerAccount.findFirst({
        where: { id: input.id, organizationId: ctx.user.organizationId },
        include: { children: { select: { id: true } } },
      });
      if (!existing) throw new NotFoundError('LedgerAccount', input.id);
      if (existing.children.length > 0)
        throw new ConflictError('Cannot delete an account with sub-accounts.');

      await ctx.db.$transaction(async (tx) => {
        await tx.ledgerAccount.update({ where: { id: input.id }, data: { isActive: false } });
        await writeAuditLog(
          {
            entityType: 'LedgerAccount',
            entityId: input.id,
            action: 'DELETE',
            organizationId: ctx.user.organizationId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );
      });

      return { success: true };
    }),
  },

  // Organization settings (key-value)
  updateSetting: orgProcedure
    .input(z.object({ key: z.string(), value: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.organizationSetting.upsert({
        where: { organizationId_key: { organizationId: ctx.user.organizationId, key: input.key } },
        create: { key: input.key, value: input.value, organizationId: ctx.user.organizationId },
        update: { value: input.value },
      });
    }),

  getSetting: orgProcedure.input(z.object({ key: z.string() })).query(async ({ ctx, input }) => {
    const setting = await ctx.db.organizationSetting.findUnique({
      where: { organizationId_key: { organizationId: ctx.user.organizationId, key: input.key } },
    });
    return setting?.value ?? null;
  }),

  getSettings: orgProcedure.query(async ({ ctx }) => {
    const settings = await ctx.db.organizationSetting.findMany({
      where: { organizationId: ctx.user.organizationId },
    });
    return settings.reduce<Record<string, string>>((acc, s) => ({ ...acc, [s.key]: s.value }), {});
  }),
});
