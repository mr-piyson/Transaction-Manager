/**
 * src/server/lib/audit/index.ts
 *
 * Thin wrapper around AuditLog Prisma model.
 *
 * WHY NOT LOG INSIDE TRPC MIDDLEWARE?
 * Middleware fires for every request — including reads. Audit logs are only
 * meaningful for mutations with business context (what changed, previous value).
 * Callers pass a `diff` so the log is rich without generic middleware magic.
 *
 * PERFORMANCE: audit writes are fire-and-forget inside the same transaction
 * when possible. For operations where transaction context isn't available,
 * use the standalone `writeAuditLog` helper which issues a separate insert.
 * The slight delay is acceptable — audit logs are not on the critical path.
 */

import db from '@/lib/db';

export interface AuditPayload {
  entityType: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'PAYMENT';
  diff?: Record<string, { before: unknown; after: unknown }>;
  organizationId: string;
  userId?: string;
  ipAddress?: string;
}

/**
 * Write an audit log entry. Safe to call from within a Prisma $transaction
 * by passing `tx` — ensures the audit write is atomic with the mutation.
 */
export async function writeAuditLog(
  payload: AuditPayload,
  tx?: Parameters<Parameters<typeof db.$transaction>[0]>[0],
): Promise<void> {
  const client = tx ?? db;
  // Using $executeRaw instead of client.auditLog.create to avoid circular
  // type issues when `tx` is the transaction client type.
  await (client as typeof db).auditLog.create({
    data: {
      entityType: payload.entityType,
      entityId: payload.entityId,
      action: payload.action,
      diff: payload.diff
        ? (payload.diff as unknown as import('@prisma/client').Prisma.JsonObject)
        : undefined,
      organizationId: payload.organizationId,
      userId: payload.userId,
      ipAddress: payload.ipAddress,
    },
  });
}
