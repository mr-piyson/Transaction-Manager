/**
 *
 * Hard-delete support for purchase order documents (SUPER_ADMIN only).
 *
 * The soft delete (`purchaseOrders.delete`) only flags a DRAFT as deleted.
 * Super admins additionally need a way to permanently remove a PO AND every
 * record that references it — lines, payments, stock movements recorded
 * against its lines, journal postings, expenses raised against it, approval
 * requests, audit logs, tags, notifications and attachments.
 *
 * This service is also reused by the Supplier and Warehouse hard-delete
 * cascades, so it must be fully self-contained (no dependency on the caller).
 *
 * PRISMA REFERENTIAL ACTIONS:
 * - PurchaseLine & PurchasePayment cascade off PurchaseOrder (safe).
 * - StockMovement.purchaseLineId, JournalEntry.purchaseOrderId/paymentId,
 *   Expense.purchaseOrderId and the polymorphic records use Restrict/plain
 *   FKs, so they MUST be removed explicitly BEFORE the PO row is deleted.
 */

import type { Prisma } from "@prisma/client";
import { writeAuditLog } from "../shared/audit.service";

type TransactionClient = Prisma.TransactionClient;

export interface HardDeleteInfo {
	id: string;
	serial: string;
	lines: number;
	payments: number;
	stockMovements: number;
	journalEntries: number;
	expenses: number;
	approvalRequests: number;
	auditLogs: number;
	tags: number;
	notifications: number;
	attachments: number;
}

/**
 * Summarize every related record that will be removed by hardDeletePurchaseOrderTree.
 * Runs inside the caller's transaction client so counts are consistent.
 */
export async function getHardDeleteInfo(
	tx: TransactionClient,
	organizationId: string,
	purchaseOrderId: string,
): Promise<HardDeleteInfo> {
	const po = await tx.purchaseOrder.findFirst({
		where: { id: purchaseOrderId, organizationId },
		select: { id: true, serial: true },
	});

	if (!po) {
		throw new Error("Purchase order not found");
	}

	const payments = await tx.purchasePayment.findMany({
		where: { purchaseOrderId },
		select: { id: true },
	});
	const paymentIds = payments.map((p) => p.id);

	// Expenses raised against this PO (auto-populated by the procurement flow)
	const expenses = await tx.expense.findMany({
		where: { purchaseOrderId },
		select: { journalEntryId: true },
	});
	const expenseJournalEntryIds = expenses
		.map((e) => e.journalEntryId)
		.filter((id): id is string => Boolean(id));

	const [
		lines,
		stockMovements,
		journalEntries,
		approvalRequests,
		auditLogs,
		tags,
		notifications,
		attachments,
	] = await Promise.all([
		tx.purchaseLine.count({ where: { purchaseOrderId } }),
		tx.stockMovement.count({ where: { purchaseLine: { purchaseOrderId } } }),
		tx.journalEntry.count({
			where: {
				OR: [
					{ purchaseOrderId },
					...(paymentIds.length > 0 ? [{ paymentId: { in: paymentIds } }] : []),
					...(expenseJournalEntryIds.length > 0
						? [{ expenseId: { in: expenseJournalEntryIds } }]
						: []),
				],
			},
		}),
		tx.approvalRequest.count({
			where: { entityType: "PurchaseOrder", entityId: purchaseOrderId },
		}),
		tx.auditLog.count({
			where: { entityType: "PurchaseOrder", entityId: purchaseOrderId },
		}),
		tx.tagging.count({
			where: { entityType: "PurchaseOrder", entityId: purchaseOrderId },
		}),
		tx.notification.count({
			where: { entityType: "PurchaseOrder", entityId: purchaseOrderId },
		}),
		tx.attachment.count({
			where: { entityType: "PurchaseOrder", entityId: purchaseOrderId },
		}),
	]);

	return {
		id: po.id,
		serial: po.serial,
		lines,
		payments: payments.length,
		stockMovements,
		journalEntries,
		expenses: expenses.length,
		approvalRequests,
		auditLogs,
		tags,
		notifications,
		attachments,
	};
}

/**
 * Permanently delete a purchase order and every related record, atomically.
 */
export async function hardDeletePurchaseOrderTree(
	tx: TransactionClient,
	organizationId: string,
	purchaseOrderId: string,
	userId: string,
	ipAddress?: string,
): Promise<void> {
	const po = await tx.purchaseOrder.findFirst({
		where: { id: purchaseOrderId, organizationId },
		select: { id: true, serial: true },
	});

	if (!po) return;

	// ── 1. Expenses raised against this PO (journal lines cascade) ─────────
	const expenses = await tx.expense.findMany({
		where: { purchaseOrderId },
		select: { journalEntryId: true },
	});
	const expenseJournalEntryIds = expenses
		.map((e) => e.journalEntryId)
		.filter((id): id is string => Boolean(id));
	if (expenseJournalEntryIds.length > 0) {
		await tx.journalEntry.deleteMany({
			where: { expenseId: { in: expenseJournalEntryIds } },
		});
	}
	await tx.expense.deleteMany({ where: { purchaseOrderId } });

	// ── 2. Stock movements recorded against this PO's lines ────────────────
	await tx.stockMovement.deleteMany({
		where: { purchaseLine: { purchaseOrderId } },
	});

	// ── 3. Journal postings (by PO, then by its payments) ──────────────────
	const paymentIds = await tx.purchasePayment.findMany({
		where: { purchaseOrderId },
		select: { id: true },
	});
	if (paymentIds.length > 0) {
		await tx.journalEntry.deleteMany({
			where: { paymentId: { in: paymentIds.map((p) => p.id) } },
		});
	}
	await tx.journalEntry.deleteMany({ where: { purchaseOrderId } });

	// ── 4. Polymorphic records ──────────────────────────────────────────────
	await tx.approvalRequest.deleteMany({
		where: { entityType: "PurchaseOrder", entityId: purchaseOrderId },
	});
	await tx.auditLog.deleteMany({
		where: { entityType: "PurchaseOrder", entityId: purchaseOrderId },
	});
	await tx.tagging.deleteMany({
		where: { entityType: "PurchaseOrder", entityId: purchaseOrderId },
	});
	await tx.notification.deleteMany({
		where: { entityType: "PurchaseOrder", entityId: purchaseOrderId },
	});
	await tx.attachment.deleteMany({
		where: { entityType: "PurchaseOrder", entityId: purchaseOrderId },
	});

	// ── 5. Audit trace before the document is gone ─────────────────────────
	await writeAuditLog(
		{
			entityType: "PurchaseOrder",
			entityId: purchaseOrderId,
			action: "DELETE",
			diff: {
				hardDelete: { before: po.serial, after: null },
			},
			organizationId,
			userId,
			ipAddress,
		},
		tx,
	);

	// ── 6. Remove the PO itself (lines + payments cascade) ─────────────────
	await tx.purchaseOrder.delete({ where: { id: purchaseOrderId } });
}
