/**
 * Collapse multi-unit items to a single "big" (alternative) unit.
 *
 * Keeps the first active ItemUom per item (preferring one flagged as a
 * purchase default when present) and soft-deletes the rest. Idempotent.
 *
 * Run with: bun run prisma/collapse-uom-to-big-small.ts
 * Run AFTER `bun run backup` and `bun run sync`.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const db = new PrismaClient({ adapter });

const BATCH = 200;

async function main() {
  let processed = 0;
  let collapsed = 0;

  for (;;) {
    const items = await db.item.findMany({
      where: { deletedAt: null },
      select: { id: true },
      take: BATCH,
      skip: processed,
    });
    if (items.length === 0) break;

    for (const item of items) {
      const alts = await db.itemUom.findMany({
        where: { itemId: item.id, deletedAt: null, isActive: true },
        orderBy: { createdAt: "asc" },
        select: { id: true, isPurchaseDefault: true, createdAt: true },
      });
      if (alts.length <= 1) continue;

      // Prefer a purchase-default unit as the keeper when available.
      const keeper = alts.find((a) => a.isPurchaseDefault) ?? alts[0];

      const toCollapse = alts.filter((a) => a.id !== keeper.id);
      await db.itemUom.updateMany({
        where: { id: { in: toCollapse.map((a) => a.id) } },
        data: {
          deletedAt: new Date(),
          isActive: false,
          isPurchaseDefault: false,
          isSalesDefault: false,
        },
      });
      collapsed += toCollapse.length;
    }

    processed += items.length;
  }

  console.log(
    `Processed ${processed} items; collapsed ${collapsed} extra alternative units.`,
  );
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
