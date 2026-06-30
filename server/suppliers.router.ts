import { z } from 'zod';
import { ConflictError, NotFoundError } from '@/lib/error';
import { assertCan, orgProcedure, router } from '@/lib/trpc/context';
import {
  currencyCodeSchema,
  decimalSchema,
  offsetPaginationSchema,
  paginatedResponse,
  sortOrderSchema,
  toPrismaPage,
} from '@/lib/validations';
import { writeAuditLog } from './audit.service';

const supplierBaseSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().max(50).optional(),
  phone: z.string().max(50).optional(),
  email: z.email().optional().or(z.literal('')).optional(),
  contactName: z.string().max(255).optional(),
  website: z.string().max(255).optional(),
  taxId: z.string().max(100).optional(),
  crNumber: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
  paymentTermsDays: z.number().int().min(0).max(365).default(30),
  isActive: z.boolean().default(true),
});

const createSupplierSchema = supplierBaseSchema;
const updateSupplierSchema = supplierBaseSchema.partial().extend({
  id: z.string(),
});

const listSuppliersSchema = z.object({
  ...offsetPaginationSchema.shape,
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  includeSystem: z.boolean().default(false),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('name'),
  sortOrder: sortOrderSchema,
});

export const suppliersRouter = router({
  list: orgProcedure.input(listSuppliersSchema).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'po:read', 'all');

    const { search, isActive, includeSystem, sortBy, sortOrder, ...pagination } = input;
    const { skip, take } = toPrismaPage(pagination);
    const orgId = ctx.user.organizationId;

    const where: Record<string, unknown> = {
      organizationId: orgId,
      deletedAt: null,
      ...(isActive !== undefined ? { isActive } : {}),
      ...(includeSystem ? {} : { isSystem: false }),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
              { phone: { contains: search, mode: 'insensitive' as const } },
              { code: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [suppliers, total] = await ctx.db.$transaction([
      ctx.db.supplier.findMany({ where, skip, take, orderBy: { [sortBy]: sortOrder } }),
      ctx.db.supplier.count({ where }),
    ]);

    return paginatedResponse(suppliers, total, pagination);
  }),

  byId: orgProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'po:read', 'all');

    const supplier = await ctx.db.supplier.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId, deletedAt: null },
      include: {
        purchaseOrders: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            serial: true,
            status: true,
            total: true,
            currency: true,
            date: true,
            createdAt: true,
          },
        },
        supplierItems: {
          where: { deletedAt: null },
          take: 20,
          select: {
            id: true,
            supplierSku: true,
            supplierName: true,
            basePrice: true,
            currency: true,
            leadTimeDays: true,
            item: { select: { id: true, name: true, sku: true } },
          },
        },
        _count: { select: { purchaseOrders: true, supplierItems: true } },
      },
    });

    if (!supplier) throw new NotFoundError('Supplier', input.id);
    return supplier;
  }),

  create: orgProcedure.input(createSupplierSchema).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'po:create', 'all');

    if (input.code) {
      const existing = await ctx.db.supplier.findFirst({
        where: { code: input.code, organizationId: ctx.user.organizationId, deletedAt: null },
        select: { id: true },
      });
      if (existing) throw new ConflictError(`Supplier code "${input.code}" is already in use.`);
    }

    return ctx.db.$transaction(async (tx) => {
      const created = await tx.supplier.create({
        data: { ...input, organizationId: ctx.user.organizationId },
      });

      await writeAuditLog(
        {
          entityType: 'Supplier',
          entityId: created.id,
          action: 'CREATE',
          organizationId: ctx.user.organizationId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
        },
        tx,
      );

      return created;
    });
  }),

  update: orgProcedure.input(updateSupplierSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    const existing = await ctx.db.supplier.findFirst({
      where: { id, organizationId: ctx.user.organizationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundError('Supplier', id);

    assertCan(ctx.ability, 'po:update', 'all', existing as Record<string, unknown>);

    if (data.code && data.code !== existing.code) {
      const conflict = await ctx.db.supplier.findFirst({
        where: {
          code: data.code,
          organizationId: ctx.user.organizationId,
          deletedAt: null,
          NOT: { id },
        },
        select: { id: true },
      });
      if (conflict) throw new ConflictError(`Supplier code "${data.code}" is already in use.`);
    }

    return ctx.db.$transaction(async (tx) => {
      const updated = await tx.supplier.update({ where: { id }, data });

      await writeAuditLog(
        {
          entityType: 'Supplier',
          entityId: id,
          action: 'UPDATE',
          organizationId: ctx.user.organizationId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
        },
        tx,
      );

      return updated;
    });
  }),

  delete: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.supplier.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId, deletedAt: null },
      select: {
        id: true,
        _count: {
          select: {
            purchaseOrders: {
              where: { deletedAt: null, status: { notIn: ['CANCELLED', 'CLOSED'] } },
            },
          },
        },
      },
    });
    if (!existing) throw new NotFoundError('Supplier', input.id);

    assertCan(ctx.ability, 'po:delete', 'all', existing as Record<string, unknown>);

    if (existing._count.purchaseOrders > 0) {
      throw new ConflictError('Cannot delete supplier with active purchase orders.');
    }

    await ctx.db.$transaction(async (tx) => {
      await tx.supplier.update({
        where: { id: input.id },
        data: { deletedAt: new Date(), isActive: false },
      });

      await writeAuditLog(
        {
          entityType: 'Supplier',
          entityId: input.id,
          action: 'DELETE',
          organizationId: ctx.user.organizationId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
        },
        tx,
      );
    });

    return { success: true };
  }),

  // ── SUPPLIER ITEMS ─────────────────────────────────────────────────────────

  addSupplierItem: orgProcedure
    .input(
      z.object({
        supplierId: z.string(),
        itemId: z.string(),
        supplierSku: z.string().max(100).optional(),
        supplierName: z.string().max(255).optional(),
        basePrice: decimalSchema,
        currency: currencyCodeSchema.default('BHD'),
        leadTimeDays: z.number().int().min(0).optional(),
        minOrderQty: decimalSchema.optional(),
        notes: z.string().max(5000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'po:update', 'all');

      const supplier = await ctx.db.supplier.findFirst({
        where: { id: input.supplierId, organizationId: ctx.user.organizationId, deletedAt: null },
        select: { id: true },
      });
      if (!supplier) throw new NotFoundError('Supplier', input.supplierId);

      const item = await ctx.db.item.findFirst({
        where: { id: input.itemId, organizationId: ctx.user.organizationId, deletedAt: null },
        select: { id: true },
      });
      if (!item) throw new NotFoundError('Item', input.itemId);

      const existing = await ctx.db.supplierItem.findFirst({
        where: { supplierId: input.supplierId, itemId: input.itemId, deletedAt: null },
        select: { id: true },
      });
      if (existing) throw new ConflictError('This item is already linked to the supplier.');

      return ctx.db.$transaction(async (tx) => {
        const created = await tx.supplierItem.create({
          data: {
            supplierId: input.supplierId,
            itemId: input.itemId,
            supplierSku: input.supplierSku,
            supplierName: input.supplierName,
            basePrice: input.basePrice,
            currency: input.currency,
            leadTimeDays: input.leadTimeDays,
            minOrderQty: input.minOrderQty ?? 1,
            notes: input.notes,
            organizationId: ctx.user.organizationId,
          },
        });

        await writeAuditLog(
          {
            entityType: 'SupplierItem',
            entityId: created.id,
            action: 'CREATE',
            organizationId: ctx.user.organizationId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return created;
      });
    }),

  updateSupplierItem: orgProcedure
    .input(
      z.object({
        id: z.string(),
        supplierSku: z.string().max(100).optional(),
        supplierName: z.string().max(255).optional(),
        basePrice: decimalSchema.optional(),
        currency: currencyCodeSchema.optional(),
        leadTimeDays: z.number().int().min(0).optional(),
        minOrderQty: decimalSchema.optional(),
        notes: z.string().max(5000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const existing = await ctx.db.supplierItem.findFirst({
        where: { id, organizationId: ctx.user.organizationId, deletedAt: null },
      });
      if (!existing) throw new NotFoundError('SupplierItem', id);

      assertCan(ctx.ability, 'po:update', 'all', existing as Record<string, unknown>);

      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.supplierItem.update({ where: { id }, data });

        await writeAuditLog(
          {
            entityType: 'SupplierItem',
            entityId: id,
            action: 'UPDATE',
            organizationId: ctx.user.organizationId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return updated;
      });
    }),

  deleteSupplierItem: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.supplierItem.findFirst({
        where: { id: input.id, organizationId: ctx.user.organizationId, deletedAt: null },
      });
      if (!existing) throw new NotFoundError('SupplierItem', input.id);

      assertCan(ctx.ability, 'po:update', 'all', existing as Record<string, unknown>);

      await ctx.db.$transaction(async (tx) => {
        await tx.supplierItem.update({
          where: { id: input.id },
          data: { deletedAt: new Date(), isActive: false },
        });

        await writeAuditLog(
          {
            entityType: 'SupplierItem',
            entityId: input.id,
            action: 'DELETE',
            organizationId: ctx.user.organizationId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );
      });

      return { success: true };
    }),
});
