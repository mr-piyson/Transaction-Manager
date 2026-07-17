import { z } from 'zod';
import { NotFoundError, UnprocessableError } from '@/lib/error';
import { assertCan, orgProcedure, router } from '@/lib/trpc/context';
import { writeAuditLog } from '../shared/audit.service';
import { postExpense } from '../journals/journal-posting.service';

export const expensesRouter = router({
  list: orgProcedure
    .input(
      z.object({
        search: z.string().optional(),
        categoryId: z.string().optional(),
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
        limit: z.number().int().positive().max(100).default(50),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'expense:read', 'Expense');

      const { search, categoryId, dateFrom, dateTo, limit, cursor } = input;
      const orgId = ctx.user.organizationId;

      const where: Record<string, unknown> = {
        organizationId: orgId,
        deletedAt: null,
        ...(categoryId ? { categoryId } : {}),
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

      const expenses = await ctx.db.expense.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { date: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      let nextCursor: string | undefined;
      if (expenses.length > limit) {
        const nextItem = expenses.pop();
        nextCursor = nextItem?.id;
      }

      return { items: expenses, nextCursor };
    }),

  byId: orgProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'expense:read', 'Expense');

    const expense = await ctx.db.expense.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId, deletedAt: null },
        include: {
          category: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          item: { select: { id: true, sku: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
    });

    if (!expense) throw new NotFoundError('Expense', input.id);
    return expense;
  }),

  create: orgProcedure
    .input(
      z.object({
        description: z.string().min(1).max(1000),
        amount: z.number().positive(),
        method: z.enum(['CASH', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'ONLINE', 'OTHER']).default('CASH'),
        date: z.coerce.date().default(() => new Date()),
        reference: z.string().max(500).optional(),
        notes: z.string().max(2000).optional(),
        categoryId: z.string().optional(),
        departmentId: z.string().optional(),
        itemId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'expense:create', 'Expense');

      const orgId = ctx.user.organizationId;

      if (input.categoryId) {
        const category = await ctx.db.expenseCategory.findFirst({
          where: { id: input.categoryId, organizationId: orgId, isActive: true },
          select: { id: true },
        });
        if (!category) throw new NotFoundError('ExpenseCategory', input.categoryId);
      }

      return ctx.db.$transaction(async (tx) => {
        const expense = await tx.expense.create({
          data: {
            description: input.description,
            amount: input.amount,
            method: input.method,
            date: input.date,
            reference: input.reference,
            notes: input.notes,
            categoryId: input.categoryId,
            departmentId: input.departmentId,
            itemId: input.itemId,
            organizationId: orgId,
            createdById: ctx.user.id,
          },
        });

        // Resolve expense account code from category
        let expenseAccountCode: string | undefined;
        if (input.categoryId) {
          const category = await tx.expenseCategory.findUnique({
            where: { id: input.categoryId },
            select: { account: { select: { code: true } } },
          });
          expenseAccountCode = category?.account?.code;
        }

        // Double-entry journal: Dr Expense Account / Cr Cash/Bank
        const journalEntry = await postExpense({
          tx,
          organizationId: orgId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
          expenseId: expense.id,
          amount: input.amount,
          method: input.method,
          description: input.description,
          expenseAccountCode,
        });

        if (journalEntry) {
          await tx.expense.update({
            where: { id: expense.id },
            data: { journalEntryId: journalEntry.id },
          });
        }

        await writeAuditLog(
          {
            entityType: 'Expense',
            entityId: expense.id,
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

        return expense;
      });
    }),

  delete: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'expense:delete', 'Expense');

    const expense = await ctx.db.expense.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!expense) throw new NotFoundError('Expense', input.id);

    await ctx.db.$transaction(async (tx) => {
      await tx.expense.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });

      await writeAuditLog(
        {
          entityType: 'Expense',
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
});
