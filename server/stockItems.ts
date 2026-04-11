import { z } from 'zod';
import { protectedProcedure, t } from '@/lib/trpc/server';
import { TRPCError } from '@trpc/server';
import db from '@/lib/db';

export const stockItemRouter = t.router({
  getStockItems: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await db.stockItem.findMany({
        where: { organizationId: ctx.user.organizationId },
        include: {
          category: true,
          stockEntries: {
            include: { warehouse: true },
          },
          _count: {
            select: { stockEntries: true, supplierItems: true },
          },
        },
      });
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch stock items',
      });
    }
  }),

  getStockItemById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        const item = await db.stockItem.findUnique({
          where: { id: input.id },
          include: {
            category: true,
            supplierItems: {
              include: { supplier: true },
            },
            stockEntries: {
              include: { warehouse: true },
            },
          },
        });

        if (!item || item.organizationId !== ctx.user.organizationId) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Stock item not found',
          });
        }

        return item;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch stock item',
        });
      }
    }),

  createStockItem: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2),
        sku: z.string().min(3),
        type: z.enum(['PRODUCT', 'SERVICE']),
        description: z.string().optional(),
        barcode: z.string().optional(),
        unit: z.string().default('pcs'),
        purchasePrice: z.number().int().default(0),
        salesPrice: z.number().int().default(0),
        minStock: z.number().int().default(0),
        categoryId: z.number().optional(),
        image: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await db.stockItem.create({
          data: {
            ...input,
            organizationId: ctx.user.organizationId,
          },
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create stock item',
        });
      }
    }),

  updateStockItem: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          name: z.string().optional(),
          sku: z.string().optional(),
          type: z.enum(['PRODUCT', 'SERVICE']).optional(),
          description: z.string().optional(),
          barcode: z.string().optional(),
          unit: z.string().optional(),
          purchasePrice: z.number().int().optional(),
          salesPrice: z.number().int().optional(),
          minStock: z.number().int().optional(),
          categoryId: z.number().optional(),
          image: z.string().optional(),
        }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await db.stockItem.update({
          where: { id: input.id },
          data: input.data,
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update stock item',
        });
      }
    }),

  deleteStockItem: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        return await db.stockItem.delete({
          where: { id: input.id },
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete stock item',
        });
      }
    }),
});
