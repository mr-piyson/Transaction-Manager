/**
 * stock.ts
 * Stock management: movements, manual adjustments, warehouse transfers, valuation.
 */

import { z } from 'zod';
import { protectedProcedure, adminProcedure, t } from '@/lib/trpc/server';
import { TRPCError } from '@trpc/server';
import { assertOwnership, paginationInput, requireOrgId } from './_shared';

export const stockRouter = t.router({
  // -------------------------------------------------------------------------
  // Current stock levels (per item, all warehouses)
  // -------------------------------------------------------------------------
  levels: protectedProcedure
    .input(
      paginationInput.extend({
        warehouseId: z.string().optional(),
        itemId: z.string().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);
      const { page, pageSize, warehouseId, itemId, search } = input;

      const where: any = {
        organizationId: orgId,
        item: { deletedAt: null, type: 'PRODUCT' },
        ...(warehouseId && { warehouseId }),
        ...(itemId && { itemId }),
        ...(search && {
          item: {
            deletedAt: null,
            type: 'PRODUCT',
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
            ],
          },
        }),
      };

      const [items, total] = await ctx.prisma.$transaction([
        ctx.prisma.stock.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { item: { name: 'asc' } },
          include: {
            item: {
              select: {
                id: true,
                name: true,
                sku: true,
                unit: true,
                minStock: true,
                purchasePrice: true,
              },
            },
            warehouse: { select: { id: true, name: true } },
          },
        }),
        ctx.prisma.stock.count({ where }),
      ]);

      return {
        items: items.map((s) => ({
          ...s,
          isBelowMin: s.quantity < s.item.minStock,
        })),
        total,
        page,
        pageSize,
      };
    }),

  // -------------------------------------------------------------------------
  // Movement history for an item or warehouse
  // -------------------------------------------------------------------------
  movements: protectedProcedure
    .input(
      paginationInput.extend({
        itemId: z.string().optional(),
        warehouseId: z.string().optional(),
        type: z
          .enum([
            'PURCHASE_INBOUND',
            'SALE_OUTBOUND',
            'RETURN_INBOUND',
            'RETURN_OUTBOUND',
            'ADJUSTMENT_UP',
            'ADJUSTMENT_DOWN',
            'TRANSFER',
          ])
          .optional(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);
      const { page, pageSize, itemId, warehouseId, type, from, to } = input;

      const where: any = {
        organizationId: orgId,
        ...(itemId && { itemId }),
        ...(type && { type }),
        ...(warehouseId && {
          OR: [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }],
        }),
        ...(from || to
          ? {
              createdAt: {
                ...(from && { gte: from }),
                ...(to && { lte: to }),
              },
            }
          : {}),
      };

      const [movements, total] = await ctx.prisma.$transaction([
        ctx.prisma.stockMovement.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            item: { select: { id: true, name: true, sku: true, unit: true } },
            fromWarehouse: { select: { id: true, name: true } },
            toWarehouse: { select: { id: true, name: true } },
            user: { select: { id: true, name: true } },
          },
        }),
        ctx.prisma.stockMovement.count({ where }),
      ]);

      return { movements, total, page, pageSize };
    }),

  // -------------------------------------------------------------------------
  // Manual adjustment (ADMIN only — ADJUSTMENT_UP / ADJUSTMENT_DOWN)
  // -------------------------------------------------------------------------
  adjust: adminProcedure
    .input(
      z.object({
        itemId: z.string(),
        warehouseId: z.string(),
        adjustment: z
          .number()
          .int()
          .refine((n) => n !== 0, 'Adjustment cannot be zero'),
        reason: z.string().min(1, 'Reason is required for manual adjustments'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      // Verify ownership
      const [item, warehouse] = await Promise.all([
        ctx.prisma.item.findUnique({
          where: { id: input.itemId },
          select: { organizationId: true, name: true },
        }),
        ctx.prisma.warehouse.findUnique({
          where: { id: input.warehouseId },
          select: { organizationId: true },
        }),
      ]);
      assertOwnership(item, orgId, 'Item');
      assertOwnership(warehouse, orgId, 'Warehouse');

      const type = input.adjustment > 0 ? 'ADJUSTMENT_UP' : 'ADJUSTMENT_DOWN';
      const absQty = Math.abs(input.adjustment);

      return ctx.prisma.$transaction(async (tx) => {
        // Check we won't go negative
        if (input.adjustment < 0) {
          const stock = await tx.stock.findUnique({
            where: { itemId_warehouseId: { itemId: input.itemId, warehouseId: input.warehouseId } },
            select: { quantity: true },
          });
          const current = stock?.quantity ?? 0;
          if (current + input.adjustment < 0) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Adjustment would result in negative stock. Current: ${current}, adjustment: ${input.adjustment}`,
            });
          }
        }

        // Upsert stock row
        await tx.stock.upsert({
          where: { itemId_warehouseId: { itemId: input.itemId, warehouseId: input.warehouseId } },
          create: {
            itemId: input.itemId,
            warehouseId: input.warehouseId,
            quantity: Math.max(0, input.adjustment),
            organizationId: orgId,
          },
          update: { quantity: { increment: input.adjustment } },
        });

        // Record movement
        await tx.stockMovement.create({
          data: {
            type,
            quantity: input.adjustment,
            itemId: input.itemId,
            ...(type === 'ADJUSTMENT_UP'
              ? { toWarehouseId: input.warehouseId }
              : { fromWarehouseId: input.warehouseId }),
            userId: ctx.user.id,
            organizationId: orgId,
            notes: input.reason,
          },
        });
      });
    }),

  // -------------------------------------------------------------------------
  // Transfer between warehouses (ADMIN only)
  // -------------------------------------------------------------------------
  transfer: adminProcedure
    .input(
      z.object({
        itemId: z.string(),
        fromWarehouseId: z.string(),
        toWarehouseId: z.string(),
        quantity: z.number().int().min(1),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      if (input.fromWarehouseId === input.toWarehouseId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Source and destination warehouses must differ',
        });
      }

      const [item, fromWH, toWH] = await Promise.all([
        ctx.prisma.item.findUnique({
          where: { id: input.itemId },
          select: { organizationId: true, name: true },
        }),
        ctx.prisma.warehouse.findUnique({
          where: { id: input.fromWarehouseId },
          select: { organizationId: true },
        }),
        ctx.prisma.warehouse.findUnique({
          where: { id: input.toWarehouseId },
          select: { organizationId: true },
        }),
      ]);
      assertOwnership(item, orgId, 'Item');
      assertOwnership(fromWH, orgId, 'Source Warehouse');
      assertOwnership(toWH, orgId, 'Destination Warehouse');

      return ctx.prisma.$transaction(async (tx) => {
        // Check source stock
        const sourceStock = await tx.stock.findUnique({
          where: {
            itemId_warehouseId: { itemId: input.itemId, warehouseId: input.fromWarehouseId },
          },
          select: { quantity: true },
        });

        if (!sourceStock || sourceStock.quantity < input.quantity) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Insufficient stock in source warehouse. Available: ${sourceStock?.quantity ?? 0}`,
          });
        }

        // Deduct from source
        await tx.stock.update({
          where: {
            itemId_warehouseId: { itemId: input.itemId, warehouseId: input.fromWarehouseId },
          },
          data: { quantity: { decrement: input.quantity } },
        });

        // Add to destination
        await tx.stock.upsert({
          where: { itemId_warehouseId: { itemId: input.itemId, warehouseId: input.toWarehouseId } },
          create: {
            itemId: input.itemId,
            warehouseId: input.toWarehouseId,
            quantity: input.quantity,
            organizationId: orgId,
          },
          update: { quantity: { increment: input.quantity } },
        });

        // Single movement row for transfer
        await tx.stockMovement.create({
          data: {
            type: 'TRANSFER',
            quantity: input.quantity,
            itemId: input.itemId,
            fromWarehouseId: input.fromWarehouseId,
            toWarehouseId: input.toWarehouseId,
            userId: ctx.user.id,
            organizationId: orgId,
            notes: input.notes,
          },
        });
      });
    }),

  // -------------------------------------------------------------------------
  // Stock valuation report (avg cost × quantity per item per warehouse)
  // -------------------------------------------------------------------------
  valuation: protectedProcedure
    .input(z.object({ warehouseId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      const stockRows = await ctx.prisma.stock.findMany({
        where: {
          organizationId: orgId,
          item: { deletedAt: null, type: 'PRODUCT' },
          ...(input.warehouseId && { warehouseId: input.warehouseId }),
        },
        include: {
          item: { select: { id: true, name: true, sku: true, purchasePrice: true } },
          warehouse: { select: { id: true, name: true } },
        },
      });

      let grandTotal = BigInt(0);

      const rows = stockRows.map((s) => {
        const value = BigInt(s.item.purchasePrice) * BigInt(s.quantity);
        grandTotal += value;
        return {
          itemId: s.item.id,
          itemName: s.item.name,
          sku: s.item.sku,
          warehouseId: s.warehouse.id,
          warehouseName: s.warehouse.name,
          quantity: s.quantity,
          unitCost: s.item.purchasePrice,
          totalValue: value,
        };
      });

      return { rows, grandTotal };
    }),
});
