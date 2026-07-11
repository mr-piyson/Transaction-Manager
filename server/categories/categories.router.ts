import { z } from 'zod';
import { ConflictError, NotFoundError } from '@/lib/error';
import { assertCan, orgProcedure, router } from '@/lib/trpc/context';
import { writeAuditLog } from '../shared/audit.service';

const categoryBaseSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().max(7).optional(),
  icon: z.string().max(50).optional(),
  isActive: z.boolean().default(true),
});

const createCategorySchema = categoryBaseSchema;

const updateCategorySchema = categoryBaseSchema.partial().extend({
  id: z.string(),
});

export const categoriesRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    assertCan(ctx.ability, 'category:read', 'ItemCategory');
    return ctx.db.itemCategory.findMany({
      where: { organizationId: ctx.user.organizationId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }),

  byId: orgProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'category:read', 'ItemCategory');
    const category = await ctx.db.itemCategory.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId, deletedAt: null },
    });
    if (!category) throw new NotFoundError('ItemCategory', input.id);
    return category;
  }),

  create: orgProcedure.input(createCategorySchema).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'category:create', 'ItemCategory');
    const orgId = ctx.user.organizationId;

    const existing = await ctx.db.itemCategory.findFirst({
      where: { name: input.name, organizationId: orgId },
      select: { id: true },
    });
    if (existing) throw new ConflictError(`Category "${input.name}" already exists.`);

    return ctx.db.$transaction(async (tx) => {
      const created = await tx.itemCategory.create({
        data: { ...input, organizationId: orgId },
      });

      await writeAuditLog(
        {
          entityType: 'ItemCategory',
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

  update: orgProcedure.input(updateCategorySchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    assertCan(ctx.ability, 'category:update', 'ItemCategory');
    const orgId = ctx.user.organizationId;

    const existing = await ctx.db.itemCategory.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!existing) throw new NotFoundError('ItemCategory', id);

    if (data.name && data.name !== existing.name) {
      const conflict = await ctx.db.itemCategory.findFirst({
        where: { name: data.name, organizationId: orgId, NOT: { id } },
        select: { id: true },
      });
      if (conflict) throw new ConflictError(`Category "${data.name}" already exists.`);
    }

    return ctx.db.$transaction(async (tx) => {
      const updated = await tx.itemCategory.update({ where: { id }, data });

      await writeAuditLog(
        {
          entityType: 'ItemCategory',
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
    assertCan(ctx.ability, 'category:delete', 'ItemCategory');

    const existing = await ctx.db.itemCategory.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId, deletedAt: null },
      include: { items: { take: 1, select: { id: true } } },
    });
    if (!existing) throw new NotFoundError('ItemCategory', input.id);
    if (existing.items.length > 0) {
      throw new ConflictError('Cannot delete a category that is assigned to items.');
    }

    return ctx.db.$transaction(async (tx) => {
      await tx.itemCategory.update({
        where: { id: input.id },
        data: { deletedAt: new Date(), isActive: false },
      });

      await writeAuditLog(
        {
          entityType: 'ItemCategory',
          entityId: input.id,
          action: 'DELETE',
          organizationId: ctx.user.organizationId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
        },
        tx,
      );

      return { success: true };
    });
  }),

  generateSku: orgProcedure
    .input(
      z.object({
        categoryCode: z.string().max(10).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;
      const prefix = [input.categoryCode, 'ITM'].filter(Boolean).join('-');

      const seq = await ctx.db.$transaction(async (tx) => {
        const row = await tx.documentSequence.findFirst({
          where: { organizationId: orgId, prefix, fiscalYear: null },
        });

        if (row) {
          const updated = await tx.documentSequence.update({
            where: { id: row.id },
            data: { nextVal: row.nextVal + 1 },
          });
          return updated;
        }

        const created = await tx.documentSequence.create({
          data: { prefix, nextVal: 2, organizationId: orgId },
        });
        return created;
      });

      const padded = String(seq.nextVal - 1).padStart(5, '0');
      return { sku: `${prefix}-${padded}` };
    }),
});
