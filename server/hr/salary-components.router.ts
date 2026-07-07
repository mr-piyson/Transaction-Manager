import { z } from 'zod';
import { NotFoundError, UnprocessableError } from '@/lib/error';
import { assertCan, orgProcedure, router } from '@/lib/trpc/context';
import { writeAuditLog } from '../shared/audit.service';

const salaryComponentSchema = z.object({
  employeeId: z.string(),
  name: z.string().min(1).max(255),
  type: z.enum(['ALLOWANCE', 'DEDUCTION']),
  amount: z.number().min(0),
  isRecurring: z.boolean().default(true),
});

export const salaryComponentsRouter = router({
  list: orgProcedure
    .input(z.object({ employeeId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'salary-component:read', 'SalaryComponent');
      const orgId = ctx.user.organizationId;

      const where: Record<string, unknown> = { organizationId: orgId, deletedAt: null };
      if (input.employeeId) where.employeeId = input.employeeId;

      return ctx.db.salaryComponent.findMany({
        where,
        orderBy: { name: 'asc' },
        include: {
          employee: { select: { id: true, employeeCode: true, user: { select: { name: true } } } },
        },
      });
    }),

  create: orgProcedure.input(salaryComponentSchema).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'salary-component:create', 'SalaryComponent');
    const orgId = ctx.user.organizationId;

    const employee = await ctx.db.employee.findFirst({
      where: { id: input.employeeId, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!employee) throw new NotFoundError('Employee', input.employeeId);

    return ctx.db.$transaction(async (tx) => {
      const sc = await tx.salaryComponent.create({ data: { ...input, organizationId: orgId } });

      await writeAuditLog(
        { entityType: 'SalaryComponent', entityId: sc.id, action: 'CREATE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
        tx,
      );

      return sc;
    });
  }),

  update: orgProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1).max(255).optional(), type: z.enum(['ALLOWANCE', 'DEDUCTION']).optional(), amount: z.number().min(0).optional(), isRecurring: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const orgId = ctx.user.organizationId;

      const existing = await ctx.db.salaryComponent.findFirst({
        where: { id, organizationId: orgId, deletedAt: null },
      });
      if (!existing) throw new NotFoundError('SalaryComponent', id);

      assertCan(ctx.ability, 'salary-component:update', 'SalaryComponent', existing as Record<string, unknown>);

      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.salaryComponent.update({ where: { id }, data });

        await writeAuditLog(
          { entityType: 'SalaryComponent', entityId: id, action: 'UPDATE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
          tx,
        );

        return updated;
      });
    }),

  delete: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const orgId = ctx.user.organizationId;

    const existing = await ctx.db.salaryComponent.findFirst({
      where: { id: input.id, organizationId: orgId, deletedAt: null },
    });
    if (!existing) throw new NotFoundError('SalaryComponent', input.id);

    assertCan(ctx.ability, 'salary-component:delete', 'SalaryComponent', existing as Record<string, unknown>);

    await ctx.db.$transaction(async (tx) => {
      await tx.salaryComponent.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });

      await writeAuditLog(
        { entityType: 'SalaryComponent', entityId: input.id, action: 'DELETE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
        tx,
      );
    });

    return { success: true };
  }),
});
