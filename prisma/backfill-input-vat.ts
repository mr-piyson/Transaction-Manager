/**
 * Input VAT backfill (recoverable purchase VAT).
 *
 * Part A — provision the "1250 Input VAT (Recoverable)" asset account for every
 *   organization whose chart of accounts predates it. Idempotent: existing orgs
 *   are skipped. New orgs get it from the seed in setup.router.ts.
 *
 * Part B — correct historical PO-receipt records that were posted net-of-VAT:
 *   - set `Expense.taxAmount` and gross `Expense.amount` (net + VAT), and
 *   - post a supplementary journal entry (Dr Input VAT / Cr Accounts Payable)
 *     for the unrecorded VAT so AP reconciles with the amount owed.
 *   Only rows whose `Expense.taxAmount = 0` are touched, and the adjustment
 *   entry is skipped if it already exists, so the script is safe to re-run.
 *
 * Run with: bun run prisma/backfill-input-vat.ts
 *
 * Run after `bun run sync` (prisma db push) so the `taxAmount` column exists.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://muntadher:1289753@localhost:5432/transaction_manager",
});
const db = new PrismaClient({ adapter });

const INPUT_VAT_ACCOUNT = {
  code: "1250",
  name: "Input VAT (Recoverable)",
  type: "ASSET" as const,
  normalBalance: "DEBIT" as const,
  isSystemAccount: true,
};

async function provisionInputVatAccounts(): Promise<number> {
  const orgs = await db.organization.findMany({ select: { id: true } });
  let created = 0;

  for (const org of orgs) {
    const existing = await db.ledgerAccount.findFirst({
      where: { code: INPUT_VAT_ACCOUNT.code, organizationId: org.id },
      select: { id: true },
    });
    if (existing) continue;

    await db.ledgerAccount.create({
      data: { ...INPUT_VAT_ACCOUNT, organizationId: org.id },
    });
    created++;
  }

  return created;
}

async function nextJournalSerial(
  organizationId: string,
  prefix: string,
): Promise<string> {
  await db.$executeRaw`
    INSERT INTO "DocumentSequence" (id, prefix, "nextVal", "organizationId", "fiscalYear")
    VALUES (gen_random_uuid(), ${prefix}, 1, ${organizationId}, 0)
    ON CONFLICT ("organizationId", prefix, "fiscalYear") DO NOTHING`;

  const result = await db.$queryRaw<{ nextVal: number }[]>`
    UPDATE "DocumentSequence"
    SET "nextVal" = "nextVal" + 1
    WHERE "organizationId" = ${organizationId}
      AND prefix = ${prefix}
      AND "fiscalYear" IS NOT DISTINCT FROM 0
    RETURNING "nextVal"`;

  const nextVal = result[0]?.nextVal;
  if (nextVal === undefined) {
    throw new Error(`Failed to generate serial for prefix ${prefix}`);
  }
  return `${prefix}-${String(nextVal).padStart(5, "0")}`;
}

function taxOfReceived(po: {
  lines: Array<{
    quantity: unknown;
    receivedQty: unknown;
    taxAmt: unknown;
  }>;
}): number {
  let tax = 0;
  for (const line of po.lines) {
    const qty = Number(line.quantity);
    const received = Number(line.receivedQty);
    const lineTax = Number(line.taxAmt);
    if (qty <= 0 || received <= 0) continue;
    tax += lineTax * Math.min(received / qty, 1);
  }
  return tax;
}

/**
 * Links auto-generated receipt expenses to their PO (and single item) when the
 * original workflow left the links empty. Idempotent.
 */
async function linkHistoricalReceipts(): Promise<number> {
  const expenses = await db.expense.findMany({
    where: {
      itemId: null,
      deletedAt: null,
      description: { contains: "Items received" },
      reference: { not: null },
    },
    select: {
      id: true,
      organizationId: true,
      reference: true,
      purchaseOrderId: true,
    },
  });

  let linked = 0;

  for (const expense of expenses) {
    const po = await db.purchaseOrder.findFirst({
      where: expense.purchaseOrderId
        ? { id: expense.purchaseOrderId }
        : {
            serial: expense.reference!,
            organizationId: expense.organizationId,
          },
      select: {
        id: true,
        lines: {
          select: { itemId: true, quantity: true, receivedQty: true },
        },
      },
    });
    if (!po) continue;

    const receivedItems = new Set<string>();
    let hasManualLine = false;
    for (const line of po.lines) {
      if (Number(line.receivedQty) <= 0) continue;
      if (line.itemId) receivedItems.add(line.itemId);
      else hasManualLine = true;
    }
    const soleItemId =
      !hasManualLine && receivedItems.size === 1 ? [...receivedItems][0] : null;

    await db.expense.update({
      where: { id: expense.id },
      data: { purchaseOrderId: po.id, itemId: soleItemId },
    });
    linked++;
  }

  return linked;
}

async function correctHistoricalReceipts(): Promise<number> {
  const expenses = await db.expense.findMany({
    where: {
      taxAmount: 0,
      deletedAt: null,
      description: { contains: "Items received" },
      reference: { not: null },
    },
    select: {
      id: true,
      amount: true,
      organizationId: true,
      createdById: true,
      purchaseOrderId: true,
      itemId: true,
      reference: true,
    },
  });

  let corrected = 0;

  for (const expense of expenses) {
    const po = await db.purchaseOrder.findFirst({
      where: expense.purchaseOrderId
        ? { id: expense.purchaseOrderId }
        : {
            serial: expense.reference!,
            organizationId: expense.organizationId,
          },
      select: {
        id: true,
        serial: true,
        currency: true,
        exchangeRate: true,
        lines: {
          select: {
            itemId: true,
            quantity: true,
            receivedQty: true,
            taxAmt: true,
          },
        },
      },
    });
    if (!po) continue;

    const tax = taxOfReceived(po);
    if (tax <= 1e-9) continue;

    const receivedItems = new Set<string>();
    let hasManualLine = false;
    for (const line of po.lines) {
      if (Number(line.receivedQty) <= 0) continue;
      if (line.itemId) receivedItems.add(line.itemId);
      else hasManualLine = true;
    }
    const soleItemId =
      !hasManualLine && receivedItems.size === 1 ? [...receivedItems][0] : null;

    const inputVat = await db.ledgerAccount.findFirst({
      where: {
        code: INPUT_VAT_ACCOUNT.code,
        organizationId: expense.organizationId,
      },
      select: { id: true },
    });
    const ap = await db.ledgerAccount.findFirst({
      where: { code: "2010", organizationId: expense.organizationId },
      select: { id: true },
    });
    if (!inputVat || !ap) {
      console.warn(
        `⚠ Skipping ${po.serial}: input VAT or AP account missing for org ${expense.organizationId}`,
      );
      continue;
    }

    const marker = `PO #${po.serial} — input VAT adjustment`;
    const alreadyAdjusted = await db.journalEntry.findFirst({
      where: { organizationId: expense.organizationId, description: marker },
      select: { id: true },
    });

    await db.$transaction(async (tx) => {
      if (!alreadyAdjusted) {
        const entryNumber = await nextJournalSerial(
          expense.organizationId,
          "JE",
        );
        await tx.journalEntry.create({
          data: {
            entryNumber,
            description: marker,
            reference: po.serial,
            date: new Date(),
            currency: po.currency ?? "BHD",
            exchangeRate: Number(po.exchangeRate ?? 1),
            status: "POSTED",
            purchaseOrderId: po.id,
            organizationId: expense.organizationId,
            createdById: expense.createdById,
            lines: {
              create: [
                {
                  accountId: inputVat.id,
                  debit: tax,
                  credit: 0,
                  description: marker,
                  organizationId: expense.organizationId,
                },
                {
                  accountId: ap.id,
                  debit: 0,
                  credit: tax,
                  description: marker,
                  organizationId: expense.organizationId,
                },
              ],
            },
          },
        });
      }

      await tx.expense.update({
        where: { id: expense.id },
        data: {
          taxAmount: tax,
          amount: Number(expense.amount) + tax,
          purchaseOrderId: expense.purchaseOrderId ?? po.id,
          itemId: expense.itemId ?? soleItemId,
        },
      });
    });

    corrected++;
  }

  return corrected;
}

async function main() {
  console.log("Backfilling recoverable Input VAT...\n");

  const accounts = await provisionInputVatAccounts();
  console.log(`Input VAT account provisioned:  ${accounts} org(s)`);

  const linked = await linkHistoricalReceipts();
  console.log(`Historical receipts linked:     ${linked} expense(s)`);

  const receipts = await correctHistoricalReceipts();
  console.log(`Historical receipts corrected:  ${receipts} expense(s)`);

  console.log("\nDone. Safe to re-run — already-processed rows are skipped.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
