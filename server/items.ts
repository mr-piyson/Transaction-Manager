/**
 * items.ts
 * Item catalogue (products + services) and item categories.
 */

import { z } from 'zod';
import { protectedProcedure, adminProcedure, t } from '@/lib/trpc/server';
import { TRPCError } from '@trpc/server';
import { assertOwnership, paginationInput, requireOrgId } from './_shared';

// ---------------------------------------------------------------------------
// Shared input schemas
// ---------------------------------------------------------------------------

const categoryInput = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const itemInput = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  type: z.enum(['PRODUCT', 'SERVICE']),
  description: z.string().optional(),
  unit: z.string().optional(),
  categoryId: z.string().optional(),
  taxRateId: z.string().optional(),
  purchasePrice: z.number().int().min(0).default(0), // fils
  salesPrice: z.number().int().min(0).default(0), // fils
  minStock: z.number().int().min(0).default(0),
  isSaleable: z.boolean().default(true),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const itemRouter = t.router({
  // =========================================================================
  // CATEGORIES
  // =========================================================================

  listCategories: protectedProcedure.query(async ({ ctx }) => {
    const orgId = requireOrgId(ctx.organizationId);

    return ctx.prisma.itemCategory.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        _count: { select: { items: true } },
      },
    });
  }),

  createCategory: adminProcedure.input(categoryInput).mutation(async ({ ctx, input }) => {
    const orgId = requireOrgId(ctx.organizationId);

    return ctx.prisma.itemCategory.create({
      data: { ...input, organizationId: orgId },
    });
  }),

  updateCategory: adminProcedure
    .input(z.object({ id: z.string() }).merge(categoryInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);
      const { id, ...rest } = input;

      const existing = await ctx.prisma.itemCategory.findUnique({
        where: { id },
        select: { organizationId: true },
      });
      assertOwnership(existing, orgId, 'Category');

      return ctx.prisma.itemCategory.update({ where: { id }, data: rest });
    }),

  deleteCategory: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      const existing = await ctx.prisma.itemCategory.findUnique({
        where: { id: input.id },
        select: { organizationId: true, _count: { select: { items: true } } },
      });
      assertOwnership(existing, orgId, 'Category');

      if (!existing || existing._count.items > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot delete category with ${existing?._count.items} item(s). Reassign items first.`,
        });
      }

      return ctx.prisma.itemCategory.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });
    }),

  // =========================================================================
  // TAX RATES
  // =========================================================================

  listTaxRates: protectedProcedure.query(async ({ ctx }) => {
    const orgId = requireOrgId(ctx.organizationId);

    return ctx.prisma.taxRate.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { rate: 'asc' },
      select: { id: true, name: true, rate: true, isDefault: true },
    });
  }),

  upsertTaxRate: adminProcedure
    .input(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        rate: z.number().min(0).max(100), // percentage, e.g. 10 for 10%
        isDefault: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);
      const { id, isDefault, ...rest } = input;

      // If setting as default, clear existing default first
      if (isDefault) {
        await ctx.prisma.taxRate.updateMany({
          where: { organizationId: orgId, isDefault: true },
          data: { isDefault: false },
        });
      }

      if (id) {
        const existing = await ctx.prisma.taxRate.findUnique({
          where: { id },
          select: { organizationId: true },
        });
        assertOwnership(existing, orgId, 'TaxRate');

        return ctx.prisma.taxRate.update({
          where: { id },
          data: { ...rest, isDefault },
        });
      }

      return ctx.prisma.taxRate.create({
        data: { ...rest, isDefault, organizationId: orgId },
      });
    }),

  // =========================================================================
  // ITEMS
  // =========================================================================

  list: protectedProcedure
    .input(
      paginationInput.extend({
        search: z.string().optional(),
        type: z.enum(['PRODUCT', 'SERVICE']).optional(),
        categoryId: z.string().optional(),
        isSaleable: z.boolean().optional(),
        lowStock: z.boolean().optional(), // filter items below minStock
      }),
    )
    .query(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);
      const { page, pageSize, search, type, categoryId, isSaleable, lowStock } = input;

      const where: any = {
        organizationId: orgId,
        deletedAt: null,
        ...(type && { type }),
        ...(categoryId && { categoryId }),
        ...(isSaleable !== undefined && { isSaleable }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }),
      };

      // Low-stock filter: items where any stock row < minStock
      // We do this via a subquery approach using a 'some' relation filter
      if (lowStock) {
        where.type = 'PRODUCT';
        where.stock = {
          some: {
            quantity: { lt: ctx.prisma.item.fields.minStock }, // handled below
          },
        };
      }

      const [items, total] = await ctx.prisma.$transaction([
        ctx.prisma.item.findMany({
          where,
          orderBy: { name: 'asc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            name: true,
            sku: true,
            type: true,
            unit: true,
            purchasePrice: true,
            salesPrice: true,
            minStock: true,
            isSaleable: true,
            category: { select: { id: true, name: true } },
            taxRate: { select: { id: true, name: true, rate: true } },
            stock: {
              select: {
                quantity: true,
                warehouse: { select: { id: true, name: true } },
              },
            },
          },
        }),
        ctx.prisma.item.count({ where }),
      ]);

      return { items, total, page, pageSize };
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const orgId = requireOrgId(ctx.organizationId);

    const item = await ctx.prisma.item.findUnique({
      where: { id: input.id },
      include: {
        category: true,
        taxRate: true,
        stock: {
          include: { warehouse: { select: { id: true, name: true } } },
        },
        supplierItems: {
          where: { deletedAt: null, isActive: true },
          include: { supplier: { select: { id: true, name: true } } },
        },
      },
    });

    assertOwnership(item, orgId, 'Item');
    return item;
  }),

  create: protectedProcedure.input(itemInput).mutation(async ({ ctx, input }) => {
    const orgId = requireOrgId(ctx.organizationId);
    const { purchasePrice, salesPrice, ...rest } = input;

    // Ensure SKU is unique within org
    const skuConflict = await ctx.prisma.item.findFirst({
      where: { sku: input.sku, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (skuConflict) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: `SKU "${input.sku}" already exists` });
    }

    return ctx.prisma.item.create({
      data: {
        ...rest,
        purchasePrice: BigInt(purchasePrice),
        salesPrice: BigInt(salesPrice),
        organizationId: orgId,
      },
    });
  }),

  update: protectedProcedure
    .input(z.object({ id: z.string() }).merge(itemInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);
      const { id, purchasePrice, salesPrice, sku, ...rest } = input;

      const existing = await ctx.prisma.item.findUnique({
        where: { id },
        select: { organizationId: true },
      });
      assertOwnership(existing, orgId, 'Item');

      // Check SKU uniqueness if changing SKU
      if (sku) {
        const conflict = await ctx.prisma.item.findFirst({
          where: { sku, organizationId: orgId, deletedAt: null, NOT: { id } },
          select: { id: true },
        });
        if (conflict) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `SKU "${sku}" already exists` });
        }
      }

      return ctx.prisma.item.update({
        where: { id },
        data: {
          ...rest,
          ...(sku && { sku }),
          ...(purchasePrice !== undefined && { purchasePrice: BigInt(purchasePrice) }),
          ...(salesPrice !== undefined && { salesPrice: BigInt(salesPrice) }),
        },
      });
    }),

  /**
   * Confirm the sales price after stock has been received for a new item.
   * Marks the item as saleable once the price is set.
   */
  confirmSalesPrice: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        salesPrice: z.number().int().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      const existing = await ctx.prisma.item.findUnique({
        where: { id: input.id },
        select: { organizationId: true, type: true },
      });
      assertOwnership(existing, orgId, 'Item');

      if (!existing || existing.type !== 'PRODUCT') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only products need a sales price' });
      }

      return ctx.prisma.item.update({
        where: { id: input.id },
        data: { salesPrice: BigInt(input.salesPrice), isSaleable: true },
      });
    }),

  delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const orgId = requireOrgId(ctx.organizationId);

    const existing = await ctx.prisma.item.findUnique({
      where: { id: input.id },
      select: {
        organizationId: true,
        stock: { select: { quantity: true } },
      },
    });
    assertOwnership(existing, orgId, 'Item');

    if (!existing) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: '',
      });
    }

    const totalStock = existing.stock.reduce((sum, s) => sum + s.quantity, 0);
    if (totalStock > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot delete item with ${totalStock} units in stock`,
      });
    }

    return ctx.prisma.item.update({
      where: { id: input.id },
      data: { deletedAt: new Date() },
    });
  }),

  // -------------------------------------------------------------------------
  // Low-stock alert list (for dashboard widget)
  // -------------------------------------------------------------------------
  lowStockAlerts: protectedProcedure.query(async ({ ctx }) => {
    const orgId = requireOrgId(ctx.organizationId);

    // Fetch all PRODUCT items with their stock per warehouse
    const items = await ctx.prisma.item.findMany({
      where: { organizationId: orgId, deletedAt: null, type: 'PRODUCT' },
      select: {
        id: true,
        name: true,
        sku: true,
        minStock: true,
        unit: true,
        stock: {
          include: { warehouse: { select: { id: true, name: true } } },
        },
      },
    });

    // Filter to items where any warehouse is below minStock
    return items
      .flatMap((item) =>
        item.stock
          .filter((s) => s.quantity < item.minStock)
          .map((s) => ({
            itemId: item.id,
            itemName: item.name,
            sku: item.sku,
            unit: item.unit,
            warehouseId: s.warehouse.id,
            warehouseName: s.warehouse.name,
            currentQty: s.quantity,
            minStock: item.minStock,
            shortfall: item.minStock - s.quantity,
          })),
      )
      .sort((a, b) => b.shortfall - a.shortfall);
  }),
});
