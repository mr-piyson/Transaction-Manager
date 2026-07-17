/**
 * Auto-posting service — bridges business events to balanced journal entries.
 *
 * Every financial event (invoice sent, payment received, PO received, expense)
 * creates a double-entry journal entry with balanced debit/credit lines.
 *
 * ACCOUNT MAPPING:
 * The seed chart of accounts provides default account codes. Items and expense
 * categories can override these defaults per-entity.
 *
 * POSTING RULES:
 *   Invoice Sent:    Dr Accounts Receivable  / Cr Sales Revenue + Cr Tax Payable
 *                    Dr COGS                 / Cr Inventory
 *   Credit Note:     Reverses the original invoice posting
 *   Payment Received: Dr Cash/Bank           / Cr Accounts Receivable
 *   PO Received:     Dr Inventory            / Cr Accounts Payable
 *   PO Payment:      Dr Accounts Payable     / Cr Cash/Bank
 *   Expense:         Dr Expense Account      / Cr Cash/Bank
 */

import type { Prisma } from '@prisma/client';
import { UnprocessableError } from '@/lib/error';
import { postJournalEntry, resolveAccountCode } from '../journals/journal.service';

type TransactionClient = Prisma.TransactionClient;

// ---------------------------------------------------------------------------
// Default account codes (seed data)
// ---------------------------------------------------------------------------

const ACCOUNTS = {
  CASH: '1010',
  BANK: '1020',
  ACCOUNTS_RECEIVABLE: '1100',
  INVENTORY: '1200',
  ACCOUNTS_PAYABLE: '2010',
  TAX_PAYABLE: '2030',
  SALES_REVENUE: '4010',
  COGS: '5010',
} as const;

// ---------------------------------------------------------------------------
// Resolve accounts for an org (cached per transaction)
// ---------------------------------------------------------------------------

async function resolveAccounts(tx: TransactionClient, organizationId: string) {
  const codes = Object.values(ACCOUNTS);
  const accounts = await tx.ledgerAccount.findMany({
    where: { code: { in: codes }, organizationId, isActive: true },
    select: { id: true, code: true },
  });
  const map = new Map(accounts.map((a) => [a.code, a.id]));
  for (const code of codes) {
    if (!map.has(code)) {
      throw new UnprocessableError(`Required ledger account "${code}" not found in chart of accounts.`);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Resolve bank account from payment method
// ---------------------------------------------------------------------------

function resolveBankAccountCode(method: string): string {
  switch (method) {
    case 'CASH':
    case 'CHEQUE':
      return ACCOUNTS.CASH;
    case 'BANK_TRANSFER':
    case 'CREDIT_CARD':
    case 'DEBIT_CARD':
    case 'ONLINE':
    default:
      return ACCOUNTS.BANK;
  }
}

// ---------------------------------------------------------------------------
// Invoice posting
// ---------------------------------------------------------------------------

interface PostInvoiceOptions {
  tx: TransactionClient;
  organizationId: string;
  userId: string;
  ipAddress?: string;
  invoiceId: string;
  serial: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  costTotal: number;
  currency?: string;
  exchangeRate?: number;
  lines: Array<{
    departmentId?: string;
  }>;
}

export async function postInvoiceSent(opts: PostInvoiceOptions) {
  const { tx, organizationId, userId, ipAddress, invoiceId, serial, subtotal, taxTotal, total, costTotal, currency, exchangeRate, lines } = opts;

  const accounts = await resolveAccounts(tx, organizationId);

  const journalLines: Array<{
    accountId: string;
    debit: number;
    credit: number;
    description?: string;
    departmentId?: string;
  }> = [];

  // Revenue recognition + AR + Tax
  journalLines.push({
    accountId: accounts.get(ACCOUNTS.ACCOUNTS_RECEIVABLE)!,
    debit: total,
    credit: 0,
    description: `INV #${serial} — Accounts Receivable`,
  });

  if (subtotal > 0) {
    journalLines.push({
      accountId: accounts.get(ACCOUNTS.SALES_REVENUE)!,
      debit: 0,
      credit: subtotal,
      description: `INV #${serial} — Sales Revenue`,
      departmentId: lines[0]?.departmentId,
    });
  }

  if (taxTotal > 0) {
    journalLines.push({
      accountId: accounts.get(ACCOUNTS.TAX_PAYABLE)!,
      debit: 0,
      credit: taxTotal,
      description: `INV #${serial} — Tax Payable`,
    });
  }

  // COGS + Inventory (only if there's a cost)
  if (costTotal > 0) {
    journalLines.push({
      accountId: accounts.get(ACCOUNTS.COGS)!,
      debit: costTotal,
      credit: 0,
      description: `INV #${serial} — Cost of Goods Sold`,
    });
    journalLines.push({
      accountId: accounts.get(ACCOUNTS.INVENTORY)!,
      debit: 0,
      credit: costTotal,
      description: `INV #${serial} — Inventory`,
    });
  }

  return postJournalEntry({
    tx,
    organizationId,
    userId,
    ipAddress,
    date: new Date(),
    description: `Invoice ${serial} — revenue recognition`,
    reference: serial,
    currency,
    exchangeRate,
    invoiceId,
    lines: journalLines,
  });
}

// ---------------------------------------------------------------------------
// Credit note posting (reverses the original invoice)
// ---------------------------------------------------------------------------

export async function postCreditNoteSent(opts: PostInvoiceOptions) {
  const { tx, organizationId, userId, ipAddress, invoiceId, serial, subtotal, taxTotal, total, costTotal, currency, exchangeRate, lines } = opts;

  const accounts = await resolveAccounts(tx, organizationId);

  const journalLines: Array<{
    accountId: string;
    debit: number;
    credit: number;
    description?: string;
    departmentId?: string;
  }> = [];

  // Reverse revenue recognition
  if (subtotal > 0) {
    journalLines.push({
      accountId: accounts.get(ACCOUNTS.SALES_REVENUE)!,
      debit: subtotal,
      credit: 0,
      description: `CN #${serial} — Sales Revenue reversal`,
      departmentId: lines[0]?.departmentId,
    });
  }

  if (taxTotal > 0) {
    journalLines.push({
      accountId: accounts.get(ACCOUNTS.TAX_PAYABLE)!,
      debit: taxTotal,
      credit: 0,
      description: `CN #${serial} — Tax Payable reversal`,
    });
  }

  journalLines.push({
    accountId: accounts.get(ACCOUNTS.ACCOUNTS_RECEIVABLE)!,
    debit: 0,
    credit: total,
    description: `CN #${serial} — Accounts Receivable reversal`,
  });

  // Reverse COGS + Inventory (only if there's a cost)
  if (costTotal > 0) {
    journalLines.push({
      accountId: accounts.get(ACCOUNTS.INVENTORY)!,
      debit: costTotal,
      credit: 0,
      description: `CN #${serial} — Inventory reversal`,
    });
    journalLines.push({
      accountId: accounts.get(ACCOUNTS.COGS)!,
      debit: 0,
      credit: costTotal,
      description: `CN #${serial} — COGS reversal`,
    });
  }

  return postJournalEntry({
    tx,
    organizationId,
    userId,
    ipAddress,
    date: new Date(),
    description: `Credit Note ${serial} — revenue reversal`,
    reference: serial,
    currency,
    exchangeRate,
    invoiceId,
    lines: journalLines,
  });
}

// ---------------------------------------------------------------------------
// Payment posting (invoice payment received)
// ---------------------------------------------------------------------------

interface PostPaymentOptions {
  tx: TransactionClient;
  organizationId: string;
  userId: string;
  ipAddress?: string;
  paymentId: string;
  invoiceId: string;
  amount: number;
  method: string;
  serial: string;
  currency?: string;
  exchangeRate?: number;
}

export async function postPaymentReceived(opts: PostPaymentOptions) {
  const { tx, organizationId, userId, ipAddress, paymentId, invoiceId, amount, method, serial, currency, exchangeRate } = opts;

  const accounts = await resolveAccounts(tx, organizationId);
  const bankCode = resolveBankAccountCode(method);

  return postJournalEntry({
    tx,
    organizationId,
    userId,
    ipAddress,
    date: new Date(),
    description: `Payment received for INV #${serial}`,
    reference: serial,
    currency,
    exchangeRate,
    paymentId,
    invoiceId,
    lines: [
      {
        accountId: accounts.get(bankCode)!,
        debit: amount,
        credit: 0,
        description: `Payment — ${method}`,
      },
      {
        accountId: accounts.get(ACCOUNTS.ACCOUNTS_RECEIVABLE)!,
        debit: 0,
        credit: amount,
        description: `INV #${serial} — Accounts Receivable`,
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// PO received posting (inventory + AP)
// ---------------------------------------------------------------------------

interface PostPOReceivedOptions {
  tx: TransactionClient;
  organizationId: string;
  userId: string;
  ipAddress?: string;
  purchaseOrderId: string;
  serial: string;
  receivedCost: number;
  currency?: string;
  exchangeRate?: number;
}

export async function postPOReceived(opts: PostPOReceivedOptions) {
  const { tx, organizationId, userId, ipAddress, purchaseOrderId, serial, receivedCost, currency, exchangeRate } = opts;

  if (receivedCost <= 0) return null;

  const accounts = await resolveAccounts(tx, organizationId);

  return postJournalEntry({
    tx,
    organizationId,
    userId,
    ipAddress,
    date: new Date(),
    description: `PO #${serial} — inventory received`,
    reference: serial,
    currency,
    exchangeRate,
    purchaseOrderId,
    lines: [
      {
        accountId: accounts.get(ACCOUNTS.INVENTORY)!,
        debit: receivedCost,
        credit: 0,
        description: `PO #${serial} — Inventory`,
      },
      {
        accountId: accounts.get(ACCOUNTS.ACCOUNTS_PAYABLE)!,
        debit: 0,
        credit: receivedCost,
        description: `PO #${serial} — Accounts Payable`,
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// PO payment posting (AP + Cash/Bank)
// ---------------------------------------------------------------------------

interface PostPOPaymentOptions {
  tx: TransactionClient;
  organizationId: string;
  userId: string;
  ipAddress?: string;
  purchaseOrderId: string;
  serial: string;
  amount: number;
  method: string;
  currency?: string;
  exchangeRate?: number;
}

export async function postPOPayment(opts: PostPOPaymentOptions) {
  const { tx, organizationId, userId, ipAddress, purchaseOrderId, serial, amount, method, currency, exchangeRate } = opts;

  const accounts = await resolveAccounts(tx, organizationId);
  const bankCode = resolveBankAccountCode(method);

  return postJournalEntry({
    tx,
    organizationId,
    userId,
    ipAddress,
    date: new Date(),
    description: `Payment to supplier for PO #${serial}`,
    reference: serial,
    currency,
    exchangeRate,
    purchaseOrderId,
    lines: [
      {
        accountId: accounts.get(ACCOUNTS.ACCOUNTS_PAYABLE)!,
        debit: amount,
        credit: 0,
        description: `PO #${serial} — Accounts Payable`,
      },
      {
        accountId: accounts.get(bankCode)!,
        debit: 0,
        credit: amount,
        description: `Payment — ${method}`,
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// Expense posting (Expense + Cash/Bank)
// ---------------------------------------------------------------------------

interface PostExpenseOptions {
  tx: TransactionClient;
  organizationId: string;
  userId: string;
  ipAddress?: string;
  expenseId: string;
  amount: number;
  method: string;
  description: string;
  // Expense category's account code, or falls back to a generic expense
  expenseAccountCode?: string;
  currency?: string;
  exchangeRate?: number;
}

export async function postExpense(opts: PostExpenseOptions) {
  const { tx, organizationId, userId, ipAddress, expenseId, amount, method, description, expenseAccountCode, currency, exchangeRate } = opts;

  const accounts = await resolveAccounts(tx, organizationId);
  const bankCode = resolveBankAccountCode(method);

  // Resolve expense account: use category's account if provided, else generic COGS
  let expenseAccountId = accounts.get(expenseAccountCode ?? ACCOUNTS.COGS)!;
  if (expenseAccountCode) {
    try {
      expenseAccountId = await resolveAccountCode(tx, organizationId, expenseAccountCode);
    } catch {
      // Fall back to default COGS if custom code not found
      expenseAccountId = accounts.get(ACCOUNTS.COGS)!;
    }
  }

  return postJournalEntry({
    tx,
    organizationId,
    userId,
    ipAddress,
    date: new Date(),
    description,
    expenseId,
    currency,
    exchangeRate,
    lines: [
      {
        accountId: expenseAccountId,
        debit: amount,
        credit: 0,
        description,
      },
      {
        accountId: accounts.get(bankCode)!,
        debit: 0,
        credit: amount,
        description: `Payment — ${method}`,
      },
    ],
  });
}
