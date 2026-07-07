import { z } from 'zod';
import { ConflictError, NotFoundError, UnprocessableError } from '@/lib/error';
import { assertCan, orgProcedure, router } from '@/lib/trpc/context';
import { paginatedResponse, toPrismaPage } from '@/lib/validations';
import { writeAuditLog } from '../shared/audit.service';
import { hrListSchema } from './hr.schemas';

const departmentCreateSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().max(50).optional(),
  description: z.string().max(1000).optional(),
  managerId: z.string().optional(),
  parentId: z.string().optional(),
});

const departmentUpdateSchema = departmentCreateSchema.partial().extend({
  id: z.string(),
});

export const departmentsRouter = router({
  list: orgProcedure.input(hrListSchema).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'department:read', 'Department');
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

    const [departments, total] = await ctx.db.$transaction([
      ctx.db.department.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          manager: { select: { id: true, employeeCode: true, user: { select: { name: true } } } },
          parent: { select: { id: true, name: true } },
          _count: { select: { children: true, employees: true } },
        },
      }),
      ctx.db.department.count({ where }),
    ]);

    return paginatedResponse(departments, total, pagination);
  }),

  byId: orgProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'department:read', 'Department');

    const department = await ctx.db.department.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId, deletedAt: null },
      include: {
        manager: { select: { id: true, employeeCode: true, user: { select: { id: true, name: true, email: true } } } },
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true, code: true, isActive: true } },
        _count: { select: { employees: true } },
      },
    });

    if (!department) throw new NotFoundError('Department', input.id);
    return department;
  }),

  create: orgProcedure.input(departmentCreateSchema).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'department:create', 'Department');
    const orgId = ctx.user.organizationId;

    const existing = await ctx.db.department.findFirst({
      where: {
        organizationId: orgId,
        OR: [
          { name: input.name },
          ...(input.code ? [{ code: input.code }] : []),
        ],
      },
      select: { id: true },
    });
    if (existing) throw new ConflictError('A department with this name or code already exists.');

    if (input.managerId) {
      const mgr = await ctx.db.employee.findFirst({
        where: { id: input.managerId, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      if (!mgr) throw new NotFoundError('Employee', input.managerId);
    }

    if (input.parentId) {
      const parent = await ctx.db.department.findFirst({
        where: { id: input.parentId, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      if (!parent) throw new NotFoundError('Department', input.parentId);
    }

    return ctx.db.$transaction(async (tx) => {
      const department = await tx.department.create({
        data: {
          ...input,
          organizationId: orgId,
        },
      });

      await writeAuditLog(
        { entityType: 'Department', entityId: department.id, action: 'CREATE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
        tx,
      );

      return department;
    });
  }),

  update: orgProcedure.input(departmentUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const orgId = ctx.user.organizationId;

    const existing = await ctx.db.department.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!existing) throw new NotFoundError('Department', id);

    assertCan(ctx.ability, 'department:update', 'Department', existing as Record<string, unknown>);

    if (data.name || data.code) {
      const dup = await ctx.db.department.findFirst({
        where: {
          organizationId: orgId,
          deletedAt: null,
          id: { not: id },
          OR: [
            ...(data.name ? [{ name: data.name }] : []),
            ...(data.code ? [{ code: data.code }] : []),
          ],
        },
        select: { id: true },
      });
      if (dup) throw new ConflictError('Another department with this name or code already exists.');
    }

    if (data.parentId && data.parentId === id) {
      throw new UnprocessableError('A department cannot be its own parent.');
    }

    if (data.parentId) {
      const parent = await ctx.db.department.findFirst({
        where: { id: data.parentId, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      if (!parent) throw new NotFoundError('Department', data.parentId);
    }

    if (data.managerId) {
      const mgr = await ctx.db.employee.findFirst({
        where: { id: data.managerId, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      if (!mgr) throw new NotFoundError('Employee', data.managerId);
    }

    return ctx.db.$transaction(async (tx) => {
      const updated = await tx.department.update({ where: { id }, data });

      await writeAuditLog(
        { entityType: 'Department', entityId: id, action: 'UPDATE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
        tx,
      );

      return updated;
    });
  }),

  delete: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const orgId = ctx.user.organizationId;

    const existing = await ctx.db.department.findFirst({
      where: { id: input.id, organizationId: orgId, deletedAt: null },
      include: { _count: { select: { employees: true, children: true } } },
    });
    if (!existing) throw new NotFoundError('Department', input.id);

    assertCan(ctx.ability, 'department:delete', 'Department', existing as Record<string, unknown>);

    if (existing._count.employees > 0) {
      throw new UnprocessableError('Cannot delete a department that has employees. Reassign them first.');
    }

    await ctx.db.$transaction(async (tx) => {
      await tx.department.update({
        where: { id: input.id },
        data: { deletedAt: new Date(), isActive: false },
      });

      if (existing._count.children > 0) {
        await tx.department.updateMany({
          where: { parentId: input.id },
          data: { parentId: null },
        });
      }

      await writeAuditLog(
        { entityType: 'Department', entityId: input.id, action: 'DELETE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
        tx,
      );
    });

    return { success: true };
  }),
});
