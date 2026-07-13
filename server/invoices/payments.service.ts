/**
 *
 * Invoice payment lifecycle service.
 *
 * DENORMALISATION STRATEGY:
 * Invoice.amountPaid and Invoice.paymentStatus are denormalised computed fields.
 * They are recomputed and persisted every time a payment is added or deleted.
 *
 * WHY DENORMALISE?
 * AR aging queries (dashboard, overdue report) run against millions of invoice
 * rows. Doing a SUM(payments) join on every query kills performance.
 * Denormalising means the aging query is a simple table scan with a WHERE filter.
 *
 * ATOMICITY:
 * Payment creation + Invoice.amountPaid update + status update all happen in
 * a single $transaction. A payment row can never exist without the invoice
 * totals reflecting it.
 *
 * CREDIT NOTE ALLOCATION:
 * When method = "CREDIT", the caller should also create a CreditNoteAllocation
 * row. This service records the payment amount; the allocation service tracks
 * which credit note it came from.
 */

import type { PaymentMethod, Prisma } from '@prisma/client';
import { NotFoundError, UnprocessableError } from '@/lib/error';
import { writeAuditLog } from '../shared/audit.service';

type TransactionClient = Prisma.TransactionClient;

// ---------------------------------------------------------------------------
// Payment status resolver
// ---------------------------------------------------------------------------

export function resolvePaymentStatus(
  total: number,
  amountPaid: number,
  dueDate: Date | null,
  creditApplied: number = 0,
): 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' {
  const effectivePaid = amountPaid + creditApplied;
  if (effectivePaid <= 0) {
    if (dueDate && dueDate < new Date()) return 'OVERDUE';
    return 'PENDING';
  }
  if (effectivePaid >= total) return 'PAID';
  if (dueDate && dueDate < new Date()) return 'OVERDUE';
  return 'PARTIAL';
}

// Also resolves InvoiceStatus from payment state
export function resolveInvoiceStatus(
  currentStatus: string,
  amountPaid: number,
  total: number,
  dueDate: Date | null,
  creditApplied: number = 0,
): 'SENT' | 'PARTIAL' | 'PAID' | 'OVERDUE' {
  // Terminal statuses — don't change
  if (['CANCELLED', 'DELETED'].includes(currentStatus)) {
    return currentStatus as 'SENT';
  }
  const effectivePaid = amountPaid + creditApplied;
  if (effectivePaid >= total) return 'PAID';
  if (effectivePaid > 0) return 'PARTIAL';
  if (dueDate && dueDate < new Date()) return 'OVERDUE';
  return 'SENT';
}

// ---------------------------------------------------------------------------
// Recalculate and persist payment totals on the invoice
// ---------------------------------------------------------------------------

export async function syncInvoicePaymentTotals(
  tx: TransactionClient,
  invoiceId: string,
  organizationId: string,
  userId: string,
  ipAddress: string,
): Promise<void> {
  // Sum all payments for this invoice
  const aggregate = await tx.payment.aggregate({
    where: { invoiceId, organizationId },
    _sum: { amount: true },
  });

  const amountPaid = Number(aggregate._sum.amount ?? 0);

  // Sum all credit note allocations for this invoice
  const creditAggregate = await tx.creditNoteAllocation.aggregate({
    where: { invoiceId, organizationId },
    _sum: { amount: true },
  });

  const creditApplied = Number(creditAggregate._sum.amount ?? 0);

  // Load current invoice state
  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    select: { total: true, dueDate: true, status: true },
  });

  if (!invoice) throw new NotFoundError('Invoice', invoiceId);

  const total = Number(invoice.total);
  const amountDue = Math.max(0, total - amountPaid - creditApplied);

  const paymentStatus = resolvePaymentStatus(total, amountPaid, invoice.dueDate, creditApplied);
  const invoiceStatus = resolveInvoiceStatus(invoice.status, amountPaid, total, invoice.dueDate, creditApplied);

  const oldStatus = invoice.status;

  await tx.invoice.update({
    where: { id: invoiceId },
    data: {
      amountPaid,
      amountDue,
      paymentStatus,
      status: invoiceStatus,
      updatedById: userId,
    },
  });

  if (oldStatus !== invoiceStatus) {
    await writeAuditLog(
      {
        entityType: 'Invoice',
        entityId: invoiceId,
        action: 'STATUS_CHANGE',
        diff: { status: { before: oldStatus, after: invoiceStatus } },
        organizationId,
        userId,
        ipAddress,
      },
      tx,
    );
  }
}

// ---------------------------------------------------------------------------
// Add a payment
// ---------------------------------------------------------------------------

interface AddPaymentOptions {
  tx: TransactionClient;
  invoiceId: string;
  organizationId: string;
  userId: string;
  ipAddress: string;
  amount: number;
  method: PaymentMethod;
  date: Date;
  reference?: string;
  notes?: string;
  gatewayTxnId?: string;
}

export async function addPayment(opts: AddPaymentOptions) {
  const { tx, invoiceId, organizationId, userId, ipAddress, ...paymentData } = opts;

  // Guard: cannot overpay beyond the invoice total
  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    select: { total: true, amountPaid: true, status: true },
  });

  if (!invoice) throw new NotFoundError('Invoice', invoiceId);

  if (['CANCELLED', 'DELETED'].includes(invoice.status)) {
    throw new UnprocessableError('Cannot record a payment on a cancelled or deleted invoice.');
  }

  const currentPaid = Number(invoice.amountPaid);
  const total = Number(invoice.total);
  const maxPayable = total - currentPaid;

  if (paymentData.amount > maxPayable + 0.000001) {
    throw new UnprocessableError(
      `Payment amount (${paymentData.amount}) exceeds outstanding balance (${maxPayable.toFixed(3)}).`,
    );
  }

  const payment = await tx.payment.create({
    data: {
      ...paymentData,
      invoiceId,
      organizationId,
    },
  });

  await syncInvoicePaymentTotals(tx, invoiceId, organizationId, userId, ipAddress);

  await writeAuditLog(
    {
      entityType: 'Payment',
      entityId: payment.id,
      action: 'PAYMENT',
      diff: {
        amount: { before: null, after: paymentData.amount },
        method: { before: null, after: paymentData.method },
      },
      organizationId,
      userId,
      ipAddress,
    },
    tx,
  );

  return payment;
}

// ---------------------------------------------------------------------------
// Delete a payment (reversal)
// ---------------------------------------------------------------------------

interface DeletePaymentOptions {
  tx: TransactionClient;
  paymentId: string;
  organizationId: string;
  userId: string;
  ipAddress: string;
}

export async function deletePayment(opts: DeletePaymentOptions): Promise<void> {
  const { tx, paymentId, organizationId, userId, ipAddress } = opts;

  const payment = await tx.payment.findFirst({
    where: { id: paymentId, organizationId },
    select: { id: true, invoiceId: true, amount: true, method: true },
  });

  if (!payment) throw new NotFoundError('Payment', paymentId);

  // Verify invoice is still in a mutable state
  const invoice = await tx.invoice.findUnique({
    where: { id: payment.invoiceId },
    select: { status: true },
  });

  if (invoice?.status === 'CANCELLED' || invoice?.status === 'DELETED') {
    throw new UnprocessableError('Cannot delete payment on a cancelled or deleted invoice.');
  }

  await tx.payment.delete({ where: { id: paymentId } });

  await syncInvoicePaymentTotals(tx, payment.invoiceId, organizationId, userId, ipAddress);

  await writeAuditLog(
    {
      entityType: 'Payment',
      entityId: paymentId,
      action: 'DELETE',
      diff: {
        amount: { before: payment.amount, after: null },
        method: { before: payment.method, after: null },
      },
      organizationId,
      userId,
      ipAddress,
    },
    tx,
  );
}
