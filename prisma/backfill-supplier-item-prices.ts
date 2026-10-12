/**
 * Backfill for per-UOM supplier prices (SupplierItemPrice).
 *
 * Seeds one price row per SupplierItem from its existing `basePrice`, which is
 * the item's Base-Unit price. This lets legacy suppliers keep working under the
 * new schema and gives the PO flow a per-UOM price to look up.
 *
 * Idempotent: only SupplierItems that do NOT yet have any price rows are
 * touched. Run with: bun run prisma/backfill-supplier-item-prices.ts
 *
 * Safe to run multiple times. Run AFTER `bun run backup` and `bun run sync`
 * (schema push) have completed.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Mirrors lib/db.ts — Prisma 7 requires a driver adapter.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const db = new PrismaClient({ adapter });

const BATCH = 500;

async function main() {
  console.log("Backfilling SupplierItemPrice rows...\n");

  let created = 0;
  let skippedNoBaseUnit = 0;
  let skippedError = 0;

  for (;;) {
    const supplierItems = await db.supplierItem.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        // Only rows that have no per-UOM prices yet.
        prices: { none: {} },
      },
      select: {
        id: true,
        itemId: true,
        basePrice: true,
        organizationId: true,
      },
      take: BATCH,
    });
    if (supplierItems.length === 0) break;

    const itemIds = [...new Set(supplierItems.map((si) => si.itemId))];
    const items = await db.item.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, unitId: true },
    });
    const itemUnit = new Map(items.map((i) => [i.id, i.unitId]));

    for (const si of supplierItems) {
      const unitId = itemUnit.get(si.itemId);
      if (!unitId || Number(si.basePrice) <= 0) {
        skippedNoBaseUnit++;
        continue;
      }
      try {
        await db.supplierItemPrice.create({
          data: {
            supplierItemId: si.id,
            unitId,
            price: String(si.basePrice),
            organizationId: si.organizationId,
          },
        });
        created++;
      } catch (error) {
        skippedError++;
        console.warn(`⚠ Could not backfill SupplierItem ${si.id}: ${error}`);
      }
    }

    if (supplierItems.length < BATCH) break;
  }

  console.log(`Price rows created:                ${created}`);
  console.log(`Skipped (no base unit/zero price): ${skippedNoBaseUnit}`);
  console.log(`Skipped (error / already priced):  ${skippedError}`);
  console.log("\nDone. Safe to re-run — already-backfilled rows are skipped.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
