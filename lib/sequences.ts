/**
 * src/server/lib/sequences/index.ts
 *
 * Race-safe document serial number generator.
 *
 * THE PROBLEM:
 * Generating "INV-00042" requires reading the current counter, incrementing it,
 * and using the new value — a classic read-modify-write race condition.
 * Under concurrent invoice creation (e.g. two sales reps hitting "Save" at
 * the same millisecond) both reads could return 41, producing two "INV-00042"
 * documents, violating the UNIQUE constraint or — worse — silently duplicating
 * if the constraint isn't there.
 *
 * THE SOLUTION:
 * Use `SELECT ... FOR UPDATE` (PostgreSQL row-level lock) inside a transaction.
 * Only one transaction can hold the lock at a time; the other waits.
 * This serialises serial generation without a global mutex.
 *
 * WHY NOT USE A DB SEQUENCE (nextval)?
 * PostgreSQL native sequences are faster but don't allow per-org, per-prefix,
 * per-fiscal-year counters without creating one sequence object per combination
 * in the schema — unmanageable at scale. The DocumentSequence table approach
 * keeps all counter state visible and queryable.
 *
 * FISCAL YEAR NUMBERING:
 * Pass `fiscalYear` to restart the counter per year (common in Bahrain/GCC).
 * Omit it for continuous numbering across years.
 */

import type { Prisma } from '@prisma/client';

export type DocumentPrefix = 'INV' | 'QTE' | 'CN' | 'PFI' | 'DN' | 'PO' | 'JE' | 'EXP' | 'CTR';

type TransactionClient = Prisma.TransactionClient;

interface GenerateSerialOptions {
  db: TransactionClient;
  organizationId: string;
  prefix: DocumentPrefix;
  /** Pad the numeric part to this many digits. Default: 5 */
  padLength?: number;
  /** Optional fiscal year for per-year counters (e.g. 2025). */
  fiscalYear?: number;
}

/**
 * generateSerial
 *
 * Returns a human-readable serial like "INV-00042" or "INV-2025-00001".
 * Must be called inside a $transaction that also creates the document,
 * so the serial is atomically associated with the new row.
 *
 * Example:
 *   const serial = await generateSerial({
 *     db: tx,        ← pass the transaction client, NOT db singleton
 *     organizationId,
 *     prefix: "INV",
 *   });
 */
export async function generateSerial(opts: GenerateSerialOptions): Promise<string> {
  const { db, organizationId, prefix, padLength = 5, fiscalYear } = opts;

  const fiscalYearParam: number = fiscalYear ?? 0;

  // Upsert the sequence row so first-time use auto-creates it.
  // Then lock it for the duration of this transaction.
  await db.$executeRaw`
    INSERT INTO "DocumentSequence" (id, prefix, "nextVal", "organizationId", "fiscalYear")
    VALUES (
      gen_random_uuid(),
      ${prefix},
      1,
      ${organizationId},
      ${fiscalYearParam}
    )
    ON CONFLICT ("organizationId", prefix, "fiscalYear")
    DO NOTHING
  `;

  // Lock the row and atomically increment nextVal
  const result = await db.$queryRaw<{ nextVal: number }[]>`
    UPDATE "DocumentSequence"
    SET "nextVal" = "nextVal" + 1
    WHERE "organizationId" = ${organizationId}
      AND prefix = ${prefix}
      AND "fiscalYear" IS NOT DISTINCT FROM ${fiscalYearParam}
    RETURNING "nextVal"
  `;

  const nextVal = result[0]?.nextVal;
  if (nextVal === undefined) {
    throw new Error(`Failed to generate serial for prefix ${prefix}`);
  }

  const paddedNum = String(nextVal).padStart(padLength, '0');
  return fiscalYear ? `${prefix}-${fiscalYear}-${paddedNum}` : `${prefix}-${paddedNum}`;
}
