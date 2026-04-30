/**
 * warehouses.ts
 * Warehouse management — create, update, soft-delete.
 */

import { z } from 'zod';
import { protectedProcedure, adminProcedure, t } from '@/lib/trpc/server';
import { TRPCError } from '@trpc/server';
import { assertOwnership, requireOrgId } from './_shared';

const warehouseInput = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export const warehouseRouter = t.router({
  list: protectedProcedure.input(z.object()).query(async ({ ctx }) => {
    const orgId = requireOrgId(ctx.organizationId);

    return ctx.prisma.warehouse.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        address: true,
        isDefault: true,
        _count: { select: { stock: true } },
      },
    });
  }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const orgId = requireOrgId(ctx.organizationId);

    const warehouse = await ctx.prisma.warehouse.findUnique({
      where: { id: input.id },
      include: {
        stock: {
          where: { item: { deletedAt: null } },
          include: {
            item: {
              select: { id: true, name: true, sku: true, unit: true, minStock: true },
            },
          },
          orderBy: { item: { name: 'asc' } },
        },
      },
    });

    assertOwnership(warehouse, orgId, 'Warehouse');
    return warehouse;
  }),

  create: adminProcedure.input(warehouseInput).mutation(async ({ ctx, input }) => {
    const orgId = requireOrgId(ctx.organizationId);

    if (input.isDefault) {
      await ctx.prisma.warehouse.updateMany({
        where: { organizationId: orgId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return ctx.prisma.warehouse.create({
      data: { ...input, organizationId: orgId },
    });
  }),

  update: adminProcedure
    .input(z.object({ id: z.string() }).merge(warehouseInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);
      const { id, isDefault, ...rest } = input;

      const existing = await ctx.prisma.warehouse.findUnique({
        where: { id },
        select: { organizationId: true },
      });
      assertOwnership(existing, orgId, 'Warehouse');

      if (isDefault) {
        await ctx.prisma.warehouse.updateMany({
          where: { organizationId: orgId, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }

      return ctx.prisma.warehouse.update({
        where: { id },
        data: { ...rest, ...(isDefault !== undefined && { isDefault }) },
      });
    }),

  delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const orgId = requireOrgId(ctx.organizationId);

    const existing = await ctx.prisma.warehouse.findUnique({
      where: { id: input.id },
      select: {
        organizationId: true,
        isDefault: true,
        stock: { select: { quantity: true } },
      },
    });
    assertOwnership(existing, orgId, 'Warehouse');

    if (!existing || existing.isDefault) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot delete the default warehouse. Set another as default first.',
      });
    }

    const totalStock = existing.stock.reduce((sum, s) => sum + s.quantity, 0);
    if (totalStock > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot delete warehouse with ${totalStock} units in stock. Transfer or adjust stock first.`,
      });
    }

    return ctx.prisma.warehouse.update({
      where: { id: input.id },
      data: { deletedAt: new Date() },
    });
  }),

  /** Get the default warehouse for the org — used as fallback in invoice/PO flows. */
  getDefault: protectedProcedure.query(async ({ ctx }) => {
    const orgId = requireOrgId(ctx.organizationId);

    const warehouse = await ctx.prisma.warehouse.findFirst({
      where: { organizationId: orgId, isDefault: true, deletedAt: null },
      select: { id: true, name: true },
    });

    if (!warehouse) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No default warehouse configured. Please create a warehouse first.',
      });
    }

    return warehouse;
  }),
});
