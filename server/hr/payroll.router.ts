import { z } from 'zod';
import { ConflictError, NotFoundError, UnprocessableError } from '@/lib/error';
import { assertCan, orgProcedure, router } from '@/lib/trpc/context';
import { paginatedResponse, toPrismaPage } from '@/lib/validations';
import { writeAuditLog } from '../shared/audit.service';
import { hrListSchema, payrollStatusSchema, dateRangeFilterSchema } from './hr.schemas';

const payrollInclude = {
  processedBy: { select: { id: true, name: true } },
  _count: { select: { items: true } },
};

export const payrollRouter = router({
  list: orgProcedure
    .input(
      hrListSchema.extend({
        status: payrollStatusSchema.optional(),
        dateRange: dateRangeFilterSchema,
      }),
    )
    .query(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'payroll:read', 'PayrollRun');
      const { search, sortBy, sortOrder, status, dateRange, ...pagination } = input;
      const { skip, take } = toPrismaPage(pagination);
      const orgId = ctx.user.organizationId;

      const where: Record<string, unknown> = { organizationId: orgId };
      if (status) where.status = status;
      if (dateRange?.from || dateRange?.to) {
        where.periodStart = {
          ...(dateRange.from ? { gte: dateRange.from } : {}),
          ...(dateRange.to ? { lte: dateRange.to } : {}),
        };
      }
      if (search) {
        where.name = { contains: search, mode: 'insensitive' as const };
      }

      const [runs, total] = await ctx.db.$transaction([
        ctx.db.payrollRun.findMany({ where, skip, take, orderBy: { [sortBy]: sortOrder }, include: payrollInclude }),
        ctx.db.payrollRun.count({ where }),
      ]);

      return paginatedResponse(runs, total, pagination);
    }),

  byId: orgProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'payroll:read', 'PayrollRun');

    const run = await ctx.db.payrollRun.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId },
      include: {
        ...payrollInclude,
        items: {
          include: {
            employee: { select: { id: true, employeeCode: true, user: { select: { name: true } } } },
            payslip: { select: { id: true, fileUrl: true, generatedAt: true } },
          },
        },
      },
    });
    if (!run) throw new NotFoundError('PayrollRun', input.id);
    return run;
  }),

  create: orgProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        periodStart: z.coerce.date(),
        periodEnd: z.coerce.date(),
        notes: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'payroll:create', 'PayrollRun');
      const orgId = ctx.user.organizationId;

      if (input.periodStart >= input.periodEnd) {
        throw new UnprocessableError('Period start must be before period end.');
      }

      const overlapping = await ctx.db.payrollRun.findFirst({
        where: {
          organizationId: orgId,
          status: { in: ['DRAFT', 'PROCESSING', 'COMPLETED'] },
          periodStart: { lte: input.periodEnd },
          periodEnd: { gte: input.periodStart },
        },
        select: { id: true, name: true },
      });
      if (overlapping) {
        throw new ConflictError(`Overlapping payroll run already exists: "${overlapping.name}".`);
      }

      return ctx.db.$transaction(async (tx) => {
        const run = await tx.payrollRun.create({
          data: {
            name: input.name,
            periodStart: input.periodStart,
            periodEnd: input.periodEnd,
            notes: input.notes,
            organizationId: orgId,
          },
        });

        await writeAuditLog(
          { entityType: 'PayrollRun', entityId: run.id, action: 'CREATE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
          tx,
        );

        return run;
      });
    }),

  process: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'payroll:process', 'PayrollRun');
      const orgId = ctx.user.organizationId;

      const run = await ctx.db.payrollRun.findFirst({
        where: { id: input.id, organizationId: orgId },
      });
      if (!run) throw new NotFoundError('PayrollRun', input.id);
      if (run.status !== 'DRAFT') {
        throw new UnprocessableError(`Cannot process a payroll run in "${run.status}" status.`);
      }

      return ctx.db.$transaction(async (tx) => {
        await tx.payrollRun.update({
          where: { id: input.id },
          data: { status: 'PROCESSING' },
        });

        const employees = await tx.employee.findMany({
          where: { organizationId: orgId, deletedAt: null, status: 'ACTIVE' },
          select: {
            id: true,
            salaryAmount: true,
            salaryCurrency: true,
            bankAccount: true,
            bankName: true,
            salaryComponents: { where: { deletedAt: null } },
          },
        });

        let totalSalaries = 0;
        let totalDeductions = 0;
        let totalNetPay = 0;

        const items: Array<{
          payrollRunId: string;
          employeeId: string;
          baseSalary: number;
          allowances: number;
          deductions: number;
          netPay: number;
          bankAccount: string | null;
          bankName: string | null;
          organizationId: string;
        }> = [];
        for (const emp of employees) {
          const baseSalary = Number(emp.salaryAmount ?? 0);
          const allowances = emp.salaryComponents
            .filter((sc) => sc.type === 'ALLOWANCE' && sc.isRecurring)
            .reduce((sum, sc) => sum + Number(sc.amount), 0);
          const deductions = emp.salaryComponents
            .filter((sc) => sc.type === 'DEDUCTION' && sc.isRecurring)
            .reduce((sum, sc) => sum + Number(sc.amount), 0);
          const netPay = baseSalary + allowances - deductions;

          items.push({
            payrollRunId: input.id,
            employeeId: emp.id,
            baseSalary,
            allowances,
            deductions,
            netPay,
            bankAccount: emp.bankAccount,
            bankName: emp.bankName,
            organizationId: orgId,
          });

          totalSalaries += baseSalary + allowances;
          totalDeductions += deductions;
          totalNetPay += netPay;
        }

        if (items.length > 0) {
          await tx.payrollItem.createMany({ data: items });
        }

        const updated = await tx.payrollRun.update({
          where: { id: input.id },
          data: {
            status: 'DRAFT',
            totalSalaries,
            totalDeductions,
            totalNetPay,
          },
        });

        await writeAuditLog(
          {
            entityType: 'PayrollRun',
            entityId: input.id,
            action: 'STATUS_CHANGE',
            diff: { status: { before: run.status, after: 'PROCESSING→DRAFT' }, itemsCreated: { before: 0, after: items.length } },
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return updated;
      });
    }),

  complete: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'payroll:complete', 'PayrollRun');
      const orgId = ctx.user.organizationId;

      const run = await ctx.db.payrollRun.findFirst({
        where: { id: input.id, organizationId: orgId },
        include: { _count: { select: { items: true } } },
      });
      if (!run) throw new NotFoundError('PayrollRun', input.id);
      if (run.status !== 'DRAFT') {
        throw new UnprocessableError(`Cannot complete a payroll run in "${run.status}" status.`);
      }
      if (run._count.items === 0) {
        throw new UnprocessableError('Cannot complete a payroll run with no items.');
      }

      return ctx.db.$transaction(async (tx) => {
        const items = await tx.payrollItem.findMany({
          where: { payrollRunId: input.id },
          select: { id: true, employeeId: true, netPay: true, bankAccount: true, bankName: true },
        });

        for (const item of items) {
          await tx.payslip.create({
            data: {
              fileUrl: '',
              payrollItemId: item.id,
              employeeId: item.employeeId,
              organizationId: orgId,
              generatedAt: new Date(),
            },
          });
        }

        const updated = await tx.payrollRun.update({
          where: { id: input.id },
          data: {
            status: 'COMPLETED',
            processedAt: new Date(),
            processedById: ctx.user.id,
          },
        });

        await writeAuditLog(
          {
            entityType: 'PayrollRun',
            entityId: input.id,
            action: 'STATUS_CHANGE',
            diff: { status: { before: run.status, after: 'COMPLETED' } },
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return updated;
      });
    }),

  cancel: orgProcedure
    .input(z.object({ id: z.string(), reason: z.string().max(1000).optional() }))
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'payroll:cancel', 'PayrollRun');
      const orgId = ctx.user.organizationId;

      const run = await ctx.db.payrollRun.findFirst({
        where: { id: input.id, organizationId: orgId },
      });
      if (!run) throw new NotFoundError('PayrollRun', input.id);
      if (!['DRAFT', 'PROCESSING'].includes(run.status)) {
        throw new UnprocessableError(`Cannot cancel a payroll run in "${run.status}" status.`);
      }

      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.payrollRun.update({
          where: { id: input.id },
          data: { status: 'CANCELLED', notes: input.reason },
        });

        await writeAuditLog(
          {
            entityType: 'PayrollRun',
            entityId: input.id,
            action: 'STATUS_CHANGE',
            diff: { status: { before: run.status, after: 'CANCELLED' } },
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return updated;
      });
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;

      const run = await ctx.db.payrollRun.findFirst({
        where: { id: input.id, organizationId: orgId },
      });
      if (!run) throw new NotFoundError('PayrollRun', input.id);
      if (run.status !== 'DRAFT') {
        throw new UnprocessableError('Only DRAFT payroll runs can be deleted.');
      }

      await ctx.db.$transaction(async (tx) => {
        await tx.payslip.deleteMany({ where: { payrollItem: { payrollRunId: input.id } } });
        await tx.payrollItem.deleteMany({ where: { payrollRunId: input.id } });
        await tx.payrollRun.delete({ where: { id: input.id } });

        await writeAuditLog(
          { entityType: 'PayrollRun', entityId: input.id, action: 'DELETE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
          tx,
        );
      });

      return { success: true };
    }),

  items: {
    update: orgProcedure
      .input(
        z.object({
          id: z.string(),
          allowances: z.number().optional(),
          deductions: z.number().optional(),
          bonus: z.number().optional(),
          overtime: z.number().optional(),
          tax: z.number().optional(),
          notes: z.string().max(2000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'payroll:process', 'PayrollRun');
        const { id, ...data } = input;

        const item = await ctx.db.payrollItem.findFirst({
          where: { id, organizationId: ctx.user.organizationId },
          include: { payrollRun: { select: { status: true } } },
        });
        if (!item) throw new NotFoundError('PayrollItem', id);
        if (item.payrollRun.status !== 'DRAFT') {
          throw new UnprocessableError('Can only edit items in DRAFT payroll runs.');
        }

        const updates: Record<string, unknown> = { ...data };
        if (data.allowances !== undefined || data.deductions !== undefined || data.bonus !== undefined || data.overtime !== undefined || data.tax !== undefined) {
          updates.netPay = Number(item.baseSalary)
            + (data.allowances ?? Number(item.allowances))
            + (data.bonus ?? Number(item.bonus))
            + (data.overtime ?? Number(item.overtime))
            - (data.deductions ?? Number(item.deductions))
            - (data.tax ?? Number(item.tax));
        }

        return ctx.db.payrollItem.update({ where: { id }, data: updates });
      }),
  },
});
