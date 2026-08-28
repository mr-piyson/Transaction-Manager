/**
 *
 * Hard-delete support for subscriptions (SUPER_ADMIN only).
 *
 * The soft delete (`subscriptions.delete`) flags a subscription as
 * CANCELLED/deleted. Super admins additionally need a way to permanently
 * remove a subscription AND every related record — every renewal expense
 * (with its GL journal entry), plus the polymorphic audit/tag/notification/
 * attachment records on both the subscription and its renewal expenses.
 */

import type { Prisma } from "@prisma/client";
import { writeAuditLog } from "../shared/audit.service";

type TransactionClient = Prisma.TransactionClient;

export interface HardDeleteInfo {
  id: string;
  name: string;
  renewals: number;
  journalEntries: number;
  auditLogs: number;
  tags: number;
  notifications: number;
  attachments: number;
}

/**
 * Summarize every related record that will be removed by
 * hardDeleteSubscriptionTree. Runs inside the caller's transaction client so
 * counts are consistent.
 */
export async function getHardDeleteInfo(
  tx: TransactionClient,
  organizationId: string,
  subscriptionId: string,
): Promise<HardDeleteInfo> {
  const subscription = await tx.subscription.findFirst({
    where: { id: subscriptionId, organizationId },
    select: { id: true, name: true },
  });

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  const renewals = await tx.expense.findMany({
    where: { subscriptionId, organizationId },
    select: { id: true, journalEntryId: true },
  });
  const renewalIds = renewals.map((r) => r.id);

  const renewalPolymorphic =
    renewalIds.length > 0
      ? [{ entityType: "Expense", entityId: { in: renewalIds } }]
      : [];

  const [auditLogs, tags, notifications, attachments] = await Promise.all([
    tx.auditLog.count({
      where: {
        OR: [
          { entityType: "Subscription", entityId: subscriptionId },
          ...renewalPolymorphic,
        ],
      },
    }),
    tx.tagging.count({
      where: {
        OR: [
          { entityType: "Subscription", entityId: subscriptionId },
          ...renewalPolymorphic,
        ],
      },
    }),
    tx.notification.count({
      where: {
        OR: [
          { entityType: "Subscription", entityId: subscriptionId },
          ...renewalPolymorphic,
        ],
      },
    }),
    tx.attachment.count({
      where: {
        OR: [
          { entityType: "Subscription", entityId: subscriptionId },
          ...renewalPolymorphic,
        ],
      },
    }),
  ]);

  return {
    id: subscription.id,
    name: subscription.name,
    renewals: renewals.length,
    journalEntries: renewals.filter((r) => r.journalEntryId).length,
    auditLogs,
    tags,
    notifications,
    attachments,
  };
}

/**
 * Permanently delete a subscription and every related record, atomically.
 */
export async function hardDeleteSubscriptionTree(
  tx: TransactionClient,
  organizationId: string,
  subscriptionId: string,
  userId: string,
  ipAddress?: string,
): Promise<void> {
  const subscription = await tx.subscription.findFirst({
    where: { id: subscriptionId, organizationId },
    select: { id: true, name: true },
  });

  if (!subscription) return;

  // ── 1. Renewal expenses: journal entries + their polymorphic records ────
  const renewals = await tx.expense.findMany({
    where: { subscriptionId, organizationId },
    select: { id: true, journalEntryId: true },
  });
  const renewalIds = renewals.map((r) => r.id);
  const journalEntryIds = renewals
    .map((r) => r.journalEntryId)
    .filter((id): id is string => Boolean(id));

  // Journal lines cascade off the JournalEntry row.
  if (journalEntryIds.length > 0) {
    await tx.journalEntry.deleteMany({
      where: { id: { in: journalEntryIds } },
    });
  }

  if (renewalIds.length > 0) {
    await tx.auditLog.deleteMany({
      where: { entityType: "Expense", entityId: { in: renewalIds } },
    });
    await tx.tagging.deleteMany({
      where: { entityType: "Expense", entityId: { in: renewalIds } },
    });
    await tx.notification.deleteMany({
      where: { entityType: "Expense", entityId: { in: renewalIds } },
    });
    await tx.attachment.deleteMany({
      where: { entityType: "Expense", entityId: { in: renewalIds } },
    });
  }

  // ── 2. Polymorphic records on the subscription itself ───────────────────
  await tx.auditLog.deleteMany({
    where: { entityType: "Subscription", entityId: subscriptionId },
  });
  await tx.tagging.deleteMany({
    where: { entityType: "Subscription", entityId: subscriptionId },
  });
  await tx.notification.deleteMany({
    where: { entityType: "Subscription", entityId: subscriptionId },
  });
  await tx.attachment.deleteMany({
    where: { entityType: "Subscription", entityId: subscriptionId },
  });

  // ── 3. Audit trace before the subscription is gone ──────────────────────
  await writeAuditLog(
    {
      entityType: "Subscription",
      entityId: subscriptionId,
      action: "DELETE",
      diff: {
        hardDelete: { before: subscription.name, after: null },
      },
      organizationId,
      userId,
      ipAddress,
    },
    tx,
  );

  // ── 4. Remove the renewal expenses, then the subscription ───────────────
  if (renewalIds.length > 0) {
    await tx.expense.deleteMany({ where: { id: { in: renewalIds } } });
  }
  await tx.subscription.delete({ where: { id: subscriptionId } });
}
