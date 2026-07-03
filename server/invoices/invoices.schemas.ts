import { z } from 'zod';
import {
  currencyCodeSchema,
  dateRangeSchema,
  offsetPaginationSchema,
  sortOrderSchema,
} from '@/lib/validations';

// ---------------------------------------------------------------------------
// Shared line schema
// ---------------------------------------------------------------------------

const invoiceLineInputSchema = z.object({
  id: z.string().optional(),
  itemId: z.string().optional(),
  description: z.string().max(1000).optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  discountAmt: z.number().min(0).default(0),
  purchasePrice: z.number().min(0).optional(),
  taxRateId: z.string().optional(),
  taxRateSnapshot: z.number().min(0).optional(),
  taxRateName: z.string().optional(),
  sortOrder: z.number().int().default(0),
  departmentId: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Invoice schemas
// ---------------------------------------------------------------------------

const invoiceBaseSchema = z.object({
  type: z.enum(['QUOTE', 'INVOICE', 'CREDIT_NOTE', 'PROFORMA', 'DELIVERY_NOTE']).default('INVOICE'),
  date: z.coerce.date().default(() => new Date()),
  dueDate: z.coerce.date().optional(),
  customerId: z.string().optional(),
  warehouseId: z.string().optional(),
  departmentId: z.string().optional(),
  currency: currencyCodeSchema.default('BHD'),
  exchangeRate: z.number().positive().default(1),
  description: z.string().max(2000).optional(),
  notes: z.string().max(5000).optional(),
  termsText: z.string().max(50000).optional(),
  internalNotes: z.string().max(5000).optional(),
  isWalkIn: z.boolean().default(false),
  parentInvoiceId: z.string().optional(),
  lines: z.array(invoiceLineInputSchema).min(1, 'At least one line is required'),
});

export const createInvoiceSchema = invoiceBaseSchema;

export const updateInvoiceSchema = invoiceBaseSchema.partial().extend({
  id: z.string(),
  version: z.number().int(),
  lines: z.array(invoiceLineInputSchema).min(1).optional(),
});

export const listInvoicesSchema = z.object({
  ...offsetPaginationSchema.shape,
  search: z.string().optional(),
  type: z.enum(['QUOTE', 'INVOICE', 'CREDIT_NOTE', 'PROFORMA', 'DELIVERY_NOTE']).optional(),
  status: z
    .enum([
      'DRAFT',
      'PENDING_APPROVAL',
      'APPROVED',
      'SENT',
      'PARTIAL',
      'PAID',
      'OVERDUE',
      'CANCELLED',
      'DELETED',
    ])
    .optional(),
  paymentStatus: z.enum(['PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  customerId: z.string().optional(),
  dateRange: dateRangeSchema,
  dueDateRange: dateRangeSchema,
  sortBy: z.enum(['date', 'dueDate', 'total', 'serial', 'createdAt']).default('date'),
  sortOrder: sortOrderSchema,
});
