/**
 *
 * Item catalogue router (products, services, bundles).
 *
 * STOCK AWARENESS:
 * Items themselves don't hold quantity — that lives in Stock rows.
 * The `withStock` query option joins stock across all warehouses so the
 * client gets a single "total available" number without a separate call.
 *
 * PRICE RESOLUTION ORDER (used by invoice line creation):
 * 1. Customer's assigned PriceList → PriceListLine for this item
 * 2. Item.salesPrice (default)
 * The items router exposes `resolvePrice` for the invoice router to call.
 */

import type { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnprocessableError,
} from "@/lib/error";
import { assertCan, orgProcedure, router } from "@/lib/trpc/context";
import { assertFactor } from "@/lib/uom-converter";
import {
  currencyCodeSchema,
  decimalSchema,
  sortOrderSchema,
} from "@/lib/validations";
import { deleteUploadByStoragePath } from "@/server/services/file/upload.service";
import { writeAuditLog } from "../shared/audit.service";
import { getHardDeleteInfo, hardDeleteItemTree } from "./hard-delete.service";

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const bundleLineSchema = z.object({
  componentItemId: z.string(),
  quantity: decimalSchema,
});

const itemBaseSchema = z.object({
  type: z.enum(["PRODUCT", "SERVICE", "BUNDLE"]).default("PRODUCT"),
  sku: z.string().min(1).max(100),
  barcode: z.string().max(100).optional(),
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  image: z.string().max(500).nullable().optional(),
  unit: z.string().max(50).default("pcs"),
  unitId: z.string().optional(),
  isSaleable: z.boolean().default(true),
  isPurchasable: z.boolean().default(true),
  salesPrice: decimalSchema.optional(),
  minStock: z.number().int().min(0).default(0),
  reorderPoint: z.number().int().min(0).default(0),
  reorderQty: z.number().int().min(0).default(0),
  categoryId: z.string().optional(),
  taxRateId: z.string().optional(),
  revenueAccountId: z.string().optional(),
  cogsAccountId: z.string().optional(),
  inventoryAccountId: z.string().optional(),
  bundleLines: z.array(bundleLineSchema).optional(),
});

const createItemSchema = itemBaseSchema;
const updateItemSchema = itemBaseSchema.partial().extend({
  id: z.string(),
});

const addItemUomSchema = z.object({
  itemId: z.string(),
  unitId: z.string(),
  factor: decimalSchema,
  isPurchaseDefault: z.boolean().default(false),
  isSalesDefault: z.boolean().default(false),
  barcode: z.string().max(100).optional(),
});

const updateItemUomSchema = z.object({
  id: z.string(),
  factor: decimalSchema.optional(),
  isPurchaseDefault: z.boolean().optional(),
  isSalesDefault: z.boolean().optional(),
  barcode: z.string().max(100).nullish(),
  isActive: z.boolean().optional(),
});

const listItemsSchema = z.object({
  search: z.string().optional(),
  type: z.enum(["PRODUCT", "SERVICE", "BUNDLE"]).optional(),
  categoryId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  supplierId: z.string().optional(),
  isSaleable: z.boolean().optional(),
  lowStock: z.boolean().optional(), // Filter items below reorderPoint
  sortBy: z
    .enum(["name", "sku", "salesPrice", "createdAt"])
    .default("createdAt"),
  sortOrder: sortOrderSchema,
  withStock: z.boolean().default(false), // Include aggregated stock levels
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

/**
 * Usage counter for the UoM locking rule: once an item has any stock movement
 * or document line, its Base Unit and every ItemUom.factor are immutable
 * (only deactivation + replacement is allowed).
 */
async function countItemUsage(
  db: Prisma.TransactionClient,
  itemId: string,
): Promise<number> {
  const [movements, invoiceLines, purchaseLines] = await Promise.all([
    db.stockMovement.count({ where: { itemId } }),
    db.invoiceLine.count({ where: { itemId } }),
    db.purchaseLine.count({ where: { itemId } }),
  ]);
  return movements + invoiceLines + purchaseLines;
}

export const itemsRouter = router({
  // ── LIST ──────────────────────────────────────────────────────────────────
  list: orgProcedure.input(listItemsSchema).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, "item:read", "Item");

    const {
      search,
      type,
      categoryId,
      supplierId,
      isActive,
      isSaleable,
      lowStock,
      sortBy,
      sortOrder,
      withStock,
    } = input;
    const orgId = ctx.user.organizationId;

    const where = {
      organizationId: orgId,
      deletedAt: null,
      ...(type ? { type } : {}),
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(isSaleable !== undefined ? { isSaleable } : {}),
      ...(supplierId
        ? {
            supplierItems: {
              some: { supplierId, isActive: true, deletedAt: null },
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { sku: { contains: search, mode: "insensitive" as const } },
              { barcode: { contains: search, mode: "insensitive" as const } },
              {
                description: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    };

    const [items] = await ctx.db.$transaction([
      ctx.db.item.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          sku: true,
          barcode: true,
          name: true,
          image: true,
          type: true,
          unit: true,
          unitId: true,
          salesPrice: true,
          averageCost: true,
          minStock: true,
          reorderPoint: true,
          isSaleable: true,
          isPurchasable: true,
          isActive: true,
          itemUoms: {
            where: { deletedAt: null, isActive: true },
            select: {
              unitId: true,
              factor: true,
              isPurchaseDefault: true,
              isSalesDefault: true,
              barcode: true,
              unit: { select: { id: true, code: true, name: true } },
            },
            orderBy: { createdAt: "asc" as const },
          },
          category: { select: { id: true, name: true, color: true } },
          taxRate: { select: { id: true, name: true, rate: true } },
          // Aggregate stock across all warehouses if requested
          ...(supplierId
            ? {
                supplierItems: {
                  where: { supplierId, isActive: true, deletedAt: null },
                  select: {
                    supplierSku: true,
                    basePrice: true,
                    leadTimeDays: true,
                    minOrderQty: true,
                  },
                  take: 1,
                },
              }
            : {}),
          ...(withStock
            ? {
                stock: {
                  select: {
                    quantity: true,
                    warehouse: { select: { id: true, name: true } },
                  },
                },
              }
            : {}),
        },
      }),
      ctx.db.item.count({ where }),
    ]);

    // Post-process: add totalStock and lowStockFlag
    const enriched = items.map((item) => {
      const stockRows = "stock" in item ? item.stock : [];
      const totalStock = stockRows.reduce(
        (sum, s) => sum + Number(s.quantity),
        0,
      );
      return {
        ...item,
        totalStock: withStock ? totalStock : undefined,
        isLowStock: withStock ? totalStock <= item.reorderPoint : undefined,
      };
    });

    // Apply lowStock filter post-aggregation (can't do in Prisma directly)
    const filtered =
      lowStock && withStock ? enriched.filter((i) => i.isLowStock) : enriched;

    return filtered;
  }),

  // ── GET BY ID ─────────────────────────────────────────────────────────────
  byId: orgProcedure
    .input(z.object({ id: z.string(), withStock: z.boolean().default(true) }))
    .query(async ({ ctx, input }) => {
      assertCan(ctx.ability, "item:read", "Item");

      const item = await ctx.db.item.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.user.organizationId,
          deletedAt: null,
        },
        include: {
          category: true,
          taxRate: true,
          unitRef: { select: { id: true, code: true, name: true } },
          itemUoms: {
            where: { deletedAt: null },
            include: { unit: { select: { id: true, code: true, name: true } } },
            orderBy: { createdAt: "asc" },
          },
          revenueAccount: { select: { id: true, code: true, name: true } },
          cogsAccount: { select: { id: true, code: true, name: true } },
          inventoryAccount: { select: { id: true, code: true, name: true } },
          supplierItems: {
            where: { isActive: true, deletedAt: null },
            include: {
              supplier: { select: { id: true, name: true } },
            },
          },
          ...(input.withStock
            ? {
                stock: {
                  include: {
                    warehouse: {
                      select: { id: true, name: true, isDefault: true },
                    },
                  },
                },
              }
            : {}),
          bundleLines: {
            include: {
              componentItem: {
                select: { id: true, sku: true, name: true, unit: true },
              },
            },
          },
          _count: { select: { invoiceLines: true, purchaseLines: true } },
        },
      });

      if (!item) throw new NotFoundError("Item", input.id);
      return item;
    }),

  // ── GET BY SKU ────────────────────────────────────────────────────────────
  bySku: orgProcedure
    .input(z.object({ sku: z.string() }))
    .query(async ({ ctx, input }) => {
      assertCan(ctx.ability, "item:read", "Item");

      const item = await ctx.db.item.findFirst({
        where: {
          sku: input.sku,
          organizationId: ctx.user.organizationId,
          deletedAt: null,
        },
        select: {
          id: true,
          sku: true,
          name: true,
          salesPrice: true,
          unit: true,
          taxRate: { select: { id: true, rate: true, name: true } },
        },
      });

      if (!item) throw new NotFoundError("Item (SKU)", input.sku);
      return item;
    }),

  // ── BULK IMPORT ──────────────────────────────────────────────────────────
  bulkImport: orgProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            sku: z.string().min(1),
            name: z.string().min(1),
            description: z.string().max(5000).optional(),
            salesPrice: z.coerce.number().min(0).optional(),
            unit: z.string().max(50).default("pcs"),
            minStock: z.coerce.number().int().min(0).default(0),
            reorderPoint: z.coerce.number().int().min(0).default(0),
            reorderQty: z.coerce.number().int().min(0).default(0),
            barcode: z.string().max(100).optional(),
            image: z.string().max(500).optional(),
            categoryName: z.string().optional(),
            taxRateId: z.string().optional(),
          }),
        ),
        updateExisting: z.boolean().default(false),
        supplierId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, "item:create", "Item");

      const { bulkImportItems } = await import("./import.service");

      return bulkImportItems(input.items, input, {
        db: ctx.db,
        organizationId: ctx.user.organizationId,
        userId: ctx.user.id,
        ipAddress: ctx.ipAddress,
      });
    }),

  // ── RESOLVE PRICE (for invoice line creation) ─────────────────────────────
  resolvePrice: orgProcedure
    .input(
      z.object({
        itemId: z.string(),
        customerId: z.string().optional(),
        quantity: z.number().positive().default(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertCan(ctx.ability, "item:read", "Item");

      const item = await ctx.db.item.findFirst({
        where: {
          id: input.itemId,
          organizationId: ctx.user.organizationId,
          deletedAt: null,
          isSaleable: true,
        },
        select: {
          id: true,
          salesPrice: true,
          taxRateId: true,
          taxRate: { select: { rate: true, name: true } },
        },
      });

      if (!item) throw new NotFoundError("Item", input.itemId);

      let resolvedPrice = item.salesPrice;
      let priceSource: "price_list" | "item_default" = "item_default";

      // Check customer's price list
      if (input.customerId) {
        const customer = await ctx.db.customer.findFirst({
          where: {
            id: input.customerId,
            organizationId: ctx.user.organizationId,
            deletedAt: null,
          },
          select: {
            priceList: {
              select: {
                lines: {
                  where: {
                    itemId: input.itemId,
                    minQty: { lte: input.quantity },
                  },
                  orderBy: { minQty: "desc" },
                  take: 1,
                  select: { unitPrice: true },
                },
              },
            },
          },
        });

        const plPrice = customer?.priceList?.lines[0]?.unitPrice;
        if (plPrice !== undefined) {
          resolvedPrice = plPrice;
          priceSource = "price_list";
        }
      }

      return {
        itemId: input.itemId,
        unitPrice: resolvedPrice,
        priceSource,
        taxRateId: item.taxRateId,
        taxRate: item.taxRate,
      };
    }),

  // ── CREATE ────────────────────────────────────────────────────────────────
  create: orgProcedure
    .input(createItemSchema)
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, "item:create", "Item");

      // SKU uniqueness within org
      const existing = await ctx.db.item.findFirst({
        where: {
          sku: input.sku,
          organizationId: ctx.user.organizationId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictError(`SKU "${input.sku}" is already in use.`);
      }

      const { bundleLines, ...itemData } = input;

      const item = await ctx.db.$transaction(async (tx) => {
        const created = await tx.item.create({
          data: {
            ...itemData,
            organizationId: ctx.user.organizationId,
            createdById: ctx.user.id,
          },
        });

        if (bundleLines && bundleLines.length > 0) {
          await tx.bundleLine.createMany({
            data: bundleLines.map((bl) => ({
              bundleItemId: created.id,
              componentItemId: bl.componentItemId,
              quantity: bl.quantity,
              organizationId: ctx.user.organizationId,
            })),
          });
        }

        await writeAuditLog(
          {
            entityType: "Item",
            entityId: created.id,
            action: "CREATE",
            organizationId: ctx.user.organizationId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return created;
      });

      return item;
    }),

  // ── UPDATE ────────────────────────────────────────────────────────────────
  update: orgProcedure
    .input(updateItemSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const existing = await ctx.db.item.findFirst({
        where: { id, organizationId: ctx.user.organizationId, deletedAt: null },
      });
      if (!existing) throw new NotFoundError("Item", id);

      assertCan(
        ctx.ability,
        "item:update",
        "Item",
        existing as Record<string, unknown>,
      );

      // SKU uniqueness (ignore self)
      if (data.sku && data.sku !== existing.sku) {
        const conflict = await ctx.db.item.findFirst({
          where: {
            sku: data.sku,
            organizationId: ctx.user.organizationId,
            deletedAt: null,
            NOT: { id },
          },
          select: { id: true },
        });
        if (conflict) {
          throw new ConflictError(`SKU "${data.sku}" is already in use.`);
        }
      }

      const { bundleLines, ...itemData } = data;

      // Locking rule: the Base Unit is immutable once the item has been used
      // (any stock movement or document line references it).
      if (
        itemData.unitId !== undefined &&
        itemData.unitId !== existing.unitId
      ) {
        const usage = await countItemUsage(ctx.db, id);
        if (usage > 0) {
          throw new UnprocessableError(
            "This item's base unit can no longer be changed because it has stock movements or document lines.",
          );
        }
      }

      const updated = await ctx.db.$transaction(async (tx) => {
        const updated = await tx.item.update({
          where: { id },
          data: { ...itemData, updatedById: ctx.user.id },
        });

        if (bundleLines !== undefined) {
          await tx.bundleLine.deleteMany({
            where: { bundleItemId: id },
          });

          if (bundleLines.length > 0) {
            await tx.bundleLine.createMany({
              data: bundleLines.map((bl) => ({
                bundleItemId: id,
                componentItemId: bl.componentItemId,
                quantity: bl.quantity,
                organizationId: ctx.user.organizationId,
              })),
            });
          }
        }

        await writeAuditLog(
          {
            entityType: "Item",
            entityId: id,
            action: "UPDATE",
            organizationId: ctx.user.organizationId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return updated;
      });

      // Garbage collect the replaced/removed image file after the DB write
      // commits successfully. This keeps the filesystem and DB consistent —
      // if the transaction fails, the old file is left untouched.
      const oldImage = existing.image;
      const newImage = updated.image;
      if (oldImage && oldImage !== newImage) {
        try {
          await deleteUploadByStoragePath(oldImage);
        } catch (err) {
          console.error("[Items.update] image GC failed", err);
        }
      }

      return updated;
    }),

  // ── UNITS OF MEASURE (per-item conversions) ──────────────────────────────
  addUom: orgProcedure
    .input(addItemUomSchema)
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, "item:update", "Item");
      const orgId = ctx.user.organizationId;

      const item = await ctx.db.item.findFirst({
        where: { id: input.itemId, organizationId: orgId, deletedAt: null },
        select: { id: true, unitId: true },
      });
      if (!item) throw new NotFoundError("Item", input.itemId);

      if (item.unitId && input.unitId === item.unitId) {
        throw new UnprocessableError(
          "The base unit is already active with an implicit factor of 1 — it cannot be added as an alternative unit.",
        );
      }

      const unit = await ctx.db.unit.findFirst({
        where: { id: input.unitId, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      if (!unit) throw new NotFoundError("Unit", input.unitId);

      const factor = assertFactor(input.factor);

      return ctx.db.$transaction(async (tx) => {
        const existing = await tx.itemUom.findUnique({
          where: {
            itemId_unitId: {
              itemId: input.itemId,
              unitId: input.unitId,
            },
          },
        });
        if (existing && !existing.deletedAt) {
          throw new ConflictError(
            "This unit is already configured for the item.",
          );
        }

        const data = {
          factor: factor.toString(),
          isPurchaseDefault: input.isPurchaseDefault,
          isSalesDefault: input.isSalesDefault,
          barcode: input.barcode ?? null,
          isActive: true,
          deletedAt: null,
        };

        const row = existing
          ? await tx.itemUom.update({ where: { id: existing.id }, data })
          : await tx.itemUom.create({
              data: {
                ...data,
                itemId: input.itemId,
                unitId: input.unitId,
                organizationId: orgId,
              },
            });

        // At most one purchase default / one sales default per item.
        if (input.isPurchaseDefault) {
          await tx.itemUom.updateMany({
            where: {
              itemId: input.itemId,
              id: { not: row.id },
              deletedAt: null,
            },
            data: { isPurchaseDefault: false },
          });
        }
        if (input.isSalesDefault) {
          await tx.itemUom.updateMany({
            where: {
              itemId: input.itemId,
              id: { not: row.id },
              deletedAt: null,
            },
            data: { isSalesDefault: false },
          });
        }

        await writeAuditLog(
          {
            entityType: "ItemUom",
            entityId: row.id,
            action: existing ? "UPDATE" : "CREATE",
            diff: {
              itemId: { before: null, after: input.itemId },
              unitId: { before: null, after: input.unitId },
              factor: { before: null, after: factor.toString() },
            },
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return row;
      });
    }),

  updateUom: orgProcedure
    .input(updateItemUomSchema)
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, "item:update", "Item");
      const orgId = ctx.user.organizationId;

      const row = await ctx.db.itemUom.findFirst({
        where: { id: input.id, organizationId: orgId, deletedAt: null },
        select: {
          id: true,
          itemId: true,
          unitId: true,
          factor: true,
          isPurchaseDefault: true,
          isSalesDefault: true,
        },
      });
      if (!row) throw new NotFoundError("ItemUom", input.id);

      let factor: ReturnType<typeof assertFactor> | undefined;
      let factorBefore: string | null = null;
      if (input.factor !== undefined) {
        factor = assertFactor(input.factor);
        if (!factor.equals(row.factor)) {
          const usage = await countItemUsage(ctx.db, row.itemId);
          if (usage > 0) {
            throw new UnprocessableError(
              "This conversion factor can no longer be changed because the item has stock movements or document lines. Deactivate this unit and add a replacement instead.",
            );
          }
          factorBefore = row.factor.toString();
        } else {
          factor = undefined;
        }
      }

      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.itemUom.update({
          where: { id: row.id },
          data: {
            ...(factor ? { factor: factor.toString() } : {}),
            ...(input.isPurchaseDefault !== undefined
              ? { isPurchaseDefault: input.isPurchaseDefault }
              : {}),
            ...(input.isSalesDefault !== undefined
              ? { isSalesDefault: input.isSalesDefault }
              : {}),
            ...(input.barcode !== undefined ? { barcode: input.barcode } : {}),
            ...(input.isActive !== undefined
              ? { isActive: input.isActive }
              : {}),
          },
        });

        if (input.isPurchaseDefault === true) {
          await tx.itemUom.updateMany({
            where: {
              itemId: row.itemId,
              id: { not: row.id },
              deletedAt: null,
            },
            data: { isPurchaseDefault: false },
          });
        }
        if (input.isSalesDefault === true) {
          await tx.itemUom.updateMany({
            where: {
              itemId: row.itemId,
              id: { not: row.id },
              deletedAt: null,
            },
            data: { isSalesDefault: false },
          });
        }

        await writeAuditLog(
          {
            entityType: "ItemUom",
            entityId: row.id,
            action: "UPDATE",
            diff: {
              factor: {
                before: factorBefore,
                after: factor ? factor.toString() : null,
              },
            },
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return updated;
      });
    }),

  removeUom: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, "item:update", "Item");
      const orgId = ctx.user.organizationId;

      const row = await ctx.db.itemUom.findFirst({
        where: { id: input.id, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      if (!row) throw new NotFoundError("ItemUom", input.id);

      return ctx.db.$transaction(async (tx) => {
        const deleted = await tx.itemUom.update({
          where: { id: row.id },
          data: {
            deletedAt: new Date(),
            isActive: false,
            isPurchaseDefault: false,
            isSalesDefault: false,
          },
        });

        await writeAuditLog(
          {
            entityType: "ItemUom",
            entityId: row.id,
            action: "DELETE",
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return deleted;
      });
    }),

  // ── SOFT DELETE ───────────────────────────────────────────────────────────
  delete: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.item.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.user.organizationId,
          deletedAt: null,
        },
        select: {
          id: true,
          organizationId: true,
          _count: {
            select: {
              stock: { where: { quantity: { gt: 0 } } },
            },
          },
        },
      });
      if (!existing) throw new NotFoundError("Item", input.id);

      assertCan(
        ctx.ability,
        "item:delete",
        "Item",
        existing as Record<string, unknown>,
      );

      if (existing._count.stock > 0) {
        throw new ConflictError(
          "Cannot delete item: it has stock on hand. Adjust stock to zero first.",
        );
      }

      await ctx.db.$transaction(async (tx) => {
        await tx.item.update({
          where: { id: input.id },
          data: {
            deletedAt: new Date(),
            isActive: false,
            updatedById: ctx.user.id,
          },
        });

        await writeAuditLog(
          {
            entityType: "Item",
            entityId: input.id,
            action: "DELETE",
            organizationId: ctx.user.organizationId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );
      });

      return { success: true };
    }),

  // ── HARD DELETE (SUPER_ADMIN only) ────────────────────────────────────────
  // Permanently removes the item AND all related records. Only users with
  // platformRole === 'SUPER_ADMIN' may call these procedures.
  hardDeleteInfo: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.platformRole !== "SUPER_ADMIN") {
        throw new ForbiddenError(
          "hard delete",
          "this item. This action is restricted to platform super admins",
        );
      }

      const orgId = ctx.user.organizationId;
      const exists = await ctx.db.item.findFirst({
        where: { id: input.id, organizationId: orgId },
        select: { id: true },
      });
      if (!exists) throw new NotFoundError("Item", input.id);

      return getHardDeleteInfo(ctx.db, orgId, input.id);
    }),

  hardDelete: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.platformRole !== "SUPER_ADMIN") {
        throw new ForbiddenError(
          "hard delete",
          "this item. This action is restricted to platform super admins",
        );
      }

      const orgId = ctx.user.organizationId;
      const exists = await ctx.db.item.findFirst({
        where: { id: input.id, organizationId: orgId },
        select: { id: true },
      });
      if (!exists) throw new NotFoundError("Item", input.id);

      await ctx.db.$transaction(async (tx) => {
        await hardDeleteItemTree(
          tx,
          orgId,
          input.id,
          ctx.user.id,
          ctx.ipAddress,
        );
      });

      return { success: true };
    }),

  // ── STOCK SUMMARY ─────────────────────────────────────────────────────────
  stockSummary: orgProcedure
    .input(z.object({ itemId: z.string() }))
    .query(async ({ ctx, input }) => {
      assertCan(ctx.ability, "stock:read", "Stock");

      const stocks = await ctx.db.stock.findMany({
        where: {
          itemId: input.itemId,
          organizationId: ctx.user.organizationId,
          warehouse: { isActive: true },
        },
        include: {
          warehouse: { select: { id: true, name: true, isDefault: true } },
        },
      });

      const totalQty = stocks.reduce((sum, s) => sum + Number(s.quantity), 0);

      return { stocks, totalQuantity: totalQty };
    }),

  // ── REPORT ──────────────────────────────────────────────────────────────
  report: orgProcedure.query(async ({ ctx }) => {
    assertCan(ctx.ability, "report:inventory", "all");

    const orgId = ctx.user.organizationId;

    const items = await ctx.db.item.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        sku: true,
        barcode: true,
        name: true,
        image: true,
        type: true,
        unit: true,
        isActive: true,
        isSaleable: true,
        isPurchasable: true,
        salesPrice: true,
        averageCost: true,
        minStock: true,
        reorderPoint: true,
        reorderQty: true,
        weightKg: true,
        description: true,
        createdAt: true,
        category: { select: { id: true, name: true, color: true } },
        taxRate: { select: { id: true, name: true, rate: true } },
        stock: {
          select: {
            quantity: true,
            warehouse: { select: { id: true, name: true } },
          },
        },
        supplierItems: {
          where: { isActive: true, deletedAt: null },
          select: {
            supplierSku: true,
            basePrice: true,
            supplier: { select: { id: true, name: true } },
          },
        },
      },
    });

    return items.map((item) => {
      const stockByWarehouse = item.stock.map((s) => ({
        warehouseId: s.warehouse.id,
        warehouseName: s.warehouse.name,
        quantity: Number(s.quantity),
      }));

      const totalStock = stockByWarehouse.reduce(
        (sum, s) => sum + s.quantity,
        0,
      );

      const stockStatus =
        totalStock <= 0
          ? "out"
          : totalStock <= item.minStock
            ? "low"
            : "in_stock";

      const inventoryValue = totalStock * Number(item.averageCost);

      return {
        id: item.id,
        sku: item.sku,
        barcode: item.barcode,
        name: item.name,
        image: item.image,
        type: item.type,
        unit: item.unit,
        isActive: item.isActive,
        isSaleable: item.isSaleable,
        isPurchasable: item.isPurchasable,
        salesPrice: Number(item.salesPrice),
        averageCost: Number(item.averageCost),
        minStock: item.minStock,
        reorderPoint: item.reorderPoint,
        reorderQty: item.reorderQty,
        weightKg: item.weightKg ? Number(item.weightKg) : null,
        description: item.description,
        createdAt: item.createdAt,
        categoryName: item.category?.name ?? null,
        categoryColor: item.category?.color ?? null,
        taxRateName: item.taxRate?.name ?? null,
        taxRatePercent: item.taxRate ? Number(item.taxRate.rate) : null,
        stockByWarehouse,
        totalStock,
        stockStatus,
        inventoryValue,
        supplierNames: item.supplierItems.map((si) => si.supplier.name),
        warehouseNames: stockByWarehouse.map((s) => s.warehouseName),
      };
    });
  }),

  // ── CREATE WITH SUPPLIER ITEMS ────────────────────────────────────────
  createWithSupplierItems: orgProcedure
    .input(
      z.object({
        item: itemBaseSchema,
        supplierItems: z.array(
          z.object({
            supplierId: z.string(),
            supplierSku: z.string().max(100).optional(),
            supplierName: z.string().max(255).optional(),
            basePrice: decimalSchema,
            currency: currencyCodeSchema.default("BHD"),
            leadTimeDays: z.number().int().min(0).optional(),
            minOrderQty: decimalSchema.optional(),
            notes: z.string().max(5000).optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, "item:create", "Item");

      const orgId = ctx.user.organizationId;
      const { item: itemInput, supplierItems: supplierItemInputs } = input;

      // SKU uniqueness within org
      const existingSku = await ctx.db.item.findFirst({
        where: { sku: itemInput.sku, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      if (existingSku) {
        throw new ConflictError(`SKU "${itemInput.sku}" is already in use.`);
      }

      // Validate all suppliers exist
      const supplierIds = [
        ...new Set(supplierItemInputs.map((si) => si.supplierId)),
      ];
      const suppliers = await ctx.db.supplier.findMany({
        where: {
          id: { in: supplierIds },
          organizationId: orgId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (suppliers.length !== supplierIds.length) {
        const found = new Set(suppliers.map((s) => s.id));
        const missing = supplierIds.filter((id) => !found.has(id));
        throw new NotFoundError("Supplier", missing.join(", "));
      }

      // Check for duplicate supplier+item pairs in the input
      const seenPairs = new Set<string>();
      for (const si of supplierItemInputs) {
        const key = `${si.supplierId}`;
        if (seenPairs.has(key)) {
          throw new ConflictError(
            `Supplier "${si.supplierId}" appears multiple times. Each supplier can only have one price per item.`,
          );
        }
        seenPairs.add(key);
      }

      const { bundleLines, ...itemData } = itemInput;

      const result = await ctx.db.$transaction(async (tx) => {
        // 1. Create the item
        const createdItem = await tx.item.create({
          data: {
            ...itemData,
            organizationId: orgId,
            createdById: ctx.user.id,
          },
        });

        // Create bundle lines if present
        if (bundleLines && bundleLines.length > 0) {
          await tx.bundleLine.createMany({
            data: bundleLines.map((bl) => ({
              bundleItemId: createdItem.id,
              componentItemId: bl.componentItemId,
              quantity: bl.quantity,
              organizationId: orgId,
            })),
          });
        }

        await writeAuditLog(
          {
            entityType: "Item",
            entityId: createdItem.id,
            action: "CREATE",
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        // 2. Check for duplicate supplier+item pairs in DB
        for (const si of supplierItemInputs) {
          const alreadyExists = await tx.supplierItem.findFirst({
            where: {
              supplierId: si.supplierId,
              itemId: createdItem.id,
              deletedAt: null,
            },
            select: { id: true },
          });
          if (alreadyExists) {
            throw new ConflictError(
              `This supplier already has a price for this item.`,
            );
          }
        }

        // 3. Create supplier items
        const createdSupplierItems = await tx.supplierItem.createMany({
          data: supplierItemInputs.map((si) => ({
            supplierId: si.supplierId,
            itemId: createdItem.id,
            supplierSku: si.supplierSku,
            supplierName: si.supplierName,
            basePrice: si.basePrice,
            currency: si.currency,
            leadTimeDays: si.leadTimeDays,
            minOrderQty: si.minOrderQty ?? 1,
            notes: si.notes,
            organizationId: orgId,
          })),
        });

        // Audit log each supplier item
        for (const si of supplierItemInputs) {
          await writeAuditLog(
            {
              entityType: "SupplierItem",
              entityId: `${createdItem.id}:${si.supplierId}`,
              action: "CREATE",
              organizationId: orgId,
              userId: ctx.user.id,
              ipAddress: ctx.ipAddress,
            },
            tx,
          );
        }

        return {
          item: createdItem,
          supplierItemsCount: createdSupplierItems.count,
        };
      });

      return result;
    }),
});
