import { z } from 'zod';
import { protectedProcedure, t } from '@/lib/trpc/server';
import { TRPCError } from '@trpc/server';
import db from '@/lib/db';

export const supplierRouter = t.router({
  getSuppliers: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await db.supplier.findMany({
        where: { organizationId: ctx.user.organizationId },
        include: {
          _count: {
            select: { supplierItems: true, purchaseOrders: true },
          },
        },
      });
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch suppliers',
      });
    }
  }),

  getSupplierById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        const supplier = await db.supplier.findUnique({
          where: { id: input.id },
          include: {
            supplierItems: true,
            purchaseOrders: {
              take: 10,
              orderBy: { date: 'desc' },
            },
          },
        });

        if (!supplier || supplier.organizationId !== ctx.user.organizationId) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Supplier not found',
          });
        }

        return supplier;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch supplier',
        });
      }
    }),

  createSupplier: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2),
        phone: z.string(),
        address: z.string(),
        email: z.string().email().optional().or(z.literal('')),
        contactName: z.string().optional(),
        website: z.string().optional(),
        taxId: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await db.supplier.create({
          data: {
            ...input,
            organizationId: ctx.user.organizationId,
          },
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create supplier',
        });
      }
    }),

  updateSupplier: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          name: z.string().optional(),
          phone: z.string().optional(),
          address: z.string().optional(),
          email: z.string().email().optional().or(z.literal('')),
          contactName: z.string().optional(),
          website: z.string().optional(),
          taxId: z.string().optional(),
          notes: z.string().optional(),
        }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await db.supplier.update({
          where: { id: input.id },
          data: input.data,
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update supplier',
        });
      }
    }),

  deleteSupplier: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        return await db.supplier.delete({
          where: { id: input.id },
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete supplier',
        });
      }
    }),

  getProvidedItems: protectedProcedure
    .input(z.object({ supplierId: z.number() }))
    .query(async ({ input }) => {
      try {
        return await db.supplierItem.findMany({
          where: { supplierId: input.supplierId },
          include: { stockItem: true },
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch provided items',
        });
      }
    }),
});
