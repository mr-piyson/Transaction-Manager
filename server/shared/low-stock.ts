import type { PrismaClient } from "@prisma/client";

/**
 * Canonical low-stock rules.
 *
 * An item is low on stock when it is an active, non-service catalogue item
 * with a configured reorder point, and its total quantity across every
 * warehouse is at or below that reorder point.
 *
 * Every screen that reports low stock must use this module so the dashboard,
 * reports, and the low-stock cron job cannot drift apart.
 */
export interface LowStockItem {
  id: string;
  name: string;
  sku: string;
  reorderPoint: number;
  organizationId: string;
  totalStock: number;
}

type LowStockDb = Pick<PrismaClient, "item" | "stock">;

export function isLowStock(input: {
  totalStock: number;
  reorderPoint: number;
  isActive?: boolean;
  deletedAt?: Date | null;
  type?: string;
}): boolean {
  if (input.isActive === false) return false;
  if (input.deletedAt) return false;
  if (input.type === "SERVICE") return false;
  if (input.reorderPoint <= 0) return false;

  return input.totalStock <= input.reorderPoint;
}

/**
 * Returns every low-stock item, optionally scoped to one organization.
 * Omit `organizationId` for cross-organization jobs (the cron worker).
 */
export async function findLowStockItems(
  db: LowStockDb,
  organizationId?: string,
): Promise<LowStockItem[]> {
  const items = await db.item.findMany({
    where: {
      ...(organizationId ? { organizationId } : {}),
      reorderPoint: { gt: 0 },
      deletedAt: null,
      isActive: true,
      type: { not: "SERVICE" },
    },
    select: {
      id: true,
      name: true,
      sku: true,
      reorderPoint: true,
      organizationId: true,
    },
  });

  if (items.length === 0) return [];

  const stockAggs = await db.stock.groupBy({
    by: ["itemId"],
    where: {
      itemId: { in: items.map((item) => item.id) },
      ...(organizationId ? { organizationId } : {}),
    },
    _sum: { quantity: true },
  });

  const stockByItem = new Map<string, number>();
  for (const row of stockAggs) {
    stockByItem.set(row.itemId, Number(row._sum.quantity ?? 0));
  }

  return items
    .map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      reorderPoint: item.reorderPoint,
      organizationId: item.organizationId,
      totalStock: stockByItem.get(item.id) ?? 0,
    }))
    .filter((item) => isLowStock(item));
}

export async function countLowStockItems(
  db: LowStockDb,
  organizationId: string,
): Promise<number> {
  return (await findLowStockItems(db, organizationId)).length;
}
