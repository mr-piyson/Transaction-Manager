import { z } from 'zod';
import { ConflictError, NotFoundError, UnprocessableError } from '@/lib/error';
import { assertCan, orgProcedure, router } from '@/lib/trpc/context';
import { writeAuditLog } from '../shared/audit.service';

const employeeTypeSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().max(50).optional(),
  description: z.string().max(1000).optional(),
});

export const employeeTypesRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    assertCan(ctx.ability, 'employee-type:read', 'EmployeeType');

    return ctx.db.employeeType.findMany({
      where: { organizationId: ctx.user.organizationId, isActive: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { employees: true } } },
    });
  }),

  byId: orgProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'employee-type:read', 'EmployeeType');

    const et = await ctx.db.employeeType.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId },
      include: { _count: { select: { employees: true } } },
    });
    if (!et) throw new NotFoundError('EmployeeType', input.id);
    return et;
  }),

  create: orgProcedure.input(employeeTypeSchema).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'employee-type:create', 'EmployeeType');
    const orgId = ctx.user.organizationId;

    const existing = await ctx.db.employeeType.findFirst({
      where: { name: input.name, organizationId: orgId },
      select: { id: true },
    });
    if (existing) throw new ConflictError('An employee type with this name already exists.');

    return ctx.db.$transaction(async (tx) => {
      const et = await tx.employeeType.create({ data: { ...input, organizationId: orgId } });

      await writeAuditLog(
        { entityType: 'EmployeeType', entityId: et.id, action: 'CREATE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
        tx,
      );

      return et;
    });
  }),

  update: orgProcedure.input(z.object({ id: z.string() }).merge(employeeTypeSchema.partial())).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const orgId = ctx.user.organizationId;

    const existing = await ctx.db.employeeType.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) throw new NotFoundError('EmployeeType', id);

    assertCan(ctx.ability, 'employee-type:update', 'EmployeeType', existing as Record<string, unknown>);

    if (data.name) {
      const dup = await ctx.db.employeeType.findFirst({
        where: { name: data.name, organizationId: orgId, id: { not: id } },
        select: { id: true },
      });
      if (dup) throw new ConflictError('Another employee type with this name already exists.');
    }

    return ctx.db.$transaction(async (tx) => {
      const updated = await tx.employeeType.update({ where: { id }, data });

      await writeAuditLog(
        { entityType: 'EmployeeType', entityId: id, action: 'UPDATE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
        tx,
      );

      return updated;
    });
  }),

  delete: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const orgId = ctx.user.organizationId;

    const existing = await ctx.db.employeeType.findFirst({
      where: { id: input.id, organizationId: orgId },
      include: { _count: { select: { employees: true } } },
    });
    if (!existing) throw new NotFoundError('EmployeeType', input.id);

    assertCan(ctx.ability, 'employee-type:delete', 'EmployeeType', existing as Record<string, unknown>);

    if (existing._count.employees > 0) {
      throw new UnprocessableError('Cannot delete an employee type that has employees assigned.');
    }

    await ctx.db.$transaction(async (tx) => {
      await tx.employeeType.update({
        where: { id: input.id },
        data: { isActive: false },
      });

      await writeAuditLog(
        { entityType: 'EmployeeType', entityId: input.id, action: 'DELETE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
        tx,
      );
    });

    return { success: true };
  }),
});
