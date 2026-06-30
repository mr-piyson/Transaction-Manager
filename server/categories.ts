import { z } from 'zod';
import { ConflictError, NotFoundError } from '@/lib/error';
import { assertCan, orgProcedure, router } from '@/lib/trpc/context';
import { writeAuditLog } from './audit.service';

const familySchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  description: z.string().max(500).optional(),
  color: z.string().max(7).optional(),
  icon: z.string().max(50).optional(),
});

const classSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  description: z.string().max(500).optional(),
  color: z.string().max(7).optional(),
  icon: z.string().max(50).optional(),
  familyId: z.string(),
});

const commoditySchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  description: z.string().max(500).optional(),
  color: z.string().max(7).optional(),
  icon: z.string().max(50).optional(),
  classId: z.string(),
});

export const categoriesRouter = router({
  // ── LIST FULL TREE ────────────────────────────────────────────────────────
  listTree: orgProcedure.query(async ({ ctx }) => {
    assertCan(ctx.ability, 'category:read', 'CategoryFamily');
    const orgId = ctx.user.organizationId;

    const families = await ctx.db.categoryFamily.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { code: 'asc' },
      include: {
        classes: {
          where: { deletedAt: null },
          orderBy: { code: 'asc' },
          include: {
            commodities: {
              where: { deletedAt: null },
              orderBy: { code: 'asc' },
            },
          },
        },
      },
    });

    return families;
  }),

  // ── FAMILY CRUD ───────────────────────────────────────────────────────────

  createFamily: orgProcedure.input(familySchema).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'category:create', 'CategoryFamily');
    const orgId = ctx.user.organizationId;

    const existing = await ctx.db.categoryFamily.findFirst({
      where: { code: input.code, organizationId: orgId },
      select: { id: true },
    });
    if (existing) throw new ConflictError(`Family code "${input.code}" already exists.`);

    return ctx.db.$transaction(async (tx) => {
      const created = await tx.categoryFamily.create({
        data: { ...input, organizationId: orgId },
      });
      await writeAuditLog(
        {
          entityType: 'CategoryFamily',
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

  updateFamily: orgProcedure
    .input(familySchema.partial().extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const orgId = ctx.user.organizationId;

      const existing = await ctx.db.categoryFamily.findFirst({
        where: { id, organizationId: orgId },
      });
      if (!existing) throw new NotFoundError('CategoryFamily', id);

      if (data.code && data.code !== existing.code) {
        const conflict = await ctx.db.categoryFamily.findFirst({
          where: { code: data.code, organizationId: orgId, NOT: { id } },
          select: { id: true },
        });
        if (conflict) throw new ConflictError(`Family code "${data.code}" already exists.`);
      }

      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.categoryFamily.update({ where: { id }, data });
        await writeAuditLog(
          {
            entityType: 'CategoryFamily',
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

  deleteFamily: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;
      const existing = await ctx.db.categoryFamily.findFirst({
        where: { id: input.id, organizationId: orgId },
        select: { id: true },
      });
      if (!existing) throw new NotFoundError('CategoryFamily', input.id);

      const hasClasses = await ctx.db.categoryClass.count({
        where: { familyId: input.id, deletedAt: null },
      });
      if (hasClasses > 0)
        throw new ConflictError('Cannot delete family with active classes. Remove classes first.');

      return ctx.db.$transaction(async (tx) => {
        await tx.categoryFamily.update({
          where: { id: input.id },
          data: { deletedAt: new Date(), isActive: false },
        });
        await writeAuditLog(
          {
            entityType: 'CategoryFamily',
            entityId: input.id,
            action: 'DELETE',
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );
        return { success: true };
      });
    }),

  // ── CLASS CRUD ────────────────────────────────────────────────────────────

  createClass: orgProcedure.input(classSchema).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'category:create', 'CategoryClass');
    const orgId = ctx.user.organizationId;

    const family = await ctx.db.categoryFamily.findFirst({
      where: { id: input.familyId, organizationId: orgId },
      select: { id: true },
    });
    if (!family) throw new NotFoundError('CategoryFamily', input.familyId);

    const existing = await ctx.db.categoryClass.findFirst({
      where: { code: input.code, familyId: input.familyId, organizationId: orgId },
      select: { id: true },
    });
    if (existing)
      throw new ConflictError(`Class code "${input.code}" already exists in this family.`);

    return ctx.db.$transaction(async (tx) => {
      const created = await tx.categoryClass.create({
        data: { ...input, organizationId: orgId },
      });
      await writeAuditLog(
        {
          entityType: 'CategoryClass',
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

  updateClass: orgProcedure
    .input(classSchema.partial().extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const orgId = ctx.user.organizationId;

      const existing = await ctx.db.categoryClass.findFirst({
        where: { id, organizationId: orgId },
      });
      if (!existing) throw new NotFoundError('CategoryClass', id);

      if (data.code && (data.code !== existing.code || data.familyId !== existing.familyId)) {
        const conflict = await ctx.db.categoryClass.findFirst({
          where: {
            code: data.code,
            familyId: data.familyId ?? existing.familyId,
            organizationId: orgId,
            NOT: { id },
          },
          select: { id: true },
        });
        if (conflict)
          throw new ConflictError(`Class code "${data.code}" already exists in this family.`);
      }

      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.categoryClass.update({ where: { id }, data });
        await writeAuditLog(
          {
            entityType: 'CategoryClass',
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

  deleteClass: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const orgId = ctx.user.organizationId;
    const existing = await ctx.db.categoryClass.findFirst({
      where: { id: input.id, organizationId: orgId },
    });
    if (!existing) throw new NotFoundError('CategoryClass', input.id);

    const hasCommodities = await ctx.db.categoryCommodity.count({
      where: { classId: input.id, deletedAt: null },
    });
    if (hasCommodities > 0)
      throw new ConflictError(
        'Cannot delete class with active commodities. Remove commodities first.',
      );

    return ctx.db.$transaction(async (tx) => {
      await tx.categoryClass.update({
        where: { id: input.id },
        data: { deletedAt: new Date(), isActive: false },
      });
      await writeAuditLog(
        {
          entityType: 'CategoryClass',
          entityId: input.id,
          action: 'DELETE',
          organizationId: orgId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
        },
        tx,
      );
      return { success: true };
    });
  }),

  // ── COMMODITY CRUD ────────────────────────────────────────────────────────

  createCommodity: orgProcedure.input(commoditySchema).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'category:create', 'CategoryCommodity');
    const orgId = ctx.user.organizationId;

    const cls = await ctx.db.categoryClass.findFirst({
      where: { id: input.classId, organizationId: orgId },
      select: { id: true },
    });
    if (!cls) throw new NotFoundError('CategoryClass', input.classId);

    const existing = await ctx.db.categoryCommodity.findFirst({
      where: { code: input.code, classId: input.classId, organizationId: orgId },
      select: { id: true },
    });
    if (existing)
      throw new ConflictError(`Commodity code "${input.code}" already exists in this class.`);

    return ctx.db.$transaction(async (tx) => {
      const created = await tx.categoryCommodity.create({
        data: { ...input, organizationId: orgId },
      });
      await writeAuditLog(
        {
          entityType: 'CategoryCommodity',
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

  updateCommodity: orgProcedure
    .input(commoditySchema.partial().extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const orgId = ctx.user.organizationId;

      const existing = await ctx.db.categoryCommodity.findFirst({
        where: { id, organizationId: orgId },
      });
      if (!existing) throw new NotFoundError('CategoryCommodity', id);

      if (data.code && (data.code !== existing.code || data.classId !== existing.classId)) {
        const conflict = await ctx.db.categoryCommodity.findFirst({
          where: {
            code: data.code,
            classId: data.classId ?? existing.classId,
            organizationId: orgId,
            NOT: { id },
          },
          select: { id: true },
        });
        if (conflict)
          throw new ConflictError(`Commodity code "${data.code}" already exists in this class.`);
      }

      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.categoryCommodity.update({ where: { id }, data });
        await writeAuditLog(
          {
            entityType: 'CategoryCommodity',
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

  deleteCommodity: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;
      const existing = await ctx.db.categoryCommodity.findFirst({
        where: { id: input.id, organizationId: orgId },
      });
      if (!existing) throw new NotFoundError('CategoryCommodity', input.id);

      const hasItems = await ctx.db.item.count({
        where: { commodityId: input.id, deletedAt: null },
      });
      if (hasItems > 0) throw new ConflictError('Cannot delete commodity linked to active items.');

      return ctx.db.$transaction(async (tx) => {
        await tx.categoryCommodity.update({
          where: { id: input.id },
          data: { deletedAt: new Date(), isActive: false },
        });
        await writeAuditLog(
          {
            entityType: 'CategoryCommodity',
            entityId: input.id,
            action: 'DELETE',
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );
        return { success: true };
      });
    }),

  // ── SKU AUTO-GENERATION ───────────────────────────────────────────────────
  generateSku: orgProcedure
    .input(
      z.object({
        familyCode: z.string().max(10).optional(),
        classCode: z.string().max(10).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;
      const prefix = [input.familyCode, input.classCode, 'ITM'].filter(Boolean).join('-');

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
