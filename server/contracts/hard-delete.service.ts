/**
 *
 * Hard-delete support for contracts (SUPER_ADMIN only).
 *
 * The soft delete (`contracts.delete`) flags a non-ACTIVE contract as
 * deleted. Super admins additionally need a way to permanently remove a
 * contract AND every polymorphic record referencing it — audit logs, tags,
 * notifications and attachments.
 *
 * Contracts hold no child FKs (customerId is a reference to Customer, not a
 * child), so the tree is limited to polymorphic records. This service is also
 * reused by the Customer hard-delete cascade.
 */

import type { Prisma } from "@prisma/client";
import { writeAuditLog } from "../shared/audit.service";

type TransactionClient = Prisma.TransactionClient;

export interface HardDeleteInfo {
  id: string;
  serial: string;
  auditLogs: number;
  tags: number;
  notifications: number;
  attachments: number;
}

/**
 * Summarize every related record that will be removed by hardDeleteContractTree.
 * Runs inside the caller's transaction client so counts are consistent.
 */
export async function getHardDeleteInfo(
  tx: TransactionClient,
  organizationId: string,
  contractId: string,
): Promise<HardDeleteInfo> {
  const contract = await tx.contract.findFirst({
    where: { id: contractId, organizationId },
    select: { id: true, serial: true },
  });

  if (!contract) {
    throw new Error("Contract not found");
  }

  const [auditLogs, tags, notifications, attachments] = await Promise.all([
    tx.auditLog.count({
      where: { entityType: "Contract", entityId: contractId },
    }),
    tx.tagging.count({
      where: { entityType: "Contract", entityId: contractId },
    }),
    tx.notification.count({
      where: { entityType: "Contract", entityId: contractId },
    }),
    tx.attachment.count({
      where: { entityType: "Contract", entityId: contractId },
    }),
  ]);

  return {
    id: contract.id,
    serial: contract.serial,
    auditLogs,
    tags,
    notifications,
    attachments,
  };
}

/**
 * Permanently delete a contract and every related record, atomically.
 */
export async function hardDeleteContractTree(
  tx: TransactionClient,
  organizationId: string,
  contractId: string,
  userId: string,
  ipAddress?: string,
): Promise<void> {
  const contract = await tx.contract.findFirst({
    where: { id: contractId, organizationId },
    select: { id: true, serial: true },
  });

  if (!contract) return;

  // ── 1. Polymorphic records ──────────────────────────────────────────────
  await tx.auditLog.deleteMany({
    where: { entityType: "Contract", entityId: contractId },
  });
  await tx.tagging.deleteMany({
    where: { entityType: "Contract", entityId: contractId },
  });
  await tx.notification.deleteMany({
    where: { entityType: "Contract", entityId: contractId },
  });
  await tx.attachment.deleteMany({
    where: { entityType: "Contract", entityId: contractId },
  });

  // ── 2. Audit trace before the contract is gone ─────────────────────────
  await writeAuditLog(
    {
      entityType: "Contract",
      entityId: contractId,
      action: "DELETE",
      diff: {
        hardDelete: { before: contract.serial, after: null },
      },
      organizationId,
      userId,
      ipAddress,
    },
    tx,
  );

  // ── 3. Remove the contract itself ──────────────────────────────────────
  await tx.contract.delete({ where: { id: contractId } });
}
