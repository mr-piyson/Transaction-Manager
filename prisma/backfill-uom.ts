/**
 * Backfill for Multi-Unit-of-Measure (see docs/UOM-plan.md Phase 1).
 *
 * Part A — legacy `Item.unit` string → `Item.unitId`:
 *   for every Item with `unitId IS NULL`, match the string against a Unit in
 *   the same organization (case-insensitive code), creating the Unit row when
 *   missing. Idempotent: only touches rows where `unitId IS NULL`.
 *
 * Part B — document line snapshots:
 *   every PurchaseLine / InvoiceLine gets `uomFactor = 1`,
 *   `baseQuantity = quantity`, `baseUnitCost = unitCost`,
 *   `baseUnitPrice = unitPrice`, and `unitId = item.unitId` (manual lines keep
 *   `unitId = NULL`). Marker: the derived cost/price column is still NULL, so
 *   running this twice is a no-op.
 *
 * Run with: bun run prisma/backfill-uom.ts
 *
 * Safe to run multiple times (idempotent). Run AFTER `bun run backup` and
 * `bun run sync` (schema push) have completed.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Mirrors lib/db.ts — Prisma 7 requires a driver adapter.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const db = new PrismaClient({ adapter });

const BATCH = 500;

function normalizeCode(raw: string | null | undefined): string {
  return (raw ?? "").trim() || "pcs";
}

/** Part A: Item.unit (legacy string) → Item.unitId. Returns count updated. */
async function backfillItemUnitIds(): Promise<number> {
  let updated = 0;

  for (;;) {
    const items = await db.item.findMany({
      where: { unitId: null },
      select: { id: true, unit: true, organizationId: true },
      take: BATCH,
    });
    if (items.length === 0) break;

    const orgIds = [...new Set(items.map((i) => i.organizationId))];
    const units = await db.unit.findMany({
      where: { organizationId: { in: orgIds } },
      select: { id: true, code: true, isActive: true, organizationId: true },
    });

    // orgId(lowercased code) → unit, preferring active units
    const byOrgCode = new Map<string, { id: string; isActive: boolean }>();
    for (const unit of units) {
      const key = `${unit.organizationId}:${unit.code.toLowerCase()}`;
      const existing = byOrgCode.get(key);
      if (!existing || (!existing.isActive && unit.isActive)) {
        byOrgCode.set(key, { id: unit.id, isActive: unit.isActive });
      }
    }

    for (const item of items) {
      const code = normalizeCode(item.unit);
      const key = `${item.organizationId}:${code.toLowerCase()}`;
      let unit = byOrgCode.get(key);

      if (!unit) {
        // Create missing Unit for this organization. Unique violation is
        // possible under concurrency — re-fetch before giving up.
        try {
          const created = await db.unit.create({
            data: { name: code, code, organizationId: item.organizationId },
            select: { id: true, isActive: true },
          });
          unit = { id: created.id, isActive: created.isActive };
          byOrgCode.set(key, unit);
        } catch {
          const existing = await db.unit.findFirst({
            where: {
              organizationId: item.organizationId,
              code: { equals: code, mode: "insensitive" },
            },
            select: { id: true, isActive: true },
          });
          if (!existing) {
            console.warn(
              `⚠ Could not resolve unit "${code}" for Item ${item.id}`,
            );
            continue;
          }
          unit = { id: existing.id, isActive: existing.isActive };
          byOrgCode.set(key, unit);
        }
      }

      if (!unit.isActive) {
        console.warn(
          `⚠ Item ${item.id} matched soft-deleted unit "${code}" — using it as-is`,
        );
      }

      await db.item.update({
        where: { id: item.id },
        data: { unitId: unit.id },
      });
      updated++;
    }

    if (items.length < BATCH) break;
  }

  return updated;
}

/** Part B: PurchaseLine snapshots. Returns count updated. */
async function backfillPurchaseLines(): Promise<number> {
  const withItem = await db.$executeRaw`
    UPDATE "PurchaseLine" pl
    SET "unitId" = i."unitId",
        "uomFactor" = 1,
        "baseQuantity" = pl."quantity",
        "baseUnitCost" = pl."unitCost"
    FROM "Item" i
    WHERE pl."itemId" = i.id
      AND pl."baseUnitCost" IS NULL`;

  const manual = await db.$executeRaw`
    UPDATE "PurchaseLine"
    SET "uomFactor" = 1,
        "baseQuantity" = "quantity",
        "baseUnitCost" = "unitCost"
    WHERE "itemId" IS NULL
      AND "baseUnitCost" IS NULL`;

  return withItem + manual;
}

/** Part B: InvoiceLine snapshots. Returns count updated. */
async function backfillInvoiceLines(): Promise<number> {
  const withItem = await db.$executeRaw`
    UPDATE "InvoiceLine" il
    SET "unitId" = i."unitId",
        "uomFactor" = 1,
        "baseQuantity" = il."quantity",
        "baseUnitPrice" = il."unitPrice"
    FROM "Item" i
    WHERE il."itemId" = i.id
      AND il."baseUnitPrice" IS NULL`;

  const manual = await db.$executeRaw`
    UPDATE "InvoiceLine"
    SET "uomFactor" = 1,
        "baseQuantity" = "quantity",
        "baseUnitPrice" = "unitPrice"
    WHERE "itemId" IS NULL
      AND "baseUnitPrice" IS NULL`;

  return withItem + manual;
}

async function main() {
  console.log("Backfilling UoM data...\n");

  const items = await backfillItemUnitIds();
  console.log(`Item.unitId (legacy string):  ${items} item(s) resolved`);

  const purchaseLines = await backfillPurchaseLines();
  console.log(`PurchaseLine snapshots:       ${purchaseLines} line(s)`);

  const invoiceLines = await backfillInvoiceLines();
  console.log(`InvoiceLine snapshots:        ${invoiceLines} line(s)`);

  console.log("\nDone. Safe to re-run — already-backfilled rows are skipped.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
