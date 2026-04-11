import { z } from 'zod';
import { protectedProcedure, t } from '@/lib/trpc/server';
import { TRPCError } from '@trpc/server';
import db from '@/lib/db';

export const warehouseRouter = t.router({
  getWarehouses: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await db.warehouse.findMany({
        where: { organizationId: ctx.user.organizationId },
        include: {
          _count: {
            select: { inventory: true },
          },
        },
      });
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch warehouses',
      });
    }
  }),

  getWarehouseById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        const warehouse = await db.warehouse.findUnique({
          where: { id: input.id },
          include: {
            inventory: {
              include: { stockItem: true },
            },
          },
        });

        if (!warehouse || warehouse.organizationId !== ctx.user.organizationId) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Warehouse not found',
          });
        }

        return warehouse;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch warehouse',
        });
      }
    }),

  createWarehouse: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2),
        address: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await db.warehouse.create({
          data: {
            ...input,
            organizationId: ctx.user.organizationId,
          },
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create warehouse',
        });
      }
    }),

  updateWarehouse: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          name: z.string().optional(),
          address: z.string().optional(),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        return await db.warehouse.update({
          where: { id: input.id },
          data: input.data,
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update warehouse',
        });
      }
    }),

  deleteWarehouse: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        return await db.warehouse.delete({
          where: { id: input.id },
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete warehouse',
        });
      }
    }),
});
