/**
 *
 * Hard-delete support for invoice documents (SUPER_ADMIN only).
 *
 * The soft delete (`invoices.delete`) only flags the document as DELETED and
 * is restricted to DRAFT. Super admins additionally need a way to permanently
 * remove a document AND every record that references it — payments, incomes,
 * journal postings, stock movements, credit-note allocations, approval
 * requests, audit logs, tags, notifications and any child documents
 * (credit notes / quote conversions).
 *
 * PRISMA REFERENTIAL ACTIONS:
 * - InvoiceLine & Payment cascade off Invoice (safe to leave to Prisma).
 * - StockMovement, CreditNoteAllocation, Income, JournalEntry and the
 *   Invoice self-references (parentInvoiceId / convertedFromId) use Restrict,
 *   so they MUST be removed explicitly BEFORE the invoice row is deleted.
 */

import type { Prisma } from '@prisma/client';
import { writeAuditLog } from '../shared/audit.service';

type TransactionClient = Prisma.TransactionClient;

export interface HardDeleteInfo {
  id: string;
  serial: string;
  lines: number;
  payments: number;
  incomes: number;
  journalEntries: number;
  stockMovements: number;
  creditNoteAllocations: number;
  creditNotes: number;
  conversions: number;
  auditLogs: number;
  approvalRequests: number;
  tags: number;
  notifications: number;
}

/**
 * Summarize every related record that will be removed by hardDeleteInvoiceTree.
 * Runs inside the caller's transaction client so counts are consistent.
 */
export async function getHardDeleteInfo(
  tx: TransactionClient,
  organizationId: string,
  invoiceId: string,
): Promise<HardDeleteInfo> {
  const invoice = await tx.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    select: { id: true, serial: true },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const [
    lines,
    payments,
    incomes,
    journalEntries,
    stockMovements,
    creditNoteAllocations,
    creditNotes,
    conversions,
    auditLogs,
    approvalRequests,
    tags,
    notifications,
  ] = await Promise.all([
    tx.invoiceLine.count({ where: { invoiceId } }),
    tx.payment.count({ where: { invoiceId } }),
    tx.income.count({ where: { invoiceId } }),
    tx.journalEntry.count({ where: { invoiceId } }),
    tx.stockMovement.count({
      where: { invoiceLine: { invoiceId } },
    }),
    tx.creditNoteAllocation.count({
      where: { OR: [{ creditNoteId: invoiceId }, { invoiceId }] },
    }),
    tx.invoice.count({ where: { parentInvoiceId: invoiceId } }),
    tx.invoice.count({ where: { convertedFromId: invoiceId } }),
    tx.auditLog.count({
      where: { entityType: 'Invoice', entityId: invoiceId },
    }),
    tx.approvalRequest.count({
      where: { entityType: 'Invoice', entityId: invoiceId },
    }),
    tx.tagging.count({
      where: { entityType: 'Invoice', entityId: invoiceId },
    }),
    tx.notification.count({
      where: { entityType: 'Invoice', entityId: invoiceId },
    }),
  ]);

  return {
    id: invoice.id,
    serial: invoice.serial,
    lines,
    payments,
    incomes,
    journalEntries,
    stockMovements,
    creditNoteAllocations,
    creditNotes,
    conversions,
    auditLogs,
    approvalRequests,
    tags,
    notifications,
  };
}

/**
 * Permanently delete an invoice document and every related record.
 *
 * Recurses into child documents first (credit notes / quote conversions that
 * reference this invoice) because their FK references (Restrict) would block
 * the parent delete. All child documents are removed inside the same
 * transaction, so the operation is atomic.
 */
export async function hardDeleteInvoiceTree(
  tx: TransactionClient,
  organizationId: string,
  invoiceId: string,
  userId: string,
  ipAddress?: string,
): Promise<void> {
  const invoice = await tx.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    select: { id: true, serial: true },
  });

  if (!invoice) return;

  // ── 1. Recursively delete child documents referencing this one ─────────
  const children = await tx.invoice.findMany({
    where: {
      organizationId,
      OR: [{ parentInvoiceId: invoiceId }, { convertedFromId: invoiceId }],
    },
    select: { id: true },
  });
  for (const child of children) {
    await hardDeleteInvoiceTree(tx, organizationId, child.id, userId, ipAddress);
  }

  // ── 2. Stock movements recorded against this document's lines ──────────
  await tx.stockMovement.deleteMany({
    where: { invoiceLine: { invoiceId } },
  });

  // ── 3. Credit-note allocations (either side) ───────────────────────────
  await tx.creditNoteAllocation.deleteMany({
    where: { OR: [{ creditNoteId: invoiceId }, { invoiceId }] },
  });

  // ── 4. Recognized revenue rows ─────────────────────────────────────────
  await tx.income.deleteMany({ where: { invoiceId } });

  // ── 5. Journal postings (lines cascade) ────────────────────────────────
  const paymentIds = await tx.payment.findMany({
    where: { invoiceId },
    select: { id: true },
  });
  if (paymentIds.length > 0) {
    await tx.journalEntry.deleteMany({
      where: { paymentId: { in: paymentIds.map((p) => p.id) } },
    });
  }
  await tx.journalEntry.deleteMany({ where: { invoiceId } });

  // ── 6. Payments (invoice cascade would also handle this) ───────────────
  await tx.payment.deleteMany({ where: { invoiceId } });

  // ── 7. Polymorphic records ─────────────────────────────────────────────
  await tx.approvalRequest.deleteMany({
    where: { entityType: 'Invoice', entityId: invoiceId },
  });
  await tx.auditLog.deleteMany({
    where: { entityType: 'Invoice', entityId: invoiceId },
  });
  await tx.tagging.deleteMany({
    where: { entityType: 'Invoice', entityId: invoiceId },
  });
  await tx.notification.deleteMany({
    where: { entityType: 'Invoice', entityId: invoiceId },
  });

  // ── 8. Audit trace before the document is gone ─────────────────────────
  await writeAuditLog(
    {
      entityType: 'Invoice',
      entityId: invoiceId,
      action: 'DELETE',
      diff: {
        hardDelete: { before: invoice.serial, after: null },
      },
      organizationId,
      userId,
      ipAddress,
    },
    tx,
  );

  // ── 9. Remove the document itself (lines cascade) ──────────────────────
  await tx.invoice.delete({ where: { id: invoiceId } });
}
