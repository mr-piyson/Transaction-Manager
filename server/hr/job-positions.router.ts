import { z } from 'zod';
import { ConflictError, NotFoundError, UnprocessableError } from '@/lib/error';
import { assertCan, orgProcedure, router } from '@/lib/trpc/context';
import { paginatedResponse, toPrismaPage } from '@/lib/validations';
import { writeAuditLog } from '../shared/audit.service';
import { hrListSchema } from './hr.schemas';

const positionCreateSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().max(50).optional(),
  description: z.string().max(1000).optional(),
  requirements: z.string().max(5000).optional(),
  parentId: z.string().optional(),
});

const positionUpdateSchema = positionCreateSchema.partial().extend({
  id: z.string(),
});

export const jobPositionsRouter = router({
  list: orgProcedure.input(hrListSchema).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'job-position:read', 'JobPosition');
    const { search, sortBy, sortOrder, ...pagination } = input;
    const { skip, take } = toPrismaPage(pagination);
    const orgId = ctx.user.organizationId;

    const where: Record<string, unknown> = {
      organizationId: orgId,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { code: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const [positions, total] = await ctx.db.$transaction([
      ctx.db.jobPosition.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          parent: { select: { id: true, name: true } },
          _count: { select: { children: true, employees: true } },
        },
      }),
      ctx.db.jobPosition.count({ where }),
    ]);

    return paginatedResponse(positions, total, pagination);
  }),

  byId: orgProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'job-position:read', 'JobPosition');

    const position = await ctx.db.jobPosition.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId, deletedAt: null },
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true, isActive: true } },
        _count: { select: { employees: true } },
      },
    });

    if (!position) throw new NotFoundError('JobPosition', input.id);
    return position;
  }),

  create: orgProcedure.input(positionCreateSchema).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'job-position:create', 'JobPosition');
    const orgId = ctx.user.organizationId;

    const existing = await ctx.db.jobPosition.findFirst({
      where: { organizationId: orgId, name: input.name, deletedAt: null },
      select: { id: true },
    });
    if (existing) throw new ConflictError('A job position with this name already exists.');

    if (input.parentId) {
      const parent = await ctx.db.jobPosition.findFirst({
        where: { id: input.parentId, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      if (!parent) throw new NotFoundError('JobPosition', input.parentId);
    }

    return ctx.db.$transaction(async (tx) => {
      const position = await tx.jobPosition.create({
        data: { ...input, organizationId: orgId },
      });

      await writeAuditLog(
        { entityType: 'JobPosition', entityId: position.id, action: 'CREATE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
        tx,
      );

      return position;
    });
  }),

  update: orgProcedure.input(positionUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const orgId = ctx.user.organizationId;

    const existing = await ctx.db.jobPosition.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!existing) throw new NotFoundError('JobPosition', id);

    assertCan(ctx.ability, 'job-position:update', 'JobPosition', existing as Record<string, unknown>);

    if (data.name) {
      const dup = await ctx.db.jobPosition.findFirst({
        where: { organizationId: orgId, name: data.name, id: { not: id }, deletedAt: null },
        select: { id: true },
      });
      if (dup) throw new ConflictError('Another job position with this name already exists.');
    }

    if (data.parentId && data.parentId === id) {
      throw new UnprocessableError('A job position cannot be its own parent.');
    }

    if (data.parentId) {
      const parent = await ctx.db.jobPosition.findFirst({
        where: { id: data.parentId, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      if (!parent) throw new NotFoundError('JobPosition', data.parentId);
    }

    return ctx.db.$transaction(async (tx) => {
      const updated = await tx.jobPosition.update({ where: { id }, data });

      await writeAuditLog(
        { entityType: 'JobPosition', entityId: id, action: 'UPDATE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
        tx,
      );

      return updated;
    });
  }),

  delete: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const orgId = ctx.user.organizationId;

    const existing = await ctx.db.jobPosition.findFirst({
      where: { id: input.id, organizationId: orgId, deletedAt: null },
      include: { _count: { select: { employees: true, children: true } } },
    });
    if (!existing) throw new NotFoundError('JobPosition', input.id);

    assertCan(ctx.ability, 'job-position:delete', 'JobPosition', existing as Record<string, unknown>);

    if (existing._count.employees > 0) {
      throw new UnprocessableError('Cannot delete a position that has employees assigned.');
    }

    await ctx.db.$transaction(async (tx) => {
      await tx.jobPosition.update({
        where: { id: input.id },
        data: { deletedAt: new Date(), isActive: false },
      });

      if (existing._count.children > 0) {
        await tx.jobPosition.updateMany({
          where: { parentId: input.id },
          data: { parentId: null },
        });
      }

      await writeAuditLog(
        { entityType: 'JobPosition', entityId: input.id, action: 'DELETE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
        tx,
      );
    });

    return { success: true };
  }),
});
