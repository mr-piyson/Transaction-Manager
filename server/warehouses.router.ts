import { z } from 'zod';
import { ConflictError, NotFoundError } from '@/lib/error';
import { assertCan, orgProcedure, router } from '@/lib/trpc/context';
import {
  offsetPaginationSchema,
  paginatedResponse,
  sortOrderSchema,
  toPrismaPage,
} from '@/lib/validations';
import { writeAuditLog } from './audit.service';

const warehouseBaseSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().max(50).optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

const createWarehouseSchema = warehouseBaseSchema;
const updateWarehouseSchema = warehouseBaseSchema.partial().extend({
  id: z.string(),
});

const listWarehousesSchema = z.object({
  ...offsetPaginationSchema.shape,
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('name'),
  sortOrder: sortOrderSchema,
});

export const warehousesRouter = router({
  list: orgProcedure.input(listWarehousesSchema).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'stock:read', 'all');

    const { search, isActive, sortBy, sortOrder, ...pagination } = input;
    const { skip, take } = toPrismaPage(pagination);
    const orgId = ctx.user.organizationId;

    const where: Record<string, unknown> = {
      organizationId: orgId,
      deletedAt: null,
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { code: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [warehouses, total] = await ctx.db.$transaction([
      ctx.db.warehouse.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: { _count: { select: { stock: true } } },
      }),
      ctx.db.warehouse.count({ where }),
    ]);

    return paginatedResponse(warehouses, total, pagination);
  }),

  byId: orgProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'stock:read', 'all');

    const warehouse = await ctx.db.warehouse.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId, deletedAt: null },
    });

    if (!warehouse) throw new NotFoundError('Warehouse', input.id);
    return warehouse;
  }),

  create: orgProcedure.input(createWarehouseSchema).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'stock:transfer', 'all');

    const orgId = ctx.user.organizationId;

    if (input.code) {
      const existing = await ctx.db.warehouse.findFirst({
        where: { code: input.code, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      if (existing) throw new ConflictError(`Warehouse code "${input.code}" is already in use.`);
    }

    return ctx.db.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.warehouse.updateMany({
          where: { organizationId: orgId, isDefault: true, deletedAt: null },
          data: { isDefault: false },
        });
      }

      const created = await tx.warehouse.create({
        data: { ...input, organizationId: orgId },
      });

      await writeAuditLog(
        {
          entityType: 'Warehouse',
          entityId: created.id,
          action: 'CREATE',
          organizationId: orgId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
        },
        tx,
      );

      return created;
    });
  }),

  update: orgProcedure.input(updateWarehouseSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const orgId = ctx.user.organizationId;

    const existing = await ctx.db.warehouse.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!existing) throw new NotFoundError('Warehouse', id);

    assertCan(ctx.ability, 'stock:transfer', 'all', existing as Record<string, unknown>);

    return ctx.db.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.warehouse.updateMany({
          where: { organizationId: orgId, isDefault: true, deletedAt: null, NOT: { id } },
          data: { isDefault: false },
        });
      }

      const updated = await tx.warehouse.update({ where: { id }, data });

      await writeAuditLog(
        {
          entityType: 'Warehouse',
          entityId: id,
          action: 'UPDATE',
          organizationId: orgId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
        },
        tx,
      );

      return updated;
    });
  }),

  delete: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.warehouse.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId, deletedAt: null },
      select: {
        id: true,
        isDefault: true,
        _count: { select: { stock: { where: { quantity: { gt: 0 } } } } },
      },
    });
    if (!existing) throw new NotFoundError('Warehouse', input.id);

    assertCan(ctx.ability, 'stock:transfer', 'all', existing as Record<string, unknown>);

    if (existing.isDefault) {
      throw new ConflictError('Cannot delete the default warehouse. Set another as default first.');
    }
    if (existing._count.stock > 0) {
      throw new ConflictError('Cannot delete warehouse with stock on hand. Transfer stock first.');
    }

    await ctx.db.$transaction(async (tx) => {
      await tx.warehouse.update({
        where: { id: input.id },
        data: { deletedAt: new Date(), isActive: false },
      });

      await writeAuditLog(
        {
          entityType: 'Warehouse',
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
