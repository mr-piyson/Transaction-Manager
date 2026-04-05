import { z } from 'zod';
import { authed, t } from '@/trpc/server';
import { TRPCError } from '@trpc/server';
import db from '@/lib/db';

export const inventoryRouter = t.router({
  getInventory: authed.query(async () => {
    try {
      return await db.inventoryItem.findMany({});
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch inventory',
      });
    }
  }),

  getInventoryById: authed.input(z.object({ id: z.number() })).query(async ({ input }) => {
    try {
      const item = await db.inventoryItem.findUnique({
        where: { id: input.id },
      });
      if (!item) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Inventory item not found',
        });
      }
      return item;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch inventory item',
      });
    }
  }),

  createInventoryItem: authed
    .input(
      z.object({
        name: z.string(),
        code: z.string().optional().nullable(),
        purchasePrice: z.number(),
        salesPrice: z.number(),
        description: z.string().optional().nullable(),
        image: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await db.inventoryItem.create({
          data: {
            ...input,
            organizationId: ctx.user.organizationId,
          },
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create inventory item',
        });
      }
    }),

  updateInventoryItem: authed
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          name: z.string().optional(),
          code: z.string().optional().nullable(),
          purchasePrice: z.number().optional(),
          salesPrice: z.number().optional(),
          description: z.string().optional().nullable(),
          image: z.string().optional().nullable(),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        return await db.inventoryItem.update({
          where: { id: input.id },
          data: input.data,
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update inventory item',
        });
      }
    }),

  deleteInventoryItem: authed.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    try {
      return await db.inventoryItem.delete({
        where: { id: input.id },
      });
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete inventory item',
      });
    }
  }),
});
