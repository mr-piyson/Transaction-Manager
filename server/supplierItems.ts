import { z } from 'zod';
import { protectedProcedure, t } from '@/lib/trpc/server';
import { TRPCError } from '@trpc/server';
import db from '@/lib/db';
import { toSmallestUnit, type CurrencyCode } from '@/lib/utils';

export const inventoryRouter = t.router({
  getInventory: protectedProcedure.query(async () => {
    try {
      return await db.supplierItem.findMany({
        include: { stockItem: true, supplier: true },
      });
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch inventory',
      });
    }
  }),

  getInventoryBySupplier: protectedProcedure
    .input(z.object({ supplierId: z.string() }))
    .query(async ({ input }) => {
      try {
        return await db.supplierItem.findMany({
          where: { supplierId: input.supplierId },
          include: { item: true },
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch supplier items',
        });
      }
    }),

  getInventoryById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      try {
        const item = await db.supplierItem.findUnique({
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

  createInventoryItem: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2),
        code: z.string().min(3),
        basePrice: z.coerce.number().min(0),
        description: z.string().nullish(),
        image: z.string().nullish(),
        itemId: z.string().optional(),
        supplierId: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        if (!ctx.user.organizationId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'User is not associated with an organization',
          });
        }

        // Fetch organization currency to correctly convert to cents/fils
        const org = await db.organization.findUnique({
          where: { id: ctx.user.organizationId },
          select: { currency: true },
        });

        const currency = (org?.currency || 'BHD') as CurrencyCode;

        return {};
      } catch (error) {
        console.error('Error in createInventoryItem:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create inventory item',
          cause: error,
        });
      }
    }),

  updateInventoryItem: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().optional(),
          code: z.string().optional().nullable(),
          basePrice: z.coerce.number().optional(),
          description: z.string().nullish(),
          image: z.string().nullish(),
          stockItemId: z.string().optional(),
        }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const updateData: any = { ...input.data };

        // Convert prices to cents if they are being updated
        if (input.data.basePrice !== undefined) {
          if (!ctx.user.organizationId) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'User is not associated with an organization',
            });
          }

          const org = await db.organization.findUnique({
            where: { id: ctx.user.organizationId },
            select: { currency: true },
          });
          const currency = (org?.currency || 'BHD') as CurrencyCode;

          updateData.basePrice = toSmallestUnit(input.data.basePrice, currency);
        }

        return await db.supplierItem.update({
          where: { id: input.id },
          data: updateData,
        });
      } catch (error) {
        console.error('Error in updateInventoryItem:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update inventory item',
          cause: error,
        });
      }
    }),

  deleteInventoryItem: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {
        return await db.supplierItem.delete({
          where: { id: input.id },
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete inventory item',
        });
      }
    }),
  uploadImage: t.procedure.input(z.instanceof(FormData)).mutation(async ({ input }) => {
    try {
      const file = input.get('file') as File;

      if (!file) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No file uploaded',
        });
      }

      // Convert file to Buffer for processing or saving
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      console.log(`Received file: ${file.name}, size: ${file.size} bytes`);

      // Example: Save to disk, S3, or Cloudinary
      // const imageUrl = await saveImage(buffer);

      return { success: true, name: file.name };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to upload image',
      });
    }
  }),

  deleteImage: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {} catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete image',
        });
      }
    }),
});
