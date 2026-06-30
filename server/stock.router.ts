import { z } from 'zod';
import { NotFoundError, UnprocessableError } from '@/lib/error';
import { assertCan, orgProcedure, router } from '@/lib/trpc/context';
import {
  offsetPaginationSchema,
  paginatedResponse,
  sortOrderSchema,
  toPrismaPage,
} from '@/lib/validations';
import { writeAuditLog } from './audit.service';

const listStockSchema = z.object({
  ...offsetPaginationSchema.shape,
  search: z.string().optional(),
  warehouseId: z.cuid2().optional(),
  categoryId: z.cuid2().optional(),
  lowStock: z.boolean().optional(),
  sortBy: z.enum(['itemName', 'warehouseName', 'quantity', 'updatedAt']).default('itemName'),
  sortOrder: sortOrderSchema,
});

const adjustStockSchema = z.object({
  itemId: z.cuid2(),
  warehouseId: z.cuid2(),
  quantity: z.number().min(0, 'Quantity must be 0 or greater'),
  reason: z.string().max(500).optional(),
});

const transferStockSchema = z.object({
  itemId: z.cuid2(),
  fromWarehouseId: z.cuid2(),
  toWarehouseId: z.cuid2(),
  quantity: z.number().positive('Quantity must be positive'),
  notes: z.string().max(500).optional(),
});

const listMovementsSchema = z.object({
  ...offsetPaginationSchema.shape,
  itemId: z.cuid2().optional(),
  type: z.string().optional(),
  warehouseId: z.cuid2().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sortBy: z.enum(['createdAt', 'type']).default('createdAt'),
  sortOrder: sortOrderSchema,
});

export const stockRouter = router({
  list: orgProcedure.input(listStockSchema).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'stock:read', 'Stock');

    const { search, warehouseId, categoryId, lowStock, sortBy, sortOrder, ...pagination } = input;
    const { skip, take } = toPrismaPage(pagination);
    const orgId = ctx.user.organizationId;

    const itemWhere: Record<string, unknown> = {
      organizationId: orgId,
      deletedAt: null,
      ...(categoryId ? { categoryId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { sku: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const stockWhere: Record<string, unknown> = {
      organizationId: orgId,
      ...(warehouseId ? { warehouseId } : {}),
      item: itemWhere,
    };

    const [stockRows, total] = await ctx.db.$transaction([
      ctx.db.stock.findMany({
        where: stockWhere,
        skip,
        take,
        orderBy:
          sortBy === 'itemName'
            ? { item: { name: sortOrder } }
            : sortBy === 'warehouseName'
              ? { warehouse: { name: sortOrder } }
              : { [sortBy]: sortOrder },
        include: {
          item: {
            select: {
              id: true,
              sku: true,
              name: true,
              unit: true,
              reorderPoint: true,
              image: true,
            },
          },
          warehouse: { select: { id: true, name: true } },
        },
      }),
      ctx.db.stock.count({ where: stockWhere }),
    ]);

    let enriched = stockRows.map((s) => ({
      ...s,
      isLowStock: Number(s.quantity) <= s.item.reorderPoint,
      quantity: Number(s.quantity),
    }));

    if (lowStock) enriched = enriched.filter((s) => s.isLowStock);

    return paginatedResponse(enriched, total, pagination);
  }),

  byItem: orgProcedure.input(z.object({ itemId: z.cuid2() })).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'stock:read', 'Stock');

    const stocks = await ctx.db.stock.findMany({
      where: { itemId: input.itemId, organizationId: ctx.user.organizationId },
      include: { warehouse: { select: { id: true, name: true, isDefault: true } } },
    });

    return { stocks, totalQuantity: stocks.reduce((s, r) => s + Number(r.quantity), 0) };
  }),

  movements: orgProcedure.input(listMovementsSchema).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'stock:read', 'Stock');

    const { itemId, type, warehouseId, dateFrom, dateTo, sortBy, sortOrder, ...pagination } = input;
    const { skip, take } = toPrismaPage(pagination);
    const orgId = ctx.user.organizationId;

    const where: Record<string, unknown> = {
      organizationId: orgId,
      ...(itemId ? { itemId } : {}),
      ...(type ? { type } : {}),
      ...(warehouseId
        ? { OR: [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }] }
        : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {}),
            },
          }
        : {}),
    };

    const [movements, total] = await ctx.db.$transaction([
      ctx.db.stockMovement.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          item: { select: { id: true, sku: true, name: true } },
          fromWarehouse: { select: { id: true, name: true } },
          toWarehouse: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
        },
      }),
      ctx.db.stockMovement.count({ where }),
    ]);

    return paginatedResponse(movements, total, pagination);
  }),

  adjust: orgProcedure.input(adjustStockSchema).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'stock:adjust', 'Stock');

    const orgId = ctx.user.organizationId;

    const item = await ctx.db.item.findFirst({
      where: { id: input.itemId, organizationId: orgId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!item) throw new NotFoundError('Item', input.itemId);

    const warehouse = await ctx.db.warehouse.findFirst({
      where: { id: input.warehouseId, organizationId: orgId, deletedAt: null, isActive: true },
      select: { id: true },
    });
    if (!warehouse) throw new NotFoundError('Warehouse', input.warehouseId);

    const result = await ctx.db.$transaction(async (tx) => {
      const currentStock = await tx.stock.findUnique({
        where: { itemId_warehouseId: { itemId: input.itemId, warehouseId: input.warehouseId } },
      });

      const currentQty = Number(currentStock?.quantity ?? 0);
      const movementType = input.quantity >= currentQty ? 'ADJUSTMENT_UP' : 'ADJUSTMENT_DOWN';

      await tx.stockMovement.create({
        data: {
          type: movementType,
          quantity: input.quantity - currentQty,
          notes: input.reason ?? 'Manual adjustment',
          itemId: input.itemId,
          toWarehouseId: input.warehouseId,
          userId: ctx.user.id,
          organizationId: orgId,
        },
      });

      const updated = await tx.stock.upsert({
        where: { itemId_warehouseId: { itemId: input.itemId, warehouseId: input.warehouseId } },
        create: {
          itemId: input.itemId,
          warehouseId: input.warehouseId,
          organizationId: orgId,
          quantity: input.quantity,
        },
        update: { quantity: input.quantity, version: { increment: 1 } },
      });

      await writeAuditLog(
        {
          entityType: 'Stock',
          entityId: `${input.itemId}_${input.warehouseId}`,
          action: 'UPDATE',
          diff: {
            quantity: { before: currentQty, after: input.quantity },
            reason: { before: null, after: input.reason },
          },
          organizationId: orgId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
        },
        tx,
      );

      return updated;
    });

    return result;
  }),

  transfer: orgProcedure.input(transferStockSchema).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'stock:transfer', 'Stock');

    const orgId = ctx.user.organizationId;

    if (input.fromWarehouseId === input.toWarehouseId) {
      throw new UnprocessableError('Source and destination warehouses must be different.');
    }

    const result = await ctx.db.$transaction(async (tx) => {
      const sourceStock = await tx.stock.findUnique({
        where: { itemId_warehouseId: { itemId: input.itemId, warehouseId: input.fromWarehouseId } },
      });

      const available = Number(sourceStock?.quantity ?? 0);
      if (available < input.quantity) {
        throw new UnprocessableError(
          `Insufficient stock: have ${available}, need ${input.quantity}.`,
        );
      }

      const outMovement = await tx.stockMovement.create({
        data: {
          type: 'TRANSFER_OUT',
          quantity: -input.quantity,
          notes: input.notes,
          itemId: input.itemId,
          fromWarehouseId: input.fromWarehouseId,
          toWarehouseId: input.toWarehouseId,
          userId: ctx.user.id,
          organizationId: orgId,
        },
      });

      const inMovement = await tx.stockMovement.create({
        data: {
          type: 'TRANSFER_IN',
          quantity: input.quantity,
          notes: input.notes,
          pairedMovementId: outMovement.id,
          itemId: input.itemId,
          fromWarehouseId: input.fromWarehouseId,
          toWarehouseId: input.toWarehouseId,
          userId: ctx.user.id,
          organizationId: orgId,
        },
      });

      await tx.stockMovement.update({
        where: { id: outMovement.id },
        data: { pairedMovementId: inMovement.id },
      });

      await tx.stock.update({
        where: { itemId_warehouseId: { itemId: input.itemId, warehouseId: input.fromWarehouseId } },
        data: { quantity: { decrement: input.quantity }, version: { increment: 1 } },
      });

      await tx.stock.upsert({
        where: { itemId_warehouseId: { itemId: input.itemId, warehouseId: input.toWarehouseId } },
        create: {
          itemId: input.itemId,
          warehouseId: input.toWarehouseId,
          organizationId: orgId,
          quantity: input.quantity,
        },
        update: { quantity: { increment: input.quantity }, version: { increment: 1 } },
      });

      await writeAuditLog(
        {
          entityType: 'Stock',
          entityId: `${input.itemId}_TRANSFER`,
          action: 'UPDATE',
          diff: {
            fromWarehouseId: { before: null, after: input.fromWarehouseId },
            toWarehouseId: { before: null, after: input.toWarehouseId },
            quantity: { before: null, after: input.quantity },
          },
          organizationId: orgId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
        },
        tx,
      );

      return { outMovement, inMovement };
    });

    return result;
  }),

  // ── BATCH: stock for a set of items in a single warehouse ──────────────────
  forItems: orgProcedure
    .input(
      z.object({
        itemIds: z.array(z.cuid2()),
        warehouseId: z.cuid2(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'stock:read', 'Stock');

      const stocks = await ctx.db.stock.findMany({
        where: {
          itemId: { in: input.itemIds },
          warehouseId: input.warehouseId,
          organizationId: ctx.user.organizationId,
        },
        select: {
          itemId: true,
          quantity: true,
          item: { select: { name: true, type: true } },
        },
      });

      return stocks;
    }),
});
