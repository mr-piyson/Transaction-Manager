/**
 *
 * Hard-delete support for item master records (SUPER_ADMIN only).
 *
 * The soft delete (`items.delete`) only flags the item (deletedAt + isActive)
 * and blocks while on-hand stock exists. Super admins additionally need a way
 * to permanently remove an item AND every record that references it — stock
 * levels, stock movements, supplier catalogs, bundle definitions, price-list
 * lines, purchase lines, plus polymorphic audit/tag/notification/attachment
 * records.
 *
 * PRISMA REFERENTIAL ACTIONS:
 * - Stock, StockMovement, SupplierItem, BundleLine, PriceListLine and
 *   PurchaseLine all reference Item with Restrict, so they MUST be removed
 *   explicitly BEFORE the item row is deleted.
 * - InvoiceLine.itemId and Expense.itemId are optional (SetNull). We null them
 *   out instead of deleting the parent document, so invoice totals and expense
 *   records stay valid — the historical link to the item is simply severed.
 */

import type { Prisma } from "@prisma/client";
import { writeAuditLog } from "../shared/audit.service";

type TransactionClient = Prisma.TransactionClient;

export interface HardDeleteInfo {
  id: string;
  name: string;
  sku: string;
  stock: number;
  stockMovements: number;
  supplierItems: number;
  bundleLines: number;
  priceListLines: number;
  purchaseLines: number;
  invoiceLines: number;
  expenses: number;
  auditLogs: number;
  tags: number;
  notifications: number;
  attachments: number;
}

/**
 * Summarize every related record affected by hardDeleteItemTree. Runs inside
 * the caller's transaction client so counts are consistent.
 */
export async function getHardDeleteInfo(
  tx: TransactionClient,
  organizationId: string,
  itemId: string,
): Promise<HardDeleteInfo> {
  const item = await tx.item.findFirst({
    where: { id: itemId, organizationId },
    select: { id: true, name: true, sku: true },
  });

  if (!item) {
    throw new Error("Item not found");
  }

  const [
    stock,
    stockMovements,
    supplierItems,
    bundleLines,
    priceListLines,
    purchaseLines,
    invoiceLines,
    expenses,
    auditLogs,
    tags,
    notifications,
    attachments,
  ] = await Promise.all([
    tx.stock.count({ where: { itemId } }),
    tx.stockMovement.count({ where: { itemId } }),
    tx.supplierItem.count({ where: { itemId } }),
    tx.bundleLine.count({
      where: { OR: [{ bundleItemId: itemId }, { componentItemId: itemId }] },
    }),
    tx.priceListLine.count({ where: { itemId } }),
    tx.purchaseLine.count({ where: { itemId } }),
    tx.invoiceLine.count({ where: { itemId } }),
    tx.expense.count({ where: { itemId } }),
    tx.auditLog.count({ where: { entityType: "Item", entityId: itemId } }),
    tx.tagging.count({ where: { entityType: "Item", entityId: itemId } }),
    tx.notification.count({ where: { entityType: "Item", entityId: itemId } }),
    tx.attachment.count({ where: { entityType: "Item", entityId: itemId } }),
  ]);

  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    stock,
    stockMovements,
    supplierItems,
    bundleLines,
    priceListLines,
    purchaseLines,
    invoiceLines,
    expenses,
    auditLogs,
    tags,
    notifications,
    attachments,
  };
}

/**
 * Permanently delete an item and every related record, atomically.
 */
export async function hardDeleteItemTree(
  tx: TransactionClient,
  organizationId: string,
  itemId: string,
  userId: string,
  ipAddress?: string,
): Promise<void> {
  const item = await tx.item.findFirst({
    where: { id: itemId, organizationId },
    select: { id: true, name: true, sku: true },
  });

  if (!item) return;

  // ── 1. Stock ledger & levels (Restrict) ─────────────────────────────────
  await tx.stockMovement.deleteMany({ where: { itemId } });
  await tx.stock.deleteMany({ where: { itemId } });

  // ── 2. Master-data references (Restrict) ────────────────────────────────
  await tx.supplierItem.deleteMany({ where: { itemId } });
  await tx.bundleLine.deleteMany({
    where: { OR: [{ bundleItemId: itemId }, { componentItemId: itemId }] },
  });
  await tx.priceListLine.deleteMany({ where: { itemId } });
  await tx.purchaseLine.deleteMany({ where: { itemId } });

  // ── 3. Unlink optional document references (SetNull semantics) ──────────
  await tx.invoiceLine.updateMany({
    where: { itemId },
    data: { itemId: null },
  });
  await tx.expense.updateMany({
    where: { itemId },
    data: { itemId: null },
  });

  // ── 4. Polymorphic records ──────────────────────────────────────────────
  await tx.auditLog.deleteMany({
    where: { entityType: "Item", entityId: itemId },
  });
  await tx.tagging.deleteMany({
    where: { entityType: "Item", entityId: itemId },
  });
  await tx.notification.deleteMany({
    where: { entityType: "Item", entityId: itemId },
  });
  await tx.attachment.deleteMany({
    where: { entityType: "Item", entityId: itemId },
  });

  // ── 5. Audit trace before the item is gone ──────────────────────────────
  await writeAuditLog(
    {
      entityType: "Item",
      entityId: itemId,
      action: "DELETE",
      diff: {
        hardDelete: { before: item.sku, after: null },
      },
      organizationId,
      userId,
      ipAddress,
    },
    tx,
  );

  // ── 6. Remove the item itself ───────────────────────────────────────────
  await tx.item.delete({ where: { id: itemId } });
}
