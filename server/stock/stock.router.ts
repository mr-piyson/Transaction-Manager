import type { StockMovementType } from "@prisma/client";
import { z } from "zod";
import { NotFoundError, UnprocessableError } from "@/lib/error";
import { generateSerial } from "@/lib/sequences";
import { assertCan, orgProcedure, router } from "@/lib/trpc/context";
import { sortOrderSchema } from "@/lib/validations";
import { postAdjustment } from "../journals/journal-posting.service";
import { writeAuditLog } from "../shared/audit.service";
import {
  ensureDefaultAdjustmentReasons,
  stockReasonsRouter,
} from "./reasons.router";

const listStockSchema = z.object({
  search: z.string().optional(),
  warehouseId: z.string().optional(),
  categoryId: z.string().optional(),
  lowStock: z.boolean().optional(),
  sortBy: z
    .enum(["itemName", "warehouseName", "quantity", "createdAt", "updatedAt"])
    .default("createdAt"),
  sortOrder: sortOrderSchema,
});

const adjustStockSchema = z.object({
  itemId: z.string(),
  warehouseId: z.string(),
  quantity: z.number().min(0, "Quantity must be 0 or greater"),
  reason: z.string().max(500).optional(),
});

const transferStockSchema = z.object({
  itemId: z.string(),
  fromWarehouseId: z.string(),
  toWarehouseId: z.string(),
  quantity: z.number().positive("Quantity must be positive"),
  notes: z.string().max(500).optional(),
});

const listMovementsSchema = z.object({
  itemId: z.string().optional(),
  type: z.string().optional(),
  warehouseId: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sortBy: z.enum(["createdAt", "type"]).default("createdAt"),
  sortOrder: sortOrderSchema,
});

const recordAdjustmentSchema = z.object({
  itemId: z.string(),
  warehouseId: z.string(),
  reasonId: z.string(),
  quantity: z.number().positive("Quantity must be positive"),
  notes: z.string().max(500).optional(),
});

const ADJUSTMENT_TYPES: StockMovementType[] = [
  "ADJUSTMENT_UP",
  "ADJUSTMENT_DOWN",
  "DAMAGE",
];

const listAdjustmentsSchema = z.object({
  itemId: z.string().optional(),
  warehouseId: z.string().optional(),
  reasonId: z.string().optional(),
  direction: z.enum(["INCREASE", "DECREASE"]).optional(),
  search: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export const stockRouter = router({
  list: orgProcedure.input(listStockSchema).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, "stock:read", "Stock");

    const { search, warehouseId, categoryId, lowStock, sortBy, sortOrder } =
      input;
    const orgId = ctx.user.organizationId;

    const itemWhere: Record<string, unknown> = {
      organizationId: orgId,
      deletedAt: null,
      ...(categoryId ? { categoryId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { sku: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const stockWhere: Record<string, unknown> = {
      organizationId: orgId,
      ...(warehouseId ? { warehouseId } : {}),
      item: itemWhere,
    };

    const stockRows = await ctx.db.stock.findMany({
      where: stockWhere,
      orderBy:
        sortBy === "itemName"
          ? { item: { name: sortOrder } }
          : sortBy === "warehouseName"
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
    });

    let enriched = stockRows.map((s) => ({
      ...s,
      isLowStock: Number(s.quantity) <= s.item.reorderPoint,
      quantity: Number(s.quantity),
    }));

    if (lowStock) enriched = enriched.filter((s) => s.isLowStock);

    return enriched;
  }),

  byItem: orgProcedure
    .input(z.object({ itemId: z.string() }))
    .query(async ({ ctx, input }) => {
      assertCan(ctx.ability, "stock:read", "Stock");

      const stocks = await ctx.db.stock.findMany({
        where: {
          itemId: input.itemId,
          organizationId: ctx.user.organizationId,
        },
        include: {
          warehouse: { select: { id: true, name: true, isDefault: true } },
        },
      });

      return {
        stocks,
        totalQuantity: stocks.reduce((s, r) => s + Number(r.quantity), 0),
      };
    }),

  movements: orgProcedure
    .input(listMovementsSchema)
    .query(async ({ ctx, input }) => {
      assertCan(ctx.ability, "stock:read", "Stock");

      const { itemId, type, warehouseId, dateFrom, dateTo, sortBy, sortOrder } =
        input;
      const orgId = ctx.user.organizationId;

      const where: Record<string, unknown> = {
        organizationId: orgId,
        ...(itemId ? { itemId } : {}),
        ...(type ? { type } : {}),
        ...(warehouseId
          ? {
              OR: [
                { fromWarehouseId: warehouseId },
                { toWarehouseId: warehouseId },
              ],
            }
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

      const movements = await ctx.db.stockMovement.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        include: {
          item: { select: { id: true, sku: true, name: true } },
          fromWarehouse: { select: { id: true, name: true } },
          toWarehouse: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
        },
      });

      return movements;
    }),

  // ── LIST: manual adjustments (ADJUSTMENT_UP / ADJUSTMENT_DOWN / DAMAGE) ────
  adjustments: orgProcedure
    .input(listAdjustmentsSchema)
    .query(async ({ ctx, input }) => {
      assertCan(ctx.ability, "stock:read", "Stock");

      const {
        itemId,
        warehouseId,
        reasonId,
        direction,
        search,
        dateFrom,
        dateTo,
      } = input;
      const orgId = ctx.user.organizationId;

      const where: Record<string, unknown> = {
        organizationId: orgId,
        type: { in: ADJUSTMENT_TYPES },
        ...(itemId ? { itemId } : {}),
        ...(reasonId ? { adjustmentReasonId: reasonId } : {}),
        ...(direction === "DECREASE" ? { quantity: { lt: 0 } } : {}),
        ...(direction === "INCREASE" ? { quantity: { gt: 0 } } : {}),
        ...(warehouseId
          ? {
              OR: [
                { fromWarehouseId: warehouseId },
                { toWarehouseId: warehouseId },
              ],
            }
          : {}),
        ...(dateFrom || dateTo
          ? {
              createdAt: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateTo ? { lte: dateTo } : {}),
              },
            }
          : {}),
        ...(search
          ? {
              item: {
                OR: [
                  { name: { contains: search, mode: "insensitive" as const } },
                  { sku: { contains: search, mode: "insensitive" as const } },
                ],
              },
            }
          : {}),
      };

      const movements = await ctx.db.stockMovement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          item: {
            select: {
              id: true,
              sku: true,
              name: true,
              unit: true,
              image: true,
            },
          },
          fromWarehouse: { select: { id: true, name: true } },
          toWarehouse: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
          adjustmentReason: {
            select: { id: true, name: true, direction: true },
          },
        },
      });

      return movements;
    }),

  // ── MUTATION: record a loss/damage/correction adjustment ───────────────────
  recordAdjustment: orgProcedure
    .input(recordAdjustmentSchema)
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, "stock:adjust", "Stock");

      const orgId = ctx.user.organizationId;

      const item = await ctx.db.item.findFirst({
        where: { id: input.itemId, organizationId: orgId, deletedAt: null },
        select: { id: true, name: true, type: true, averageCost: true },
      });
      if (!item) throw new NotFoundError("Item", input.itemId);
      if (item.type === "SERVICE") {
        throw new UnprocessableError(
          "Service items do not carry stock and cannot be adjusted.",
        );
      }

      const warehouse = await ctx.db.warehouse.findFirst({
        where: {
          id: input.warehouseId,
          organizationId: orgId,
          deletedAt: null,
          isActive: true,
        },
        select: { id: true },
      });
      if (!warehouse) throw new NotFoundError("Warehouse", input.warehouseId);

      const reason = await ctx.db.stockAdjustmentReason.findFirst({
        where: {
          id: input.reasonId,
          organizationId: orgId,
          deletedAt: null,
          isActive: true,
        },
      });
      if (!reason)
        throw new NotFoundError("StockAdjustmentReason", input.reasonId);

      const isDecrease = reason.direction === "DECREASE";
      const unitCost = Number(item.averageCost);

      const result = await ctx.db.$transaction(async (tx) => {
        await ensureDefaultAdjustmentReasons(tx, orgId);

        const currentStock = await tx.stock.findUnique({
          where: {
            itemId_warehouseId: {
              itemId: input.itemId,
              warehouseId: input.warehouseId,
            },
          },
        });

        const currentQty = Number(currentStock?.quantity ?? 0);
        if (isDecrease && currentQty < input.quantity) {
          throw new UnprocessableError(
            `Insufficient stock: have ${currentQty}, cannot write off ${input.quantity}.`,
          );
        }

        const serial = await generateSerial({
          db: tx,
          organizationId: orgId,
          prefix: "ADJ",
        });

        const movement = await tx.stockMovement.create({
          data: {
            type: reason.movementType,
            quantity: isDecrease ? -input.quantity : input.quantity,
            unitCost,
            notes: input.notes ?? null,
            adjustmentReasonId: reason.id,
            itemId: input.itemId,
            userId: ctx.user.id,
            organizationId: orgId,
            ...(isDecrease
              ? { fromWarehouseId: input.warehouseId }
              : { toWarehouseId: input.warehouseId }),
          },
        });

        const stock = await tx.stock.upsert({
          where: {
            itemId_warehouseId: {
              itemId: input.itemId,
              warehouseId: input.warehouseId,
            },
          },
          create: {
            itemId: input.itemId,
            warehouseId: input.warehouseId,
            organizationId: orgId,
            quantity: isDecrease ? -input.quantity : input.quantity,
          },
          update: {
            quantity: isDecrease
              ? { decrement: input.quantity }
              : { increment: input.quantity },
            version: { increment: 1 },
          },
        });

        await postAdjustment({
          tx,
          organizationId: orgId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
          stockMovementId: movement.id,
          serial,
          itemName: item.name,
          reasonName: reason.name,
          direction: reason.direction,
          value: input.quantity * unitCost,
          glAccountCode: reason.glAccountCode,
        });

        await writeAuditLog(
          {
            entityType: "Stock",
            entityId: `${input.itemId}_${input.warehouseId}`,
            action: "UPDATE",
            diff: {
              serial: { before: null, after: serial },
              reason: { before: null, after: reason.name },
              quantity: {
                before: currentQty,
                after: Number(stock.quantity),
              },
            },
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return { movement, stock };
      });

      return result;
    }),

  adjust: orgProcedure
    .input(adjustStockSchema)
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, "stock:adjust", "Stock");

      const orgId = ctx.user.organizationId;

      const item = await ctx.db.item.findFirst({
        where: { id: input.itemId, organizationId: orgId, deletedAt: null },
        select: { id: true, name: true },
      });
      if (!item) throw new NotFoundError("Item", input.itemId);

      const warehouse = await ctx.db.warehouse.findFirst({
        where: {
          id: input.warehouseId,
          organizationId: orgId,
          deletedAt: null,
          isActive: true,
        },
        select: { id: true },
      });
      if (!warehouse) throw new NotFoundError("Warehouse", input.warehouseId);

      const result = await ctx.db.$transaction(async (tx) => {
        const currentStock = await tx.stock.findUnique({
          where: {
            itemId_warehouseId: {
              itemId: input.itemId,
              warehouseId: input.warehouseId,
            },
          },
        });

        const currentQty = Number(currentStock?.quantity ?? 0);
        const movementType =
          input.quantity >= currentQty ? "ADJUSTMENT_UP" : "ADJUSTMENT_DOWN";

        await tx.stockMovement.create({
          data: {
            type: movementType,
            quantity: input.quantity - currentQty,
            notes: input.reason ?? "Manual adjustment",
            itemId: input.itemId,
            toWarehouseId: input.warehouseId,
            userId: ctx.user.id,
            organizationId: orgId,
          },
        });

        const updated = await tx.stock.upsert({
          where: {
            itemId_warehouseId: {
              itemId: input.itemId,
              warehouseId: input.warehouseId,
            },
          },
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
            entityType: "Stock",
            entityId: `${input.itemId}_${input.warehouseId}`,
            action: "UPDATE",
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

  transfer: orgProcedure
    .input(transferStockSchema)
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, "stock:transfer", "Stock");

      const orgId = ctx.user.organizationId;

      if (input.fromWarehouseId === input.toWarehouseId) {
        throw new UnprocessableError(
          "Source and destination warehouses must be different.",
        );
      }

      const result = await ctx.db.$transaction(async (tx) => {
        const sourceStock = await tx.stock.findUnique({
          where: {
            itemId_warehouseId: {
              itemId: input.itemId,
              warehouseId: input.fromWarehouseId,
            },
          },
        });

        const available = Number(sourceStock?.quantity ?? 0);
        if (available < input.quantity) {
          throw new UnprocessableError(
            `Insufficient stock: have ${available}, need ${input.quantity}.`,
          );
        }

        const outMovement = await tx.stockMovement.create({
          data: {
            type: "TRANSFER_OUT",
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
            type: "TRANSFER_IN",
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
          where: {
            itemId_warehouseId: {
              itemId: input.itemId,
              warehouseId: input.fromWarehouseId,
            },
          },
          data: {
            quantity: { decrement: input.quantity },
            version: { increment: 1 },
          },
        });

        await tx.stock.upsert({
          where: {
            itemId_warehouseId: {
              itemId: input.itemId,
              warehouseId: input.toWarehouseId,
            },
          },
          create: {
            itemId: input.itemId,
            warehouseId: input.toWarehouseId,
            organizationId: orgId,
            quantity: input.quantity,
          },
          update: {
            quantity: { increment: input.quantity },
            version: { increment: 1 },
          },
        });

        await writeAuditLog(
          {
            entityType: "Stock",
            entityId: `${input.itemId}_TRANSFER`,
            action: "UPDATE",
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
        itemIds: z.array(z.string()),
        warehouseId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertCan(ctx.ability, "stock:read", "Stock");

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

  reasons: stockReasonsRouter,
});
