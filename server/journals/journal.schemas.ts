import { z } from 'zod';

export const journalLineSchema = z.object({
  accountId: z.string(),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
  description: z.string().max(500).optional(),
  departmentId: z.string().optional(),
});

export const createJournalEntrySchema = z
  .object({
    date: z.coerce.date().default(() => new Date()),
    description: z.string().max(500).optional(),
    reference: z.string().max(255).optional(),
    currency: z.string().length(3).default('BHD'),
    exchangeRate: z.number().positive().default(1),
    lines: z.array(journalLineSchema).min(2, 'At least 2 lines required'),
    invoiceId: z.string().optional(),
    purchaseOrderId: z.string().optional(),
    expenseId: z.string().optional(),
    paymentId: z.string().optional(),
  })
  .refine(
    (data) => {
      const totalDebit = data.lines.reduce((sum, l) => sum + (l.debit ?? 0), 0);
      const totalCredit = data.lines.reduce((sum, l) => sum + (l.credit ?? 0), 0);
      return Math.abs(totalDebit - totalCredit) < 0.000001;
    },
    { message: 'Total debits must equal total credits.' },
  );

export const listJournalEntriesSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  status: z.enum(['DRAFT', 'POSTED', 'REVERSED', 'VOID']).optional(),
  accountId: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sortBy: z.enum(['date', 'entryNumber', 'createdAt']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
