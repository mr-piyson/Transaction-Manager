/**
 * src/server/modules/items/router.ts
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

import { z } from 'zod';
import { ConflictError, NotFoundError } from '@/lib/error';
import { assertCan, orgProcedure, router } from '@/lib/trpc/context';
import {
  decimalSchema,
  offsetPaginationSchema,
  paginatedResponse,
  sortOrderSchema,
  toPrismaPage,
} from '@/lib/validations';
import { writeAuditLog } from './audit.service';

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const itemBaseSchema = z.object({
  type: z.enum(['PRODUCT', 'SERVICE', 'BUNDLE']).default('PRODUCT'),
  sku: z.string().min(1).max(100),
  barcode: z.string().max(100).optional(),
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  unit: z.string().max(50).default('pcs'),
  isSaleable: z.boolean().default(true),
  isPurchasable: z.boolean().default(true),
  purchasePrice: decimalSchema.optional(),
  salesPrice: decimalSchema.optional(),
  minStock: z.number().int().min(0).default(0),
  reorderPoint: z.number().int().min(0).default(0),
  reorderQty: z.number().int().min(0).default(0),
  categoryId: z.string().cuid().optional(),
  taxRateId: z.string().cuid().optional(),
  revenueAccountId: z.string().cuid().optional(),
  cogsAccountId: z.string().cuid().optional(),
  inventoryAccountId: z.string().cuid().optional(),
});

const createItemSchema = itemBaseSchema;
const updateItemSchema = itemBaseSchema.partial().extend({
  id: z.string(),
});

const listItemsSchema = z.object({
  ...offsetPaginationSchema.shape,
  search: z.string().optional(),
  type: z.enum(['PRODUCT', 'SERVICE', 'BUNDLE']).optional(),
  categoryId: z.string().cuid().optional(),
  isActive: z.boolean().optional(),
  isSaleable: z.boolean().optional(),
  lowStock: z.boolean().optional(), // Filter items below reorderPoint
  sortBy: z.enum(['name', 'sku', 'salesPrice', 'createdAt']).default('name'),
  sortOrder: sortOrderSchema,
  withStock: z.boolean().default(false), // Include aggregated stock levels
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const itemsRouter = router({
  // ── LIST ──────────────────────────────────────────────────────────────────
  list: orgProcedure.input(listItemsSchema).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'item:read', 'Item');

    const {
      search,
      type,
      categoryId,
      isActive,
      isSaleable,
      lowStock,
      sortBy,
      sortOrder,
      withStock,
      ...pagination
    } = input;
    const { skip, take } = toPrismaPage(pagination);
    const orgId = ctx.user.organizationId;

    const where = {
      organizationId: orgId,
      deletedAt: null,
      ...(type ? { type } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(isSaleable !== undefined ? { isSaleable } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { sku: { contains: search, mode: 'insensitive' as const } },
              { barcode: { contains: search, mode: 'insensitive' as const } },
              {
                description: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await ctx.db.$transaction([
      ctx.db.item.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          sku: true,
          barcode: true,
          name: true,
          type: true,
          unit: true,
          salesPrice: true,
          purchasePrice: true,
          averageCost: true,
          minStock: true,
          reorderPoint: true,
          isSaleable: true,
          isPurchasable: true,
          isActive: true,
          category: { select: { id: true, name: true, color: true } },
          taxRate: { select: { id: true, name: true, rate: true } },
          // Aggregate stock across all warehouses if requested
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
      const stockRows = 'stock' in item ? item.stock : [];
      const totalStock = stockRows.reduce((sum, s) => sum + Number(s.quantity), 0);
      return {
        ...item,
        totalStock: withStock ? totalStock : undefined,
        isLowStock: withStock ? totalStock <= item.reorderPoint : undefined,
      };
    });

    // Apply lowStock filter post-aggregation (can't do in Prisma directly)
    const filtered = lowStock && withStock ? enriched.filter((i) => i.isLowStock) : enriched;

    return paginatedResponse(filtered, total, pagination);
  }),

  // ── GET BY ID ─────────────────────────────────────────────────────────────
  byId: orgProcedure
    .input(z.object({ id: z.string().cuid(), withStock: z.boolean().default(true) }))
    .query(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'item:read', 'Item');

      const item = await ctx.db.item.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.user.organizationId,
          deletedAt: null,
        },
        include: {
          category: true,
          taxRate: true,
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

      if (!item) throw new NotFoundError('Item', input.id);
      return item;
    }),

  // ── GET BY SKU ────────────────────────────────────────────────────────────
  bySku: orgProcedure.input(z.object({ sku: z.string() })).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'item:read', 'Item');

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

    if (!item) throw new NotFoundError('Item (SKU)', input.sku);
    return item;
  }),

  // ── RESOLVE PRICE (for invoice line creation) ─────────────────────────────
  resolvePrice: orgProcedure
    .input(
      z.object({
        itemId: z.string().cuid(),
        customerId: z.string().cuid().optional(),
        quantity: z.number().positive().default(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'item:read', 'Item');

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
          purchasePrice: true,
          taxRateId: true,
          taxRate: { select: { rate: true, name: true } },
        },
      });

      if (!item) throw new NotFoundError('Item', input.itemId);

      let resolvedPrice = item.salesPrice;
      let priceSource: 'price_list' | 'item_default' = 'item_default';

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
                  orderBy: { minQty: 'desc' },
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
          priceSource = 'price_list';
        }
      }

      return {
        itemId: input.itemId,
        unitPrice: resolvedPrice,
        priceSource,
        taxRateId: item.taxRateId,
        taxRate: item.taxRate,
        purchasePrice: item.purchasePrice,
      };
    }),

  // ── CREATE ────────────────────────────────────────────────────────────────
  create: orgProcedure.input(createItemSchema).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'item:create', 'Item');

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

    const item = await ctx.db.$transaction(async (tx) => {
      const created = await tx.item.create({
        data: {
          ...input,
          organizationId: ctx.user.organizationId,
          createdById: ctx.user.id,
        },
      });

      await writeAuditLog(
        {
          entityType: 'Item',
          entityId: created.id,
          action: 'CREATE',
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
  update: orgProcedure.input(updateItemSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    const existing = await ctx.db.item.findFirst({
      where: { id, organizationId: ctx.user.organizationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundError('Item', id);

    assertCan(ctx.ability, 'item:update', 'Item', existing as Record<string, unknown>);

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

    return ctx.db.$transaction(async (tx) => {
      const updated = await tx.item.update({
        where: { id },
        data: { ...data, updatedById: ctx.user.id },
      });

      await writeAuditLog(
        {
          entityType: 'Item',
          entityId: id,
          action: 'UPDATE',
          organizationId: ctx.user.organizationId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
        },
        tx,
      );

      return updated;
    });
  }),

  // ── SOFT DELETE ───────────────────────────────────────────────────────────
  delete: orgProcedure
    .input(z.object({ id: z.string().cuid() }))
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
      if (!existing) throw new NotFoundError('Item', input.id);

      assertCan(ctx.ability, 'item:delete', 'Item', existing as Record<string, unknown>);

      if (existing._count.stock > 0) {
        throw new ConflictError(
          'Cannot delete item: it has stock on hand. Adjust stock to zero first.',
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
            entityType: 'Item',
            entityId: input.id,
            action: 'DELETE',
            organizationId: ctx.user.organizationId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );
      });

      return { success: true };
    }),

  // ── STOCK SUMMARY ─────────────────────────────────────────────────────────
  stockSummary: orgProcedure
    .input(z.object({ itemId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'stock:read', 'Stock');

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
});
