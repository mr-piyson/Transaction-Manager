/**
 * Journal posting engine — the heart of double-entry bookkeeping.
 *
 * RULES:
 * 1. Every JournalEntry must have ≥2 JournalLine rows.
 * 2. SUM(debit) == SUM(credit) for every entry (balanced).
 * 3. Exactly one of debit/credit is non-zero per line.
 * 4. Posted entries are immutable — reversals create new entries.
 * 5. Every financial event (invoice, payment, PO, expense) auto-creates
 *    a balanced journal entry with source document back-references.
 */

import type { Prisma } from '@prisma/client';
import { UnprocessableError } from '@/lib/error';
import { generateSerial } from '@/lib/sequences';

type TransactionClient = Prisma.TransactionClient;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JournalLineInput {
  accountId: string;
  debit?: number;
  credit?: number;
  description?: string;
  departmentId?: string;
}

export interface CreateJournalEntryOptions {
  tx: TransactionClient;
  organizationId: string;
  userId: string;
  ipAddress?: string;
  date?: Date;
  description?: string;
  reference?: string;
  currency?: string;
  exchangeRate?: number;
  lines: JournalLineInput[];
  // Source document back-references (optional)
  invoiceId?: string;
  purchaseOrderId?: string;
  expenseId?: string;
  paymentId?: string;
}

export interface AccountBalance {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  normalBalance: string;
  totalDebit: number;
  totalCredit: number;
  balance: number; // always positive; side determined by normalBalance
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function validateLines(lines: JournalLineInput[]): void {
  if (lines.length < 2) {
    throw new UnprocessableError('Journal entry must have at least 2 lines.');
  }

  for (const line of lines) {
    const hasDebit = (line.debit ?? 0) > 0;
    const hasCredit = (line.credit ?? 0) > 0;
    if (hasDebit && hasCredit) {
      throw new UnprocessableError(
        `Line for account ${line.accountId} has both debit and credit. Only one is allowed.`,
      );
    }
    if (!hasDebit && !hasCredit) {
      throw new UnprocessableError(
        `Line for account ${line.accountId} has zero debit and zero credit.`,
      );
    }
  }

  const totalDebit = lines.reduce((sum, l) => sum + (l.debit ?? 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit ?? 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.000001) {
    throw new UnprocessableError(
      `Journal entry is not balanced. Debits: ${totalDebit.toFixed(6)}, Credits: ${totalCredit.toFixed(6)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Create and post a journal entry (atomic)
// ---------------------------------------------------------------------------

export async function postJournalEntry(opts: CreateJournalEntryOptions) {
  const {
    tx,
    organizationId,
    userId,
    date = new Date(),
    description,
    reference,
    currency = 'BHD',
    exchangeRate = 1,
    lines,
    invoiceId,
    purchaseOrderId,
    expenseId,
    paymentId,
  } = opts;

  validateLines(lines);

  const entryNumber = await generateSerial({
    db: tx,
    organizationId,
    prefix: 'JE',
  });

  const entry = await tx.journalEntry.create({
    data: {
      entryNumber,
      status: 'POSTED',
      date,
      description,
      reference,
      currency,
      exchangeRate: exchangeRate,
      invoiceId,
      purchaseOrderId,
      expenseId,
      paymentId,
      createdById: userId,
      organizationId,
      postedAt: new Date(),
      lines: {
        create: lines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit ?? 0,
          credit: l.credit ?? 0,
          description: l.description,
          departmentId: l.departmentId ?? null,
          organizationId,
        })),
      },
    },
    include: { lines: true },
  });

  return entry;
}

// ---------------------------------------------------------------------------
// Create a draft journal entry (for manual review before posting)
// ---------------------------------------------------------------------------

export async function createDraftJournalEntry(opts: CreateJournalEntryOptions) {
  const {
    tx,
    organizationId,
    userId,
    date = new Date(),
    description,
    reference,
    currency = 'BHD',
    exchangeRate = 1,
    lines,
    invoiceId,
    purchaseOrderId,
    expenseId,
    paymentId,
  } = opts;

  validateLines(lines);

  const entryNumber = await generateSerial({
    db: tx,
    organizationId,
    prefix: 'JE',
  });

  const entry = await tx.journalEntry.create({
    data: {
      entryNumber,
      status: 'DRAFT',
      date,
      description,
      reference,
      currency,
      exchangeRate: exchangeRate,
      invoiceId,
      purchaseOrderId,
      expenseId,
      paymentId,
      createdById: userId,
      organizationId,
      lines: {
        create: lines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit ?? 0,
          credit: l.credit ?? 0,
          description: l.description,
          departmentId: l.departmentId ?? null,
          organizationId,
        })),
      },
    },
    include: { lines: true },
  });

  return entry;
}

// ---------------------------------------------------------------------------
// Post a draft entry (DRAFT → POSTED)
// ---------------------------------------------------------------------------

export async function postDraftEntry(
  tx: TransactionClient,
  entryId: string,
  organizationId: string,
  userId: string,
) {
  const entry = await tx.journalEntry.findFirst({
    where: { id: entryId, organizationId },
    include: { lines: true },
  });

  if (!entry) throw new UnprocessableError('Journal entry not found.');
  if (entry.status !== 'DRAFT') {
    throw new UnprocessableError(`Cannot post entry in status "${entry.status}". Only DRAFT entries can be posted.`);
  }

  // Re-validate balance at post time
  validateLines(
    entry.lines.map((l) => ({
      accountId: l.accountId,
      debit: Number(l.debit),
      credit: Number(l.credit),
    })),
  );

  return tx.journalEntry.update({
    where: { id: entryId },
    data: { status: 'POSTED', postedAt: new Date() },
    include: { lines: true },
  });
}

// ---------------------------------------------------------------------------
// Void a draft entry (DRAFT → VOID)
// ---------------------------------------------------------------------------

export async function voidDraftEntry(
  tx: TransactionClient,
  entryId: string,
  organizationId: string,
) {
  const entry = await tx.journalEntry.findFirst({
    where: { id: entryId, organizationId },
  });

  if (!entry) throw new UnprocessableError('Journal entry not found.');
  if (entry.status !== 'DRAFT') {
    throw new UnprocessableError(`Cannot void entry in status "${entry.status}". Only DRAFT entries can be voided.`);
  }

  return tx.journalEntry.update({
    where: { id: entryId },
    data: { status: 'VOID' },
  });
}

// ---------------------------------------------------------------------------
// Reverse a posted entry (creates a new entry with opposite debits/credits)
// ---------------------------------------------------------------------------

export async function reversePostedEntry(
  tx: TransactionClient,
  entryId: string,
  organizationId: string,
  userId: string,
  reason?: string,
) {
  const entry = await tx.journalEntry.findFirst({
    where: { id: entryId, organizationId },
    include: { lines: true },
  });

  if (!entry) throw new UnprocessableError('Journal entry not found.');
  if (entry.status !== 'POSTED') {
    throw new UnprocessableError(
      `Cannot reverse entry in status "${entry.status}". Only POSTED entries can be reversed.`,
    );
  }
  if (entry.reversedById) {
    throw new UnprocessableError('This entry has already been reversed.');
  }

  const reversalNumber = await generateSerial({
    db: tx,
    organizationId,
    prefix: 'JE',
  });

  // Create reversal entry with swapped debits/credits
  const reversal = await tx.journalEntry.create({
    data: {
      entryNumber: reversalNumber,
      status: 'POSTED',
      date: new Date(),
      description: reason
        ? `Reversal of ${entry.entryNumber}: ${reason}`
        : `Reversal of ${entry.entryNumber}`,
      reference: entry.entryNumber,
      currency: entry.currency,
      exchangeRate: entry.exchangeRate,
      invoiceId: entry.invoiceId,
      purchaseOrderId: entry.purchaseOrderId,
      expenseId: entry.expenseId,
      paymentId: entry.paymentId,
      reversalOf: { connect: { id: entry.id } },
      createdById: userId,
      organizationId,
      postedAt: new Date(),
      lines: {
        create: entry.lines.map((l) => ({
          accountId: l.accountId,
          debit: Number(l.credit), // Swapped
          credit: Number(l.debit), // Swapped
          description: `Reversal: ${l.description ?? ''}`,
          departmentId: l.departmentId ?? undefined,
          organizationId,
        })),
      },
    },
    include: { lines: true },
  });

  // Mark original as reversed
  await tx.journalEntry.update({
    where: { id: entryId },
    data: { reversedById: reversal.id },
  });

  return reversal;
}

// ---------------------------------------------------------------------------
// Account balances from journal lines (as of a point in time)
// ---------------------------------------------------------------------------

export async function getAccountBalances(
  tx: TransactionClient,
  organizationId: string,
  asOf?: Date,
): Promise<AccountBalance[]> {
  const journalWhere: Prisma.JournalEntryWhereInput = asOf
    ? { status: 'POSTED', date: { lte: asOf } }
    : { status: 'POSTED' };

  const lines = await tx.journalLine.groupBy({
    by: ['accountId'],
    where: {
      organizationId,
      journalEntry: journalWhere,
    },
    _sum: { debit: true, credit: true },
  });

  const accounts = await tx.ledgerAccount.findMany({
    where: { organizationId, isActive: true },
    select: { id: true, code: true, name: true, type: true, normalBalance: true },
  });

  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const results: AccountBalance[] = [];

  for (const line of lines) {
    const account = accountMap.get(line.accountId);
    if (!account) continue;

    const totalDebit = Number(line._sum.debit ?? 0);
    const totalCredit = Number(line._sum.credit ?? 0);

    const balance =
      account.normalBalance === 'DEBIT' ? totalDebit - totalCredit : totalCredit - totalDebit;

    results.push({
      accountId: line.accountId,
      accountCode: account.code,
      accountName: account.name,
      accountType: account.type,
      normalBalance: account.normalBalance,
      totalDebit,
      totalCredit,
      balance,
    });
  }

  return results.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
}

// ---------------------------------------------------------------------------
// Resolve account code to account ID
// ---------------------------------------------------------------------------

export async function resolveAccountCode(
  tx: TransactionClient,
  organizationId: string,
  code: string,
): Promise<string> {
  const account = await tx.ledgerAccount.findFirst({
    where: { code, organizationId, isActive: true },
    select: { id: true },
  });
  if (!account) {
    throw new UnprocessableError(`Ledger account with code "${code}" not found.`);
  }
  return account.id;
}
