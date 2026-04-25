/**
 * shared.ts — Zod primitives and helpers shared across all routers
 */

import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// Guard helpers
// ---------------------------------------------------------------------------

/**
 * Assert a record exists and belongs to the caller's org.
 * Throws NOT_FOUND if missing, FORBIDDEN if org mismatch.
 */
export function assertOwnership(
  record: { organizationId: string } | null,
  organizationId: string,
  entity: string,
): { organizationId: string } {
  if (!record) {
    throw new TRPCError({ code: 'NOT_FOUND', message: `${entity} not found` });
  }
  if (record.organizationId !== organizationId) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return record;
}

/**
 * Throw if the organization context is missing from the session.
 */
export function requireOrgId(organizationId: string | null): string {
  if (!organizationId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'No organization associated with this account',
    });
  }
  return organizationId;
}

// ---------------------------------------------------------------------------
// Document serial generator
// Must be called inside a prisma.$transaction.
// ---------------------------------------------------------------------------

export async function nextSerial(
  tx: Omit<PrismaClient, '$transaction' | '$connect' | '$disconnect' | '$on' | '$use' | '$extends'>,
  organizationId: string,
  prefix: 'INV' | 'QTE' | 'CN' | 'PO',
): Promise<string> {
  // Upsert the sequence row, then atomically increment.
  await tx.documentSequence.upsert({
    where: { organizationId_prefix: { organizationId, prefix } },
    create: { organizationId, prefix, nextVal: 1 },
    update: {},
  });

  // Raw SQL increment + return — guarantees no race condition.
  const result = await tx.$queryRaw<{ next_val: number }[]>`
    UPDATE "DocumentSequence"
    SET    "nextVal" = "nextVal" + 1
    WHERE  "organizationId" = ${organizationId}
      AND  "prefix"         = ${prefix}
    RETURNING "nextVal" as next_val
  `;

  const val = result[0]?.next_val ?? 1;
  return `${prefix}-${String(val).padStart(5, '0')}`;
}

// ---------------------------------------------------------------------------
// Invoice total computation
// Call after any line change; pass the invoiceId.
// Returns the updated totals — caller must persist them.
// ---------------------------------------------------------------------------

export async function computeInvoiceTotals(
  tx: Omit<PrismaClient, '$transaction' | '$connect' | '$disconnect' | '$on' | '$use' | '$extends'>,
  invoiceId: string,
) {
  const lines = await tx.invoiceLine.findMany({
    where: { invoiceId },
    select: { unitPrice: true, quantity: true, discountAmt: true, taxAmt: true, total: true },
  });

  let subtotal = BigInt(0);
  let discountTotal = BigInt(0);
  let taxTotal = BigInt(0);
  let total = BigInt(0);

  for (const line of lines) {
    const lineSubtotal =
      (BigInt(line.unitPrice) * BigInt(Math.round(Number(line.quantity) * 1000))) / BigInt(1000);
    subtotal += lineSubtotal;
    discountTotal += BigInt(line.discountAmt);
    taxTotal += BigInt(line.taxAmt);
    total += BigInt(line.total);
  }

  return { subtotal, discountTotal, taxTotal, total };
}

/**
 * Recompute and persist group totals for one InvoiceLineGroup.
 */
export async function recomputeGroupTotals(
  tx: Omit<PrismaClient, '$transaction' | '$connect' | '$disconnect' | '$on' | '$use' | '$extends'>,
  groupId: string,
) {
  const lines = await tx.invoiceLine.findMany({
    where: { groupId },
    select: { discountAmt: true, taxAmt: true, total: true, unitPrice: true, quantity: true },
  });

  let subtotal = BigInt(0);
  let discountTotal = BigInt(0);
  let taxTotal = BigInt(0);
  let total = BigInt(0);

  for (const l of lines) {
    subtotal +=
      (BigInt(l.unitPrice) * BigInt(Math.round(Number(l.quantity) * 1000))) / BigInt(1000);
    discountTotal += BigInt(l.discountAmt);
    taxTotal += BigInt(l.taxAmt);
    total += BigInt(l.total);
  }

  await tx.invoiceLineGroup.update({
    where: { id: groupId },
    data: { subtotal, discountTotal, taxTotal, total },
  });
}

/**
 * Recompute amountPaid + amountDue + paymentStatus on an Invoice.
 * Call inside a $transaction after any Payment insert/delete.
 */
export async function syncInvoicePaymentStatus(
  tx: Omit<PrismaClient, '$transaction' | '$connect' | '$disconnect' | '$on' | '$use' | '$extends'>,
  invoiceId: string,
) {
  const invoice = await tx.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    select: { total: true, dueDate: true, status: true },
  });

  const payments = await tx.payment.aggregate({
    where: { invoiceId },
    _sum: { amount: true },
  });

  const amountPaid = payments._sum.amount ?? BigInt(0);
  const amountDue = BigInt(invoice.total) - amountPaid;

  let paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';

  if (invoice.status === 'CANCELLED') {
    paymentStatus = 'CANCELLED';
  } else if (amountDue <= BigInt(0)) {
    paymentStatus = 'PAID';
  } else if (amountPaid > BigInt(0)) {
    paymentStatus = 'PARTIAL';
  } else if (invoice.dueDate && invoice.dueDate < new Date()) {
    paymentStatus = 'OVERDUE';
  } else {
    paymentStatus = 'PENDING';
  }

  let invoiceStatus = invoice.status;
  if (paymentStatus === 'PAID' && invoice.status !== 'CANCELLED') invoiceStatus = 'PAID';
  else if (paymentStatus === 'PARTIAL' && invoice.status === 'SENT') invoiceStatus = 'PARTIAL';

  await tx.invoice.update({
    where: { id: invoiceId },
    data: { amountPaid, amountDue, paymentStatus, status: invoiceStatus },
  });
}

/**
 * Sync PurchaseOrder amountPaid / amountOwed after a PurchasePayment change.
 */
export async function syncPOPaymentStatus(
  tx: Omit<PrismaClient, '$transaction' | '$connect' | '$disconnect' | '$on' | '$use' | '$extends'>,
  purchaseOrderId: string,
) {
  const po = await tx.purchaseOrder.findUniqueOrThrow({
    where: { id: purchaseOrderId },
    select: { total: true },
  });

  const payments = await tx.purchasePayment.aggregate({
    where: { purchaseOrderId },
    _sum: { amount: true },
  });

  const amountPaid = payments._sum.amount ?? BigInt(0);
  const amountOwed = BigInt(po.total) - amountPaid;

  await tx.purchaseOrder.update({
    where: { id: purchaseOrderId },
    data: { amountPaid, amountOwed },
  });
}

// ---------------------------------------------------------------------------
// Stock helpers
// ---------------------------------------------------------------------------

/**
 * Deduct stock for all PRODUCT+saleable lines of a confirmed invoice.
 * Must be called inside a $transaction.
 */
export async function deductStockForInvoice(
  tx: Omit<PrismaClient, '$transaction' | '$connect' | '$disconnect' | '$on' | '$use' | '$extends'>,
  invoiceId: string,
  warehouseId: string,
  userId: string,
  organizationId: string,
) {
  const lines = await tx.invoiceLine.findMany({
    where: { invoiceId, item: { type: 'PRODUCT', isSaleable: true } },
    include: { item: true },
  });

  for (const line of lines) {
    if (!line.itemId) continue;
    const qty = Math.round(Number(line.quantity));

    // Guard: check stock is sufficient
    const stock = await tx.stock.findUnique({
      where: { itemId_warehouseId: { itemId: line.itemId, warehouseId } },
      select: { quantity: true },
    });

    if (!stock || stock.quantity < qty) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Insufficient stock for item: ${line.item?.name ?? line.itemId}`,
      });
    }

    await tx.stock.update({
      where: { itemId_warehouseId: { itemId: line.itemId, warehouseId } },
      data: { quantity: { decrement: qty } },
    });

    await tx.stockMovement.create({
      data: {
        type: 'SALE_OUTBOUND',
        quantity: -qty,
        invoiceLineId: line.id,
        itemId: line.itemId,
        fromWarehouseId: warehouseId,
        userId,
        organizationId,
      },
    });
  }
}

/**
 * Reverse stock deduction — used when cancelling an invoice that was SENT/PARTIAL/PAID.
 */
export async function reverseStockForInvoice(
  tx: Omit<PrismaClient, '$transaction' | '$connect' | '$disconnect' | '$on' | '$use' | '$extends'>,
  invoiceId: string,
  warehouseId: string,
  userId: string,
  organizationId: string,
) {
  const lines = await tx.invoiceLine.findMany({
    where: { invoiceId, item: { type: 'PRODUCT', isSaleable: true } },
    select: { id: true, itemId: true, quantity: true },
  });

  for (const line of lines) {
    if (!line.itemId) continue;
    const qty = Math.round(Number(line.quantity));

    await tx.stock.update({
      where: { itemId_warehouseId: { itemId: line.itemId, warehouseId } },
      data: { quantity: { increment: qty } },
    });

    await tx.stockMovement.create({
      data: {
        type: 'RETURN_INBOUND',
        quantity: qty,
        invoiceLineId: line.id,
        itemId: line.itemId,
        toWarehouseId: warehouseId,
        userId,
        organizationId,
        notes: `Invoice cancellation reversal`,
      },
    });
  }
}
