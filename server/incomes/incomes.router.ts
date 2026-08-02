import { z } from 'zod';
import { ForbiddenError, NotFoundError } from '@/lib/error';
import { assertCan, orgProcedure, router } from '@/lib/trpc/context';
import { writeAuditLog } from '../shared/audit.service';
import { postIncome } from '../journals/journal-posting.service';
import { reversePostedEntry } from '../journals/journal.service';

const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'ONLINE', 'OTHER'] as const;

export const incomesRouter = router({
  list: orgProcedure
    .input(
      z.object({
        search: z.string().optional(),
        customerId: z.string().optional(),
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
        limit: z.number().int().positive().max(500).default(50),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'income:read', 'Income');

      const { search, customerId, dateFrom, dateTo, limit, cursor } = input;
      const orgId = ctx.user.organizationId;

      const where: Record<string, unknown> = {
        organizationId: orgId,
        deletedAt: null,
        ...(customerId ? { customerId } : {}),
        ...(dateFrom || dateTo
          ? {
              date: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateTo ? { lte: dateTo } : {}),
              },
            }
          : {}),
        ...(search
          ? {
              OR: [
                { description: { contains: search, mode: 'insensitive' as const } },
                { reference: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      };

      const incomes = await ctx.db.income.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { date: 'desc' },
        include: {
          customer: { select: { id: true, name: true } },
          invoice: { select: { id: true, serial: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      let nextCursor: string | undefined;
      if (incomes.length > limit) {
        const nextItem = incomes.pop();
        nextCursor = nextItem?.id;
      }

      return { items: incomes, nextCursor };
    }),

  byId: orgProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'income:read', 'Income');

    const orgId = ctx.user.organizationId;

    const income = await ctx.db.income.findFirst({
      where: { id: input.id, organizationId: orgId, deletedAt: null },
      include: {
        customer: { select: { id: true, name: true } },
        invoice: { select: { id: true, serial: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!income) throw new NotFoundError('Income', input.id);

    const journalEntry = income.journalEntryId
      ? await ctx.db.journalEntry.findFirst({
          where: { id: income.journalEntryId, organizationId: orgId },
          select: { id: true, entryNumber: true, status: true, date: true, postedAt: true },
        })
      : null;

    return { ...income, journalEntry };
  }),

  create: orgProcedure
    .input(
      z.object({
        description: z.string().min(1).max(1000),
        amount: z.number().positive(),
        method: z.enum(PAYMENT_METHODS).default('CASH'),
        date: z.coerce.date().default(() => new Date()),
        reference: z.string().max(500).optional(),
        notes: z.string().max(2000).optional(),
        customerId: z.string().optional(),
        invoiceId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'income:create', 'Income');

      const orgId = ctx.user.organizationId;

      if (input.customerId) {
        const customer = await ctx.db.customer.findFirst({
          where: { id: input.customerId, organizationId: orgId, deletedAt: null },
          select: { id: true },
        });
        if (!customer) throw new NotFoundError('Customer', input.customerId);
      }

      if (input.invoiceId) {
        const invoice = await ctx.db.invoice.findFirst({
          where: { id: input.invoiceId, organizationId: orgId, deletedAt: null },
          select: { id: true },
        });
        if (!invoice) throw new NotFoundError('Invoice', input.invoiceId);
      }

      return ctx.db.$transaction(async (tx) => {
        const income = await tx.income.create({
          data: {
            description: input.description,
            amount: input.amount,
            method: input.method,
            date: input.date,
            reference: input.reference,
            notes: input.notes,
            customerId: input.customerId,
            invoiceId: input.invoiceId,
            organizationId: orgId,
            createdById: ctx.user.id,
          },
        });

        // Double-entry journal: Dr Cash/Bank / Cr Sales Revenue
        const journalEntry = await postIncome({
          tx,
          organizationId: orgId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
          incomeId: income.id,
          amount: input.amount,
          method: input.method,
          description: input.description,
        });

        if (journalEntry) {
          await tx.income.update({
            where: { id: income.id },
            data: { journalEntryId: journalEntry.id },
          });
        }

        await writeAuditLog(
          {
            entityType: 'Income',
            entityId: income.id,
            action: 'CREATE',
            diff: {
              description: { before: null, after: input.description },
              amount: { before: null, after: input.amount },
            },
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return income;
      });
    }),

  update: orgProcedure
    .input(
      z.object({
        id: z.string(),
        description: z.string().min(1).max(1000).optional(),
        amount: z.number().positive().optional(),
        method: z.enum(PAYMENT_METHODS).optional(),
        date: z.coerce.date().optional(),
        reference: z.string().max(500).nullable().optional(),
        notes: z.string().max(2000).nullable().optional(),
        customerId: z.string().nullable().optional(),
        invoiceId: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'income:update', 'Income');

      const { id, ...data } = input;
      const orgId = ctx.user.organizationId;

      const existing = await ctx.db.income.findFirst({
        where: { id, organizationId: orgId, deletedAt: null },
        select: {
          id: true,
          description: true,
          amount: true,
          method: true,
          date: true,
          reference: true,
          notes: true,
          journalEntryId: true,
        },
      });
      if (!existing) throw new NotFoundError('Income', id);

      if (data.customerId) {
        const customer = await ctx.db.customer.findFirst({
          where: { id: data.customerId, organizationId: orgId, deletedAt: null },
          select: { id: true },
        });
        if (!customer) throw new NotFoundError('Customer', data.customerId);
      }

      if (data.invoiceId) {
        const invoice = await ctx.db.invoice.findFirst({
          where: { id: data.invoiceId, organizationId: orgId, deletedAt: null },
          select: { id: true },
        });
        if (!invoice) throw new NotFoundError('Invoice', data.invoiceId);
      }

      // Only accounting-impacting fields (amount, method, date) require a
      // new journal entry. Non-accounting changes never touch the posted JE.
      const accountingChanged = [
        ['amount', Number(existing.amount)],
        ['method', existing.method],
        ['date', existing.date.getTime()],
      ].some(([key, prev]) => {
        const next = data[key as keyof typeof data];
        if (next === undefined) return false;
        return key === 'date' ? (next as Date).getTime() !== (prev as number) : next !== prev;
      });

      return ctx.db.$transaction(async (tx) => {
        let newJournalEntryId: string | null = null;

        if (accountingChanged) {
          if (existing.journalEntryId) {
            const je = await tx.journalEntry.findFirst({
              where: { id: existing.journalEntryId, organizationId: orgId },
              select: { id: true, status: true },
            });
            if (je?.status === 'DRAFT') {
              await tx.journalEntry.deleteMany({ where: { id: je.id } });
            } else if (je?.status === 'POSTED') {
              await reversePostedEntry(tx, je.id, orgId, ctx.user.id, 'Income edited');
            }
          }

          const journalEntry = await postIncome({
            tx,
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
            incomeId: id,
            amount: data.amount ?? Number(existing.amount),
            method: data.method ?? existing.method,
            description: data.description ?? existing.description,
          });

          if (journalEntry) newJournalEntryId = journalEntry.id;
        }

        const updated = await tx.income.update({
          where: { id },
          data: {
            ...data,
            ...(newJournalEntryId ? { journalEntryId: newJournalEntryId } : {}),
          },
        });

        await writeAuditLog(
          {
            entityType: 'Income',
            entityId: id,
            action: 'UPDATE',
            diff: {
              description: {
                before: existing.description,
                after: data.description ?? existing.description,
              },
              amount: {
                before: Number(existing.amount),
                after: data.amount ?? Number(existing.amount),
              },
            },
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return updated;
      });
    }),

  delete: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'income:delete', 'Income');

    const income = await ctx.db.income.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!income) throw new NotFoundError('Income', input.id);

    await ctx.db.$transaction(async (tx) => {
      await tx.income.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });

      await writeAuditLog(
        {
          entityType: 'Income',
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

  // ── SUPER_ADMIN: permanent deletion of the income + its journal entry ──
  hardDeleteInfo: orgProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    if (ctx.user.platformRole !== 'SUPER_ADMIN')
      throw new ForbiddenError(
        'hard delete',
        'this income. This action is restricted to platform super admins',
      );
    const orgId = ctx.user.organizationId;

    const income = await ctx.db.income.findFirst({
      where: { id: input.id, organizationId: orgId },
      select: { id: true, journalEntryId: true },
    });
    if (!income) throw new NotFoundError('Income', input.id);

    const [auditLogs, tags, notifications, attachments] = await Promise.all([
      ctx.db.auditLog.count({ where: { entityType: 'Income', entityId: input.id } }),
      ctx.db.tagging.count({ where: { entityType: 'Income', entityId: input.id } }),
      ctx.db.notification.count({ where: { entityType: 'Income', entityId: input.id } }),
      ctx.db.attachment.count({ where: { entityType: 'Income', entityId: input.id } }),
    ]);

    return {
      id: input.id,
      journalEntries: income.journalEntryId ? 1 : 0,
      auditLogs,
      tags,
      notifications,
      attachments,
    };
  }),

  hardDelete: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.platformRole !== 'SUPER_ADMIN')
      throw new ForbiddenError(
        'hard delete',
        'this income. This action is restricted to platform super admins',
      );
    const orgId = ctx.user.organizationId;

    const income = await ctx.db.income.findFirst({
      where: { id: input.id, organizationId: orgId },
      select: { id: true, journalEntryId: true },
    });
    if (!income) throw new NotFoundError('Income', input.id);

    await ctx.db.$transaction(async (tx) => {
      // Journal lines cascade off the JournalEntry row.
      if (income.journalEntryId) {
        await tx.journalEntry.deleteMany({ where: { id: income.journalEntryId } });
      }
      await tx.auditLog.deleteMany({ where: { entityType: 'Income', entityId: input.id } });
      await tx.tagging.deleteMany({ where: { entityType: 'Income', entityId: input.id } });
      await tx.notification.deleteMany({ where: { entityType: 'Income', entityId: input.id } });
      await tx.attachment.deleteMany({ where: { entityType: 'Income', entityId: input.id } });
      await tx.income.deleteMany({ where: { id: input.id } });
    });

    return { success: true };
  }),
});
