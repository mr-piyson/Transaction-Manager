/**
 *
 * Hard-delete support for warehouse master records (SUPER_ADMIN only).
 *
 * The soft delete (`warehouses.delete`) blocks for the default warehouse and
 * when stock is on hand. Super admins additionally need a way to permanently
 * remove a warehouse AND every record that references it.
 *
 * CASCADE POLICY (per product decision): hard delete is destructive —
 * stock levels are deleted, stock movements that originated at or arrived at
 * this warehouse are removed, and all documents shipped from / received into
 * it are recursively hard-deleted (invoices + purchase orders, including
 * their payments, journals and stock movements). Only the polymorphic
 * audit/tag/notification/attachment records are removed directly.
 */

import type { Prisma } from '@prisma/client';
import { writeAuditLog } from '../shared/audit.service';
import { hardDeleteInvoiceTree } from '../invoices/hard-delete.service';
import { hardDeletePurchaseOrderTree } from '../purchase-orders/hard-delete.service';

type TransactionClient = Prisma.TransactionClient;

export interface HardDeleteInfo {
  id: string;
  name: string;
  stock: number;
  stockMovements: number;
  invoices: number;
  purchaseOrders: number;
  auditLogs: number;
  tags: number;
  notifications: number;
  attachments: number;
}

/**
 * Summarize every related record that will be removed by hardDeleteWarehouseTree.
 * Runs inside the caller's transaction client so counts are consistent.
 */
export async function getHardDeleteInfo(
  tx: TransactionClient,
  organizationId: string,
  warehouseId: string,
): Promise<HardDeleteInfo> {
  const warehouse = await tx.warehouse.findFirst({
    where: { id: warehouseId, organizationId },
    select: { id: true, name: true },
  });

  if (!warehouse) {
    throw new Error('Warehouse not found');
  }

  const [stock, stockMovements, invoices, purchaseOrders, auditLogs, tags, notifications, attachments] =
    await Promise.all([
      tx.stock.count({ where: { warehouseId } }),
      tx.stockMovement.count({
        where: { OR: [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }] },
      }),
      tx.invoice.count({ where: { warehouseId } }),
      tx.purchaseOrder.count({ where: { warehouseId } }),
      tx.auditLog.count({ where: { entityType: 'Warehouse', entityId: warehouseId } }),
      tx.tagging.count({ where: { entityType: 'Warehouse', entityId: warehouseId } }),
      tx.notification.count({ where: { entityType: 'Warehouse', entityId: warehouseId } }),
      tx.attachment.count({ where: { entityType: 'Warehouse', entityId: warehouseId } }),
    ]);

  return {
    id: warehouse.id,
    name: warehouse.name,
    stock,
    stockMovements,
    invoices,
    purchaseOrders,
    auditLogs,
    tags,
    notifications,
    attachments,
  };
}

/**
 * Permanently delete a warehouse and every related record, atomically.
 * Invoices and purchase orders are removed via their own hard-delete trees.
 */
export async function hardDeleteWarehouseTree(
  tx: TransactionClient,
  organizationId: string,
  warehouseId: string,
  userId: string,
  ipAddress?: string,
): Promise<void> {
  const warehouse = await tx.warehouse.findFirst({
    where: { id: warehouseId, organizationId },
    select: { id: true, name: true },
  });

  if (!warehouse) return;

  // ── 1. Stock levels ─────────────────────────────────────────────────────
  await tx.stock.deleteMany({ where: { warehouseId } });

  // ── 2. Stock movements that involved this warehouse ─────────────────────
  await tx.stockMovement.deleteMany({
    where: { OR: [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }] },
  });

  // ── 3. Recursively delete documents shipped from / received into it ────
  const invoices = await tx.invoice.findMany({
    where: { warehouseId },
    select: { id: true },
  });
  for (const invoice of invoices) {
    await hardDeleteInvoiceTree(tx, organizationId, invoice.id, userId, ipAddress);
  }

  const purchaseOrders = await tx.purchaseOrder.findMany({
    where: { warehouseId },
    select: { id: true },
  });
  for (const po of purchaseOrders) {
    await hardDeletePurchaseOrderTree(tx, organizationId, po.id, userId, ipAddress);
  }

  // ── 4. Polymorphic records ──────────────────────────────────────────────
  await tx.auditLog.deleteMany({
    where: { entityType: 'Warehouse', entityId: warehouseId },
  });
  await tx.tagging.deleteMany({
    where: { entityType: 'Warehouse', entityId: warehouseId },
  });
  await tx.notification.deleteMany({
    where: { entityType: 'Warehouse', entityId: warehouseId },
  });
  await tx.attachment.deleteMany({
    where: { entityType: 'Warehouse', entityId: warehouseId },
  });

  // ── 5. Audit trace before the warehouse is gone ─────────────────────────
  await writeAuditLog(
    {
      entityType: 'Warehouse',
      entityId: warehouseId,
      action: 'DELETE',
      diff: {
        hardDelete: { before: warehouse.name, after: null },
      },
      organizationId,
      userId,
      ipAddress,
    },
    tx,
  );

  // ── 6. Remove the warehouse itself ──────────────────────────────────────
  await tx.warehouse.delete({ where: { id: warehouseId } });
}
