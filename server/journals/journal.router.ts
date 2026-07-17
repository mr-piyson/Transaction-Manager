import { z } from 'zod';
import { UnprocessableError } from '@/lib/error';
import { assertCan, orgProcedure, router } from '@/lib/trpc/context';
import { paginatedResponse, toPrismaPage } from '@/lib/validations';
import { writeAuditLog } from '../shared/audit.service';
import {
  createDraftJournalEntry,
  getAccountBalances,
  postDraftEntry,
  reversePostedEntry,
  voidDraftEntry,
} from './journal.service';
import { createJournalEntrySchema, listJournalEntriesSchema } from './journal.schemas';

export const journalsRouter = router({
  // ── LIST ──────────────────────────────────────────────────────────────────
  list: orgProcedure.input(listJournalEntriesSchema).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'journal:entry', 'JournalEntry');

    const { search, status, accountId, dateFrom, dateTo, sortBy, sortOrder, ...pagination } =
      input;
    const { skip, take } = toPrismaPage(pagination);
    const orgId = ctx.user.organizationId;

    const where = {
      organizationId: orgId,
      ...(status ? { status } : {}),
      ...(accountId ? { lines: { some: { accountId } } } : {}),
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
              { entryNumber: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
              { reference: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [entries, total] = await ctx.db.$transaction([
      ctx.db.journalEntry.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          entryNumber: true,
          status: true,
          date: true,
          description: true,
          reference: true,
          currency: true,
          postedAt: true,
          createdAt: true,
          _count: { select: { lines: true } },
          lines: {
            select: { debit: true, credit: true },
          },
        },
      }),
      ctx.db.journalEntry.count({ where }),
    ]);

    // Compute total debit/credit for each entry
    const entriesWithTotals = entries.map((e) => ({
      ...e,
      totalDebit: e.lines.reduce((sum, l) => sum + Number(l.debit), 0),
      totalCredit: e.lines.reduce((sum, l) => sum + Number(l.credit), 0),
      lines: undefined, // remove raw lines from list response
    }));

    return paginatedResponse(entriesWithTotals, total, pagination);
  }),

  // ── GET BY ID ──────────────────────────────────────────────────────────────
  byId: orgProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'journal:entry', 'JournalEntry');

    const entry = await ctx.db.journalEntry.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId },
      include: {
        lines: {
          include: {
            account: { select: { id: true, code: true, name: true, type: true } },
            department: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        createdBy: { select: { id: true, name: true } },
        reversalOf: { select: { id: true, entryNumber: true } },
        reversedBy: { select: { id: true, entryNumber: true } },
      },
    });

    if (!entry) throw new UnprocessableError('Journal entry not found.');
    return entry;
  }),

  // ── CREATE (draft) ────────────────────────────────────────────────────────
  create: orgProcedure
    .input(createJournalEntrySchema)
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'journal:entry', 'JournalEntry');

      const { lines, ...meta } = input;

      return ctx.db.$transaction(async (tx) => {
        const entry = await createDraftJournalEntry({
          tx,
          organizationId: ctx.user.organizationId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
          ...meta,
          lines,
        });

        await writeAuditLog(
          {
            entityType: 'JournalEntry',
            entityId: entry.id,
            action: 'CREATE',
            diff: { entryNumber: { before: null, after: entry.entryNumber } },
            organizationId: ctx.user.organizationId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return entry;
      });
    }),

  // ── POST (DRAFT → POSTED) ─────────────────────────────────────────────────
  post: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'journal:entry', 'JournalEntry');

      return ctx.db.$transaction(async (tx) => {
        const entry = await postDraftEntry(
          tx,
          input.id,
          ctx.user.organizationId,
          ctx.user.id,
        );

        await writeAuditLog(
          {
            entityType: 'JournalEntry',
            entityId: entry.id,
            action: 'STATUS_CHANGE',
            diff: { status: { before: 'DRAFT', after: 'POSTED' } },
            organizationId: ctx.user.organizationId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return entry;
      });
    }),

  // ── VOID (DRAFT → VOID) ───────────────────────────────────────────────────
  void: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'journal:entry', 'JournalEntry');

      return ctx.db.$transaction(async (tx) => {
        const entry = await voidDraftEntry(tx, input.id, ctx.user.organizationId);

        await writeAuditLog(
          {
            entityType: 'JournalEntry',
            entityId: entry.id,
            action: 'STATUS_CHANGE',
            diff: { status: { before: 'DRAFT', after: 'VOID' } },
            organizationId: ctx.user.organizationId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return entry;
      });
    }),

  // ── REVERSE (POSTED → creates new reversal entry) ─────────────────────────
  reverse: orgProcedure
    .input(z.object({ id: z.string(), reason: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'journal:entry', 'JournalEntry');

      return ctx.db.$transaction(async (tx) => {
        const reversal = await reversePostedEntry(
          tx,
          input.id,
          ctx.user.organizationId,
          ctx.user.id,
          input.reason,
        );

        await writeAuditLog(
          {
            entityType: 'JournalEntry',
            entityId: reversal.id,
            action: 'CREATE',
            diff: { reversalOf: { before: null, after: input.id } },
            organizationId: ctx.user.organizationId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return reversal;
      });
    }),

  // ── ACCOUNT BALANCES ──────────────────────────────────────────────────────
  balances: orgProcedure
    .input(
      z.object({
        asOf: z.coerce.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'journal:entry', 'JournalEntry');

      const balances = await getAccountBalances(
        ctx.db,
        ctx.user.organizationId,
        input.asOf,
      );

      // Separate into balance sheet and P&L
      const balanceSheet = balances.filter((b) =>
        ['ASSET', 'LIABILITY', 'EQUITY', 'CONTRA_ASSET'].includes(b.accountType),
      );
      const profitAndLoss = balances.filter((b) =>
        ['REVENUE', 'EXPENSE', 'CONTRA_REVENUE'].includes(b.accountType),
      );

      return { balanceSheet, profitAndLoss, all: balances };
    }),
});
