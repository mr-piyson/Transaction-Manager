import { z } from 'zod';
import { authed, t } from '@/lib/trpc/server';
import { TRPCError } from '@trpc/server';
import db from '@/lib/db';
import { getFileExtension, saveImage } from '@/lib/files';
import path from 'path';
import fs from 'fs/promises';

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

  getInventoryById: authed
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
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

  /**
   * NOTE: For full file uploads (image), it's often better to keep the standard POST endpoint
   * or use a pre-signed URL approach. However, for small images/logic, we'll keep the
   * existing POST endpoint for inventory creation if it handles multipart/form-data.
   * tRPC doesn't natively handle multipart/form-data as easily as standard Next.js routes.
   * I will implement the GET/DELETE/Update here, but maybe leave POST to the existing route
   * if it's heavily reliant on FormData. Or I can use a base64 approach but that's less ideal.
   */

  deleteInventory: authed
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const item = await db.inventoryItem.delete({
          where: { id: input.id },
        });
        if (item.image) {
          try {
            await fs.unlink(path.join(process.cwd(), 'public', 'uploads', item.image));
          } catch (e) {
            console.error('Failed to delete image file', e);
          }
        }
        return item;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete inventory item',
        });
      }
    }),
});
