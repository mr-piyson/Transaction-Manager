/**
 *
 * Hard-delete support for supplier master records (SUPER_ADMIN only).
 *
 * The soft delete (`suppliers.delete`) blocks while active purchase orders
 * exist. Super admins additionally need a way to permanently remove a supplier
 * AND every record that references it.
 *
 * CASCADE POLICY (per product decision): hard delete is destructive —
 * supplier catalogue rows (SupplierItem) are deleted and all the supplier's
 * purchase orders are recursively hard-deleted (including their stock
 * movements, journals, payments and approvals). Only the polymorphic
 * audit/tag/notification/attachment records are removed directly.
 */

import type { Prisma } from "@prisma/client";
import { hardDeletePurchaseOrderTree } from "../purchase-orders/hard-delete.service";
import { writeAuditLog } from "../shared/audit.service";

type TransactionClient = Prisma.TransactionClient;

export interface HardDeleteInfo {
	id: string;
	name: string;
	supplierItems: number;
	purchaseOrders: number;
	auditLogs: number;
	tags: number;
	notifications: number;
	attachments: number;
}

/**
 * Summarize every related record that will be removed by hardDeleteSupplierTree.
 * Runs inside the caller's transaction client so counts are consistent.
 */
export async function getHardDeleteInfo(
	tx: TransactionClient,
	organizationId: string,
	supplierId: string,
): Promise<HardDeleteInfo> {
	const supplier = await tx.supplier.findFirst({
		where: { id: supplierId, organizationId },
		select: { id: true, name: true },
	});

	if (!supplier) {
		throw new Error("Supplier not found");
	}

	const [
		supplierItems,
		purchaseOrders,
		auditLogs,
		tags,
		notifications,
		attachments,
	] = await Promise.all([
		tx.supplierItem.count({ where: { supplierId } }),
		tx.purchaseOrder.count({ where: { supplierId } }),
		tx.auditLog.count({
			where: { entityType: "Supplier", entityId: supplierId },
		}),
		tx.tagging.count({
			where: { entityType: "Supplier", entityId: supplierId },
		}),
		tx.notification.count({
			where: { entityType: "Supplier", entityId: supplierId },
		}),
		tx.attachment.count({
			where: { entityType: "Supplier", entityId: supplierId },
		}),
	]);

	return {
		id: supplier.id,
		name: supplier.name,
		supplierItems,
		purchaseOrders,
		auditLogs,
		tags,
		notifications,
		attachments,
	};
}

/**
 * Permanently delete a supplier and every related record, atomically.
 * Purchase orders are removed via their own hard-delete tree.
 */
export async function hardDeleteSupplierTree(
	tx: TransactionClient,
	organizationId: string,
	supplierId: string,
	userId: string,
	ipAddress?: string,
): Promise<void> {
	const supplier = await tx.supplier.findFirst({
		where: { id: supplierId, organizationId },
		select: { id: true, name: true },
	});

	if (!supplier) return;

	// ── 1. Supplier catalogue rows ──────────────────────────────────────────
	await tx.supplierItem.deleteMany({ where: { supplierId } });

	// ── 2. Recursively delete purchase orders ───────────────────────────────
	const purchaseOrders = await tx.purchaseOrder.findMany({
		where: { supplierId },
		select: { id: true },
	});
	for (const po of purchaseOrders) {
		await hardDeletePurchaseOrderTree(
			tx,
			organizationId,
			po.id,
			userId,
			ipAddress,
		);
	}

	// ── 3. Polymorphic records ──────────────────────────────────────────────
	await tx.auditLog.deleteMany({
		where: { entityType: "Supplier", entityId: supplierId },
	});
	await tx.tagging.deleteMany({
		where: { entityType: "Supplier", entityId: supplierId },
	});
	await tx.notification.deleteMany({
		where: { entityType: "Supplier", entityId: supplierId },
	});
	await tx.attachment.deleteMany({
		where: { entityType: "Supplier", entityId: supplierId },
	});

	// ── 4. Audit trace before the supplier is gone ──────────────────────────
	await writeAuditLog(
		{
			entityType: "Supplier",
			entityId: supplierId,
			action: "DELETE",
			diff: {
				hardDelete: { before: supplier.name, after: null },
			},
			organizationId,
			userId,
			ipAddress,
		},
		tx,
	);

	// ── 5. Remove the supplier itself ───────────────────────────────────────
	await tx.supplier.delete({ where: { id: supplierId } });
}
