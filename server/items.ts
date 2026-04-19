import { z } from 'zod';
import { protectedProcedure, t } from '@/lib/trpc/server';
import { TRPCError } from '@trpc/server';
import db from '@/lib/db';

export const itemRouter = t.router({
  getItems: protectedProcedure
    .input(
      z.object({
        group: z.enum(['all', 'products', 'services']),
      }),
    )

    .query(async ({ input, ctx }) => {
      try {
        if (input.group === 'products') {
          return await db.item.findMany({
            where: { organizationId: ctx.user.organizationId, AND: { type: 'PRODUCT' } },
            include: {
              category: true,
            },
          });
        } else if (input.group === 'services') {
          return await db.item.findMany({
            where: { organizationId: ctx.user.organizationId, AND: { type: 'SERVICE' } },
            include: {
              category: true,
            },
          });
        } else {
          return await db.item.findMany({
            where: { organizationId: ctx.user.organizationId },
            include: {
              category: true,
            },
          });
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch stock items',
        });
      }
    }),

  getCategories: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await db.itemCategory.findMany({
        where: { organizationId: ctx.user.organizationId },
      });
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch categories',
      });
    }
  }),

  getItemById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const item = await db.item.findUnique({
          where: { id: input.id },
          include: {
            category: true,
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

  createItem: protectedProcedure
    .input(
      z.object({
        description: z.string().optional(),
        minStock: z.coerce.number().default(0).optional(),
        name: z.string().min(2),
        purchasePrice: z.coerce.number().default(0),
        salesPrice: z.coerce.number().default(0),
        type: z.enum(['PRODUCT', 'SERVICE']),
        sku: z.string().min(3),
        unit: z.string().default('pcs').optional(),
        categoryId: z.string().optional(),
        image: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        console.log('Creating item with data:', input);
        return await db.item.create({
          data: {
            name: input.name,
            sku: input.sku,
            type: input.type,
            description: input.description,
            purchasePrice: input.purchasePrice,
            salesPrice: input.salesPrice,
            categoryId: input.categoryId,
            organizationId: ctx.user.organizationId,
          },
        });
      } catch (error) {
        console.error('Error creating item:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create item',
        });
      }
    }),

  updateItem: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().optional(),
          sku: z.string().optional(),
          type: z.enum(['PRODUCT', 'SERVICE']).optional(),
          description: z.string().optional(),
          barcode: z.string().optional(),
          unit: z.string().optional(),
          purchasePrice: z.coerce.number().optional(),
          salesPrice: z.coerce.number().optional(),
          minStock: z.coerce.number().optional(),
          categoryId: z.coerce.string().optional(),
          image: z.string().optional(),
        }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await db.item.update({
          where: { id: input.id },
          data: {
            categoryId: input.data.categoryId,
            description: input.data.description,
            name: input.data.name,
            purchasePrice: input.data.purchasePrice,
            salesPrice: input.data.salesPrice,
            sku: input.data.sku,
            type: input.data.type,
          },
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update stock item',
        });
      }
    }),

  deleteItem: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    try {
      return await db.item.delete({
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
