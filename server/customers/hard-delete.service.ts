/**
 *
 * Hard-delete support for customer master records (SUPER_ADMIN only).
 *
 * The soft delete (`customers.delete`) blocks when active invoices or
 * contracts exist. Super admins additionally need a way to permanently remove
 * a customer AND every record that references it.
 *
 * CASCADE POLICY (per product decision): hard delete is destructive —
 * all the customer's invoices and contracts are recursively hard-deleted
 * (including their payments, journals, stock movements, approvals, ...),
 * income rows are removed, and the CRM subtree (contacts, opportunities,
 * leads, plus their activities/tasks/campaign members) is deleted. Only the
 * polymorphic audit/tag/notification/attachment records are removed directly.
 */

import type { Prisma } from "@prisma/client";
import { writeAuditLog } from "../shared/audit.service";
import { hardDeleteInvoiceTree } from "../invoices/hard-delete.service";
import { hardDeleteContractTree } from "../contracts/hard-delete.service";

type TransactionClient = Prisma.TransactionClient;

export interface HardDeleteInfo {
	id: string;
	name: string;
	invoices: number;
	contracts: number;
	incomes: number;
	crmContacts: number;
	crmOpportunities: number;
	crmLeads: number;
	auditLogs: number;
	tags: number;
	notifications: number;
	attachments: number;
}

/**
 * Summarize every related record that will be removed by hardDeleteCustomerTree.
 * Runs inside the caller's transaction client so counts are consistent.
 */
export async function getHardDeleteInfo(
	tx: TransactionClient,
	organizationId: string,
	customerId: string,
): Promise<HardDeleteInfo> {
	const customer = await tx.customer.findFirst({
		where: { id: customerId, organizationId },
		select: { id: true, name: true },
	});

	if (!customer) {
		throw new Error("Customer not found");
	}

	const [
		invoices,
		contracts,
		incomes,
		crmContacts,
		crmOpportunities,
		crmLeads,
		auditLogs,
		tags,
		notifications,
		attachments,
	] = await Promise.all([
		tx.invoice.count({ where: { customerId } }),
		tx.contract.count({ where: { customerId } }),
		tx.income.count({ where: { customerId } }),
		tx.contact.count({ where: { customerId } }),
		tx.opportunity.count({ where: { customerId } }),
		tx.lead.count({ where: { convertedToCustomerId: customerId } }),
		tx.auditLog.count({
			where: { entityType: "Customer", entityId: customerId },
		}),
		tx.tagging.count({
			where: { entityType: "Customer", entityId: customerId },
		}),
		tx.notification.count({
			where: { entityType: "Customer", entityId: customerId },
		}),
		tx.attachment.count({
			where: { entityType: "Customer", entityId: customerId },
		}),
	]);

	return {
		id: customer.id,
		name: customer.name,
		invoices,
		contracts,
		incomes,
		crmContacts,
		crmOpportunities,
		crmLeads,
		auditLogs,
		tags,
		notifications,
		attachments,
	};
}

/**
 * Permanently delete a customer and every related record, atomically.
 * Invoices and contracts are removed via their own hard-delete trees.
 */
export async function hardDeleteCustomerTree(
	tx: TransactionClient,
	organizationId: string,
	customerId: string,
	userId: string,
	ipAddress?: string,
): Promise<void> {
	const customer = await tx.customer.findFirst({
		where: { id: customerId, organizationId },
		select: { id: true, name: true },
	});

	if (!customer) return;

	// ── 1. Recursively delete child documents (invoices, contracts) ────────
	const invoices = await tx.invoice.findMany({
		where: { customerId },
		select: { id: true },
	});
	for (const invoice of invoices) {
		await hardDeleteInvoiceTree(
			tx,
			organizationId,
			invoice.id,
			userId,
			ipAddress,
		);
	}

	const contracts = await tx.contract.findMany({
		where: { customerId },
		select: { id: true },
	});
	for (const contract of contracts) {
		await hardDeleteContractTree(
			tx,
			organizationId,
			contract.id,
			userId,
			ipAddress,
		);
	}

	// ── 2. Recognized income rows ───────────────────────────────────────────
	await tx.income.deleteMany({ where: { customerId } });

	// ── 3. CRM subtree ──────────────────────────────────────────────────────
	const leadIds = await tx.lead.findMany({
		where: { convertedToCustomerId: customerId },
		select: { id: true },
	});
	const contactIds = await tx.contact.findMany({
		where: { customerId },
		select: { id: true },
	});
	const leadIdList = leadIds.map((l) => l.id);
	const contactIdList = contactIds.map((c) => c.id);

	await tx.activity.deleteMany({
		where: {
			OR: [
				...(contactIdList.length > 0
					? [{ contactId: { in: contactIdList } }]
					: []),
				...(leadIdList.length > 0 ? [{ leadId: { in: leadIdList } }] : []),
				{ opportunity: { customerId } },
			],
		},
	});
	await tx.task.deleteMany({
		where: {
			OR: [
				...(contactIdList.length > 0
					? [{ contactId: { in: contactIdList } }]
					: []),
				...(leadIdList.length > 0 ? [{ leadId: { in: leadIdList } }] : []),
				{ opportunity: { customerId } },
			],
		},
	});
	await tx.campaignMember.deleteMany({
		where: {
			OR: [
				...(contactIdList.length > 0
					? [{ contactId: { in: contactIdList } }]
					: []),
				...(leadIdList.length > 0 ? [{ leadId: { in: leadIdList } }] : []),
			],
		},
	});

	await tx.opportunity.deleteMany({
		where: {
			OR: [
				{ customerId },
				...(leadIdList.length > 0 ? [{ leadId: { in: leadIdList } }] : []),
			],
		},
	});
	await tx.contact.deleteMany({ where: { customerId } });
	await tx.lead.deleteMany({ where: { convertedToCustomerId: customerId } });

	// ── 4. Polymorphic records ──────────────────────────────────────────────
	await tx.auditLog.deleteMany({
		where: { entityType: "Customer", entityId: customerId },
	});
	await tx.tagging.deleteMany({
		where: { entityType: "Customer", entityId: customerId },
	});
	await tx.notification.deleteMany({
		where: { entityType: "Customer", entityId: customerId },
	});
	await tx.attachment.deleteMany({
		where: { entityType: "Customer", entityId: customerId },
	});

	// ── 5. Audit trace before the customer is gone ──────────────────────────
	await writeAuditLog(
		{
			entityType: "Customer",
			entityId: customerId,
			action: "DELETE",
			diff: {
				hardDelete: { before: customer.name, after: null },
			},
			organizationId,
			userId,
			ipAddress,
		},
		tx,
	);

	// ── 6. Remove the customer itself ───────────────────────────────────────
	await tx.customer.delete({ where: { id: customerId } });
}
