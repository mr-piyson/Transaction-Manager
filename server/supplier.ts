/**
 * supplier.router.ts
 * Suppliers + their item price lists (SupplierItem).
 */

import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '@/lib/trpc/server';
import { requireOrgId, assertOwnership, paginationInput } from './_shared';
import { TRPCError } from '@trpc/server';

const supplierInput = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  contactName: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  taxId: z.string().optional(),
  notes: z.string().optional(),
});

export const supplierRouter = router({
  // -------------------------------------------------------------------------
  // List suppliers
  // -------------------------------------------------------------------------
  list: protectedProcedure
    .input(
      paginationInput.extend({
        search: z.string().optional(),
        includeSystem: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);
      const { page, pageSize, search, includeSystem } = input;

      const where = {
        organizationId: orgId,
        deletedAt: null,
        isActive: true,
        ...(!includeSystem && { isSystem: false }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { contactName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const [items, total] = await ctx.prisma.$transaction([
        ctx.prisma.supplier.findMany({
          where,
          orderBy: { name: 'asc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            contactName: true,
            isSystem: true,
            isActive: true,
            _count: { select: { purchaseOrders: true, supplierItems: true } },
          },
        }),
        ctx.prisma.supplier.count({ where }),
      ]);

      return { items, total, page, pageSize };
    }),

  // -------------------------------------------------------------------------
  // Get single supplier with their price list
  // -------------------------------------------------------------------------
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const orgId = requireOrgId(ctx.organizationId);

    const supplier = await ctx.prisma.supplier.findUnique({
      where: { id: input.id },
      include: {
        supplierItems: {
          where: { deletedAt: null, isActive: true },
          include: { item: { select: { id: true, name: true, sku: true, unit: true } } },
          orderBy: { item: { name: 'asc' } },
        },
        _count: { select: { purchaseOrders: true } },
      },
    });

    assertOwnership(supplier, orgId, 'Supplier');
    return supplier;
  }),

  // -------------------------------------------------------------------------
  // Get or create the system "Other" supplier for this org
  // -------------------------------------------------------------------------
  getOrCreateOtherSupplier: protectedProcedure.query(async ({ ctx }) => {
    const orgId = requireOrgId(ctx.organizationId);

    const existing = await ctx.prisma.supplier.findFirst({
      where: { organizationId: orgId, isSystem: true },
      select: { id: true, name: true },
    });

    if (existing) return existing;

    return ctx.prisma.supplier.create({
      data: {
        name: 'Other / Unknown',
        isSystem: true,
        organizationId: orgId,
      },
      select: { id: true, name: true },
    });
  }),

  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------
  create: protectedProcedure.input(supplierInput).mutation(async ({ ctx, input }) => {
    const orgId = requireOrgId(ctx.organizationId);

    return ctx.prisma.supplier.create({
      data: { ...input, organizationId: orgId },
    });
  }),

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------
  update: protectedProcedure
    .input(z.object({ id: z.string() }).merge(supplierInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);
      const { id, ...rest } = input;

      const existing = await ctx.prisma.supplier.findUnique({
        where: { id },
        select: { organizationId: true, isSystem: true },
      });
      assertOwnership(existing, orgId, 'Supplier');

      if (existing?.isSystem) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot modify the system supplier',
        });
      }

      return ctx.prisma.supplier.update({ where: { id }, data: rest });
    }),

  // -------------------------------------------------------------------------
  // Soft delete
  // -------------------------------------------------------------------------
  delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const orgId = requireOrgId(ctx.organizationId);

    const existing = await ctx.prisma.supplier.findUnique({
      where: { id: input.id },
      select: { organizationId: true, isSystem: true },
    });
    assertOwnership(existing, orgId, 'Supplier');

    if (existing?.isSystem) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot delete the system supplier',
      });
    }

    return ctx.prisma.supplier.update({
      where: { id: input.id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }),

  // =========================================================================
  // SUPPLIER ITEMS (price list)
  // =========================================================================

  // -------------------------------------------------------------------------
  // Upsert a supplier price list entry
  // -------------------------------------------------------------------------
  upsertSupplierItem: protectedProcedure
    .input(
      z.object({
        supplierId: z.string(),
        itemId: z.string(),
        supplierSku: z.string().optional(),
        supplierName: z.string().optional(),
        basePrice: z.number().int().min(0), // fils
        leadTimeDays: z.number().int().min(0).optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      // Verify supplier belongs to org
      const supplier = await ctx.prisma.supplier.findUnique({
        where: { id: input.supplierId },
        select: { organizationId: true },
      });
      assertOwnership(supplier, orgId, 'Supplier');

      // Verify item belongs to org
      const item = await ctx.prisma.item.findUnique({
        where: { id: input.itemId },
        select: { organizationId: true },
      });
      assertOwnership(item, orgId, 'Item');

      const { basePrice, ...rest } = input;

      return ctx.prisma.supplierItem.upsert({
        where: {
          supplierId_itemId: {
            supplierId: input.supplierId,
            itemId: input.itemId,
          },
        },
        create: {
          ...rest,
          basePrice: BigInt(basePrice),
          organizationId: orgId,
        },
        update: {
          ...rest,
          basePrice: BigInt(basePrice),
          isActive: true,
          deletedAt: null,
        },
      });
    }),

  // -------------------------------------------------------------------------
  // Remove a supplier item entry (soft delete)
  // -------------------------------------------------------------------------
  removeSupplierItem: adminProcedure
    .input(z.object({ supplierItemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      const si = await ctx.prisma.supplierItem.findUnique({
        where: { id: input.supplierItemId },
        select: { organizationId: true },
      });
      assertOwnership(si, orgId, 'SupplierItem');

      return ctx.prisma.supplierItem.update({
        where: { id: input.supplierItemId },
        data: { deletedAt: new Date(), isActive: false },
      });
    }),
});
