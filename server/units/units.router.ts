import { z } from 'zod';
import { ConflictError, NotFoundError } from '@/lib/error';
import { assertCan, orgProcedure, router } from '@/lib/trpc/context';
import { writeAuditLog } from '../shared/audit.service';

const unitBaseSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

const createUnitSchema = unitBaseSchema;

const updateUnitSchema = unitBaseSchema.partial().extend({
  id: z.string(),
});

export const unitsRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    assertCan(ctx.ability, 'unit:read', 'Unit');
    return ctx.db.unit.findMany({
      where: { organizationId: ctx.user.organizationId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }),

  byId: orgProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'unit:read', 'Unit');
    const unit = await ctx.db.unit.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId, deletedAt: null },
    });
    if (!unit) throw new NotFoundError('Unit', input.id);
    return unit;
  }),

  create: orgProcedure.input(createUnitSchema).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'unit:create', 'Unit');
    const orgId = ctx.user.organizationId;

    const existing = await ctx.db.unit.findFirst({
      where: { code: input.code, organizationId: orgId },
      select: { id: true },
    });
    if (existing) throw new ConflictError(`Unit code "${input.code}" already exists.`);

    return ctx.db.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.unit.updateMany({
          where: { organizationId: orgId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const unit = await tx.unit.create({
        data: { ...input, organizationId: orgId },
      });

      await writeAuditLog(
        {
          entityType: 'Unit',
          entityId: unit.id,
          action: 'CREATE',
          organizationId: orgId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
        },
        tx,
      );

      return unit;
    });
  }),

  update: orgProcedure.input(updateUnitSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    assertCan(ctx.ability, 'unit:update', 'Unit');
    const orgId = ctx.user.organizationId;

    const existing = await ctx.db.unit.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!existing) throw new NotFoundError('Unit', id);

    if (data.code && data.code !== existing.code) {
      const conflict = await ctx.db.unit.findFirst({
        where: { code: data.code, organizationId: orgId, NOT: { id } },
        select: { id: true },
      });
      if (conflict) throw new ConflictError(`Unit code "${data.code}" is already in use.`);
    }

    return ctx.db.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.unit.updateMany({
          where: { organizationId: orgId, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }

      const unit = await tx.unit.update({ where: { id }, data });

      await writeAuditLog(
        {
          entityType: 'Unit',
          entityId: id,
          action: 'UPDATE',
          organizationId: orgId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
        },
        tx,
      );

      return unit;
    });
  }),

  delete: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'unit:delete', 'Unit');

    const existing = await ctx.db.unit.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId, deletedAt: null },
      include: { items: { take: 1, select: { id: true } } },
    });
    if (!existing) throw new NotFoundError('Unit', input.id);
    if (existing.isDefault) throw new ConflictError('Cannot delete the default unit.');
    if (existing.items.length > 0) {
      throw new ConflictError('Cannot delete a unit that is assigned to items.');
    }

    return ctx.db.$transaction(async (tx) => {
      const unit = await tx.unit.update({
        where: { id: input.id },
        data: { deletedAt: new Date(), isActive: false },
      });

      await writeAuditLog(
        {
          entityType: 'Unit',
          entityId: input.id,
          action: 'DELETE',
          organizationId: ctx.user.organizationId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
        },
        tx,
      );

      return unit;
    });
  }),
});
