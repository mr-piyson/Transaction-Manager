import { z } from 'zod';
import { ConflictError, NotFoundError, UnprocessableError } from '@/lib/error';
import { assertCan, orgProcedure, router } from '@/lib/trpc/context';
import { paginatedResponse, toPrismaPage } from '@/lib/validations';
import { writeAuditLog } from '../shared/audit.service';
import { employeeStatusSchema, hrDateField, hrOptionalDateField, hrListSchema } from './hr.schemas';
import { generateEmployeeCode, withRetry } from './hr.service';

const employeeCreateSchema = z.object({
  employeeCode: z.string().max(50).optional(),
  userId: z.string(),
  hireDate: hrDateField(),
  probationEndDate: hrOptionalDateField(),
  status: employeeStatusSchema.default('ACTIVE'),
  phone: z.string().max(50).optional(),
  emergencyContact: z.string().max(255).optional(),
  emergencyPhone: z.string().max(50).optional(),
  bankAccount: z.string().max(100).optional(),
  bankName: z.string().max(255).optional(),
  departmentId: z.string().optional(),
  jobPositionId: z.string().optional(),
  reportsToId: z.string().optional(),
  employeeTypeId: z.string().optional(),
  salaryAmount: z.number().optional(),
  salaryCurrency: z.enum(['USD', 'BHD', 'EUR', 'GBP', 'JPY', 'AED', 'SAR', 'KWD', 'QAR', 'OMR']).optional(),
});

const employeeUpdateSchema = employeeCreateSchema.partial().extend({
  id: z.string(),
});

const employeeSelect = {
  id: true,
  employeeCode: true,
  hireDate: true,
  probationEndDate: true,
  terminationDate: true,
  status: true,
  phone: true,
  emergencyContact: true,
  emergencyPhone: true,
  bankAccount: true,
  bankName: true,
  salaryAmount: true,
  salaryCurrency: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  departmentId: true,
  jobPositionId: true,
  reportsToId: true,
  employeeTypeId: true,
};

export const employeesRouter = router({
  list: orgProcedure
    .input(
      hrListSchema.extend({
        status: employeeStatusSchema.optional(),
        departmentId: z.string().optional(),
        jobPositionId: z.string().optional(),
        employeeTypeId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'employee:read', 'Employee');
      const { search, sortBy, sortOrder, status, departmentId, jobPositionId, employeeTypeId, ...pagination } = input;
      const { skip, take } = toPrismaPage(pagination);
      const orgId = ctx.user.organizationId;

      const where: Record<string, unknown> = { organizationId: orgId, deletedAt: null };
      if (status) where.status = status;
      if (departmentId) where.departmentId = departmentId;
      if (jobPositionId) where.jobPositionId = jobPositionId;
      if (employeeTypeId) where.employeeTypeId = employeeTypeId;

      if (search) {
        where.OR = [
          { employeeCode: { contains: search, mode: 'insensitive' as const } },
          { user: { name: { contains: search, mode: 'insensitive' as const } } },
          { user: { email: { contains: search, mode: 'insensitive' as const } } },
          { phone: { contains: search, mode: 'insensitive' as const } },
        ];
      }

      const [employees, total] = await ctx.db.$transaction([
        ctx.db.employee.findMany({
          where,
          skip,
          take,
          orderBy: { [sortBy]: sortOrder },
          select: {
            ...employeeSelect,
            user: { select: { id: true, name: true, email: true } },
            department: { select: { id: true, name: true } },
            jobPosition: { select: { id: true, name: true } },
            employeeType: { select: { id: true, name: true } },
            reportsTo: { select: { id: true, employeeCode: true, user: { select: { name: true } } } },
          },
        }),
        ctx.db.employee.count({ where }),
      ]);

      return paginatedResponse(employees, total, pagination);
    }),

  byId: orgProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'employee:read', 'Employee');

    const employee = await ctx.db.employee.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId, deletedAt: null },
      select: {
        ...employeeSelect,
        user: { select: { id: true, name: true, email: true, image: true } },
        department: { select: { id: true, name: true, code: true } },
        jobPosition: { select: { id: true, name: true } },
        employeeType: { select: { id: true, name: true } },
        reportsTo: {
          select: { id: true, employeeCode: true, user: { select: { id: true, name: true, email: true } } },
        },
        directReports: {
          select: { id: true, employeeCode: true, user: { select: { name: true } } },
        },
        managedDepartments: { select: { id: true, name: true } },
        leaveBalances: {
          include: { leaveType: { select: { id: true, name: true, code: true } } },
        },
        salaryComponents: { where: { deletedAt: null } },
        statusHistory: { orderBy: { createdAt: 'desc' }, take: 10 },
        _count: {
          select: {
            leaveRequests: true,
            attendanceRecords: true,
            payrollItems: true,
            directReports: true,
          },
        },
      },
    });

    if (!employee) throw new NotFoundError('Employee', input.id);
    return employee;
  }),

  byUser: orgProcedure.input(z.object({ userId: z.string() })).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'employee:read', 'Employee');

    const employee = await ctx.db.employee.findFirst({
      where: { userId: input.userId, organizationId: ctx.user.organizationId, deletedAt: null },
    });
    if (!employee) throw new NotFoundError('Employee', `user ${input.userId}`);
    return employee;
  }),

  create: orgProcedure.input(employeeCreateSchema).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'employee:create', 'Employee');
    const orgId = ctx.user.organizationId;

    const existingEmployee = await ctx.db.employee.findFirst({
      where: { userId: input.userId, deletedAt: null },
      select: { id: true },
    });
    if (existingEmployee) throw new ConflictError('This user is already linked to an employee record.');

    if (input.departmentId) {
      const dept = await ctx.db.department.findFirst({
        where: { id: input.departmentId, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      if (!dept) throw new NotFoundError('Department', input.departmentId);
    }

    if (input.jobPositionId) {
      const pos = await ctx.db.jobPosition.findFirst({
        where: { id: input.jobPositionId, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      if (!pos) throw new NotFoundError('JobPosition', input.jobPositionId);
    }

    if (input.reportsToId) {
      const mgr = await ctx.db.employee.findFirst({
        where: { id: input.reportsToId, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      if (!mgr) throw new NotFoundError('Employee', input.reportsToId);
    }

    if (input.employeeTypeId) {
      const et = await ctx.db.employeeType.findFirst({
        where: { id: input.employeeTypeId, organizationId: orgId },
        select: { id: true },
      });
      if (!et) throw new NotFoundError('EmployeeType', input.employeeTypeId);
    }

    const result = await withRetry(() =>
      ctx.db.$transaction(async (tx) => {
        const employeeCode = input.employeeCode ?? (await generateEmployeeCode(tx, orgId));

        const employee = await tx.employee.create({
          data: {
            employeeCode,
            userId: input.userId,
            hireDate: input.hireDate,
            probationEndDate: input.probationEndDate,
            status: input.status,
            phone: input.phone,
            emergencyContact: input.emergencyContact,
            emergencyPhone: input.emergencyPhone,
            bankAccount: input.bankAccount,
            bankName: input.bankName,
            departmentId: input.departmentId,
            jobPositionId: input.jobPositionId,
            reportsToId: input.reportsToId,
            employeeTypeId: input.employeeTypeId,
            salaryAmount: input.salaryAmount,
            salaryCurrency: input.salaryCurrency,
            organizationId: orgId,
          },
        });

        await tx.employeeStatusHistory.create({
          data: {
            newStatus: input.status,
            employeeId: employee.id,
            changedById: ctx.user.id,
            organizationId: orgId,
          },
        });

        await writeAuditLog(
          { entityType: 'Employee', entityId: employee.id, action: 'CREATE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
          tx,
        );

        return employee;
      }),
    );

    return result;
  }),

  update: orgProcedure.input(employeeUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const orgId = ctx.user.organizationId;

    const existing = await ctx.db.employee.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!existing) throw new NotFoundError('Employee', id);

    assertCan(ctx.ability, 'employee:update', 'Employee', existing as Record<string, unknown>);

    if (data.departmentId) {
      const dept = await ctx.db.department.findFirst({
        where: { id: data.departmentId, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      if (!dept) throw new NotFoundError('Department', data.departmentId);
    }

    if (data.jobPositionId) {
      const pos = await ctx.db.jobPosition.findFirst({
        where: { id: data.jobPositionId, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      if (!pos) throw new NotFoundError('JobPosition', data.jobPositionId);
    }

    if (data.reportsToId) {
      if (data.reportsToId === id) throw new UnprocessableError('An employee cannot report to themselves.');

      const mgr = await ctx.db.employee.findFirst({
        where: { id: data.reportsToId, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      if (!mgr) throw new NotFoundError('Employee', data.reportsToId);
    }

    return ctx.db.$transaction(async (tx) => {
      const updated = await tx.employee.update({ where: { id }, data });

      await writeAuditLog(
        { entityType: 'Employee', entityId: id, action: 'UPDATE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
        tx,
      );

      return updated;
    });
  }),

  delete: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const orgId = ctx.user.organizationId;

    const existing = await ctx.db.employee.findFirst({
      where: { id: input.id, organizationId: orgId, deletedAt: null },
      include: {
        _count: {
          select: {
            directReports: true,
            managedDepartments: true,
            leaveRequests: true,
            payrollItems: true,
            disciplinaryActions: true,
          },
        },
      },
    });
    if (!existing) throw new NotFoundError('Employee', input.id);

    assertCan(ctx.ability, 'employee:delete', 'Employee', existing as Record<string, unknown>);

    if (existing._count.leaveRequests > 0 || existing._count.payrollItems > 0) {
      throw new UnprocessableError('Cannot delete an employee with leave or payroll records.');
    }

    await ctx.db.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: input.id },
        data: { deletedAt: new Date(), status: 'TERMINATED', terminationDate: new Date() },
      });

      if (existing._count.directReports > 0) {
        await tx.employee.updateMany({
          where: { reportsToId: input.id },
          data: { reportsToId: null },
        });
      }

      await tx.employeeStatusHistory.create({
        data: {
          previousStatus: existing.status,
          newStatus: 'TERMINATED',
          reason: 'Employee deleted',
          employeeId: input.id,
          changedById: ctx.user.id,
          effectiveDate: new Date(),
          organizationId: orgId,
        },
      });

      await writeAuditLog(
        { entityType: 'Employee', entityId: input.id, action: 'DELETE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
        tx,
      );
    });

    return { success: true };
  }),

  updateStatus: orgProcedure
    .input(z.object({ id: z.string(), newStatus: employeeStatusSchema, reason: z.string().max(1000).optional() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;

      const existing = await ctx.db.employee.findFirst({
        where: { id: input.id, organizationId: orgId, deletedAt: null },
      });
      if (!existing) throw new NotFoundError('Employee', input.id);

      assertCan(ctx.ability, 'employee:status:update', 'Employee', existing as Record<string, unknown>);

      if (existing.status === input.newStatus) {
        throw new UnprocessableError(`Employee is already in status "${input.newStatus}".`);
      }

      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.employee.update({
          where: { id: input.id },
          data: {
            status: input.newStatus,
            terminationDate: input.newStatus === 'TERMINATED' || input.newStatus === 'RESIGNED' ? new Date() : null,
          },
        });

        await tx.employeeStatusHistory.create({
          data: {
            previousStatus: existing.status,
            newStatus: input.newStatus,
            reason: input.reason,
            employeeId: input.id,
            changedById: ctx.user.id,
            effectiveDate: new Date(),
            organizationId: orgId,
          },
        });

        await writeAuditLog(
          {
            entityType: 'Employee',
            entityId: input.id,
            action: 'STATUS_CHANGE',
            diff: { status: { before: existing.status, after: input.newStatus } },
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return updated;
      });
    }),

  statusHistory: {
    list: orgProcedure
      .input(z.object({ employeeId: z.string() }))
      .query(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'employee:read', 'Employee');

        return ctx.db.employeeStatusHistory.findMany({
          where: {
            employeeId: input.employeeId,
            employee: { organizationId: ctx.user.organizationId, deletedAt: null },
          },
          orderBy: { createdAt: 'desc' },
          include: {
            changedBy: { select: { id: true, name: true } },
          },
        });
      }),
  },
});
