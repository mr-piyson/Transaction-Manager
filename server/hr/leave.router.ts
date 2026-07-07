import { z } from 'zod';
import { ConflictError, NotFoundError, UnprocessableError } from '@/lib/error';
import { assertCan, orgProcedure, router } from '@/lib/trpc/context';
import { paginatedResponse, toPrismaPage } from '@/lib/validations';
import { writeAuditLog } from '../shared/audit.service';
import { hrListSchema, leaveStatusSchema, dateRangeFilterSchema, hrDateField } from './hr.schemas';

// ── LeaveType ─────────────────────────────────────────────────────────────────

const leaveTypeCreateSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  description: z.string().max(1000).optional(),
  daysPerYear: z.number().int().min(0).default(30),
  isPaid: z.boolean().default(true),
});

export const leaveRouter = router({
  // ── Leave Types ───────────────────────────────────────────────────────────
  types: {
    list: orgProcedure.input(hrListSchema).query(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'leave-type:read', 'LeaveType');
      const { search, sortBy, sortOrder, ...pagination } = input;
      const { skip, take } = toPrismaPage(pagination);
      const orgId = ctx.user.organizationId;

      const where: Record<string, unknown> = { organizationId: orgId, deletedAt: null };
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' as const } },
          { code: { contains: search, mode: 'insensitive' as const } },
        ];
      }

      const [types, total] = await ctx.db.$transaction([
        ctx.db.leaveType.findMany({ where, skip, take, orderBy: { [sortBy]: sortOrder } }),
        ctx.db.leaveType.count({ where }),
      ]);

      return paginatedResponse(types, total, pagination);
    }),

    byId: orgProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'leave-type:read', 'LeaveType');

      const lt = await ctx.db.leaveType.findFirst({
        where: { id: input.id, organizationId: ctx.user.organizationId, deletedAt: null },
      });
      if (!lt) throw new NotFoundError('LeaveType', input.id);
      return lt;
    }),

    create: orgProcedure.input(leaveTypeCreateSchema).mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'leave-type:create', 'LeaveType');
      const orgId = ctx.user.organizationId;

      const existing = await ctx.db.leaveType.findFirst({
        where: { code: input.code, organizationId: orgId },
        select: { id: true },
      });
      if (existing) throw new ConflictError('A leave type with this code already exists.');

      return ctx.db.$transaction(async (tx) => {
        const lt = await tx.leaveType.create({ data: { ...input, organizationId: orgId } });

        await writeAuditLog(
          { entityType: 'LeaveType', entityId: lt.id, action: 'CREATE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
          tx,
        );

        return lt;
      });
    }),

    update: orgProcedure
      .input(z.object({ id: z.string() }).merge(leaveTypeCreateSchema.partial()))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const orgId = ctx.user.organizationId;

        const existing = await ctx.db.leaveType.findFirst({
          where: { id, organizationId: orgId, deletedAt: null },
        });
        if (!existing) throw new NotFoundError('LeaveType', id);

        assertCan(ctx.ability, 'leave-type:update', 'LeaveType', existing as Record<string, unknown>);

        if (data.code) {
          const dup = await ctx.db.leaveType.findFirst({
            where: { code: data.code, organizationId: orgId, id: { not: id } },
            select: { id: true },
          });
          if (dup) throw new ConflictError('Another leave type with this code already exists.');
        }

        return ctx.db.$transaction(async (tx) => {
          const updated = await tx.leaveType.update({ where: { id }, data });

          await writeAuditLog(
            { entityType: 'LeaveType', entityId: id, action: 'UPDATE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
            tx,
          );

          return updated;
        });
      }),

    delete: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;

      const existing = await ctx.db.leaveType.findFirst({
        where: { id: input.id, organizationId: orgId, deletedAt: null },
        include: { _count: { select: { leaveRequests: true, leaveBalances: true } } },
      });
      if (!existing) throw new NotFoundError('LeaveType', input.id);

      assertCan(ctx.ability, 'leave-type:delete', 'LeaveType', existing as Record<string, unknown>);

      if (existing._count.leaveRequests > 0 || existing._count.leaveBalances > 0) {
        throw new UnprocessableError('Cannot delete a leave type that has requests or balances.');
      }

      await ctx.db.$transaction(async (tx) => {
        await tx.leaveType.update({ where: { id: input.id }, data: { deletedAt: new Date(), isActive: false } });

        await writeAuditLog(
          { entityType: 'LeaveType', entityId: input.id, action: 'DELETE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
          tx,
        );
      });

      return { success: true };
    }),
  },

  // ── Leave Balances ────────────────────────────────────────────────────────
  balances: {
    list: orgProcedure
      .input(
        hrListSchema.extend({
          employeeId: z.string().optional(),
          year: z.number().int().optional(),
          leaveTypeId: z.string().optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'leave:balance:read', 'LeaveBalance');
        const { search, sortBy, sortOrder, employeeId, year, leaveTypeId, ...pagination } = input;
        const { skip, take } = toPrismaPage(pagination);
        const orgId = ctx.user.organizationId;

        const where: Record<string, unknown> = { organizationId: orgId };
        if (employeeId) where.employeeId = employeeId;
        if (year) where.year = year;
        if (leaveTypeId) where.leaveTypeId = leaveTypeId;

        const [balances, total] = await ctx.db.$transaction([
          ctx.db.leaveBalance.findMany({
            where,
            skip,
            take,
            orderBy: { [sortBy]: sortOrder },
            include: {
              employee: { select: { id: true, employeeCode: true, user: { select: { name: true } } } },
              leaveType: { select: { id: true, name: true, code: true } },
            },
          }),
          ctx.db.leaveBalance.count({ where }),
        ]);

        const items = balances.map((b) => ({
          ...b,
          remainingDays: Number(b.allocatedDays) + Number(b.carriedForwardDays) + Number(b.adjustmentDays) - Number(b.usedDays),
        }));

        return paginatedResponse(items, total, pagination);
      }),

    allocate: orgProcedure
      .input(
        z.object({
          employeeId: z.string(),
          leaveTypeId: z.string(),
          year: z.number().int(),
          allocatedDays: z.number().min(0),
          carriedForwardDays: z.number().min(0).default(0),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'leave:balance:adjust', 'LeaveBalance');
        const orgId = ctx.user.organizationId;

        const employee = await ctx.db.employee.findFirst({
          where: { id: input.employeeId, organizationId: orgId, deletedAt: null },
          select: { id: true },
        });
        if (!employee) throw new NotFoundError('Employee', input.employeeId);

        const leaveType = await ctx.db.leaveType.findFirst({
          where: { id: input.leaveTypeId, organizationId: orgId, deletedAt: null },
          select: { id: true },
        });
        if (!leaveType) throw new NotFoundError('LeaveType', input.leaveTypeId);

        return ctx.db.leaveBalance.upsert({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: input.employeeId,
              leaveTypeId: input.leaveTypeId,
              year: input.year,
            },
          },
          create: {
            employeeId: input.employeeId,
            leaveTypeId: input.leaveTypeId,
            year: input.year,
            allocatedDays: input.allocatedDays,
            carriedForwardDays: input.carriedForwardDays,
            organizationId: orgId,
          },
          update: {
            allocatedDays: input.allocatedDays,
            carriedForwardDays: input.carriedForwardDays,
          },
        });
      }),

    adjust: orgProcedure
      .input(
        z.object({
          id: z.string(),
          adjustmentDays: z.number(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'leave:balance:adjust', 'LeaveBalance');
        const orgId = ctx.user.organizationId;

        const existing = await ctx.db.leaveBalance.findFirst({
          where: { id: input.id, organizationId: orgId },
        });
        if (!existing) throw new NotFoundError('LeaveBalance', input.id);

        return ctx.db.leaveBalance.update({
          where: { id: input.id },
          data: { adjustmentDays: { increment: input.adjustmentDays } },
        });
      }),
  },

  // ── Leave Requests ────────────────────────────────────────────────────────
  requests: {
    list: orgProcedure
      .input(
        hrListSchema.extend({
          employeeId: z.string().optional(),
          status: leaveStatusSchema.optional(),
          leaveTypeId: z.string().optional(),
          dateRange: dateRangeFilterSchema,
        }),
      )
      .query(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'leave:request:read', 'LeaveRequest');
        const { search, sortBy, sortOrder, employeeId, status, leaveTypeId, dateRange, ...pagination } = input;
        const { skip, take } = toPrismaPage(pagination);
        const orgId = ctx.user.organizationId;

        const where: Record<string, unknown> = { organizationId: orgId };
        if (employeeId) where.employeeId = employeeId;
        if (status) where.status = status;
        if (leaveTypeId) where.leaveTypeId = leaveTypeId;
        if (dateRange?.from || dateRange?.to) {
          where.startDate = {
            ...(dateRange.from ? { gte: dateRange.from } : {}),
            ...(dateRange.to ? { lte: dateRange.to } : {}),
          };
        }

        const [requests, total] = await ctx.db.$transaction([
          ctx.db.leaveRequest.findMany({
            where,
            skip,
            take,
            orderBy: { [sortBy]: sortOrder },
            include: {
              employee: { select: { id: true, employeeCode: true, user: { select: { name: true } } } },
              leaveType: { select: { id: true, name: true, code: true } },
              approvedBy: { select: { id: true, name: true } },
            },
          }),
          ctx.db.leaveRequest.count({ where }),
        ]);

        return paginatedResponse(requests, total, pagination);
      }),

    byId: orgProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'leave:request:read', 'LeaveRequest');

      const request = await ctx.db.leaveRequest.findFirst({
        where: { id: input.id, organizationId: ctx.user.organizationId },
        include: {
          employee: { select: { id: true, employeeCode: true, user: { select: { id: true, name: true, email: true } } } },
          leaveType: { select: { id: true, name: true, code: true, daysPerYear: true } },
          approvedBy: { select: { id: true, name: true } },
        },
      });
      if (!request) throw new NotFoundError('LeaveRequest', input.id);
      return request;
    }),

    create: orgProcedure
      .input(
        z.object({
          employeeId: z.string(),
          leaveTypeId: z.string(),
          startDate: hrDateField(),
          endDate: hrDateField(),
          reason: z.string().max(2000).optional(),
          notes: z.string().max(2000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'leave:request:create', 'LeaveRequest');
        const orgId = ctx.user.organizationId;

        if (input.startDate > input.endDate) {
          throw new UnprocessableError('Start date must be before or equal to end date.');
        }

        const durationDays = Math.ceil(
          (input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24),
        ) + 1;

        const employee = await ctx.db.employee.findFirst({
          where: { id: input.employeeId, organizationId: orgId, deletedAt: null },
          select: { id: true },
        });
        if (!employee) throw new NotFoundError('Employee', input.employeeId);

        const leaveType = await ctx.db.leaveType.findFirst({
          where: { id: input.leaveTypeId, organizationId: orgId, deletedAt: null },
          select: { id: true },
        });
        if (!leaveType) throw new NotFoundError('LeaveType', input.leaveTypeId);

        const overlapping = await ctx.db.leaveRequest.findFirst({
          where: {
            employeeId: input.employeeId,
            status: { in: ['PENDING', 'APPROVED'] },
            OR: [
              { startDate: { lte: input.endDate }, endDate: { gte: input.startDate } },
            ],
          },
          select: { id: true },
        });
        if (overlapping) {
          throw new ConflictError('Employee already has a pending or approved leave request for this period.');
        }

        const year = input.startDate.getFullYear();
        const balance = await ctx.db.leaveBalance.findFirst({
          where: {
            employeeId: input.employeeId,
            leaveTypeId: input.leaveTypeId,
            year,
          },
        });

        if (balance) {
          const remaining = Number(balance.allocatedDays) + Number(balance.carriedForwardDays) + Number(balance.adjustmentDays) - Number(balance.usedDays);
          if (remaining < durationDays) {
            throw new UnprocessableError(
              `Insufficient leave balance. Available: ${remaining} days, Requested: ${durationDays} days.`,
            );
          }
        }

        return ctx.db.$transaction(async (tx) => {
          const request = await tx.leaveRequest.create({
            data: {
              employeeId: input.employeeId,
              leaveTypeId: input.leaveTypeId,
              startDate: input.startDate,
              endDate: input.endDate,
              durationDays,
              reason: input.reason,
              notes: input.notes,
              organizationId: orgId,
            },
          });

          await tx.leaveBalance.upsert({
            where: {
              employeeId_leaveTypeId_year: {
                employeeId: input.employeeId,
                leaveTypeId: input.leaveTypeId,
                year,
              },
            },
            create: {
              employeeId: input.employeeId,
              leaveTypeId: input.leaveTypeId,
              year,
              allocatedDays: 0,
              usedDays: durationDays,
              organizationId: orgId,
            },
            update: {
              usedDays: { increment: durationDays },
            },
          });

          await writeAuditLog(
            { entityType: 'LeaveRequest', entityId: request.id, action: 'CREATE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
            tx,
          );

          return request;
        });
      }),

    approve: orgProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'leave:request:approve', 'LeaveRequest');
        const orgId = ctx.user.organizationId;

        const request = await ctx.db.leaveRequest.findFirst({
          where: { id: input.id, organizationId: orgId },
        });
        if (!request) throw new NotFoundError('LeaveRequest', input.id);
        if (request.status !== 'PENDING') {
          throw new UnprocessableError(`Cannot approve a request in "${request.status}" status.`);
        }

        return ctx.db.$transaction(async (tx) => {
          const updated = await tx.leaveRequest.update({
            where: { id: input.id },
            data: {
              status: 'APPROVED',
              approvedById: ctx.user.id,
              approvedAt: new Date(),
            },
          });

          await writeAuditLog(
            {
              entityType: 'LeaveRequest',
              entityId: input.id,
              action: 'STATUS_CHANGE',
              diff: { status: { before: request.status, after: 'APPROVED' } },
              organizationId: orgId,
              userId: ctx.user.id,
              ipAddress: ctx.ipAddress,
            },
            tx,
          );

          return updated;
        });
      }),

    reject: orgProcedure
      .input(z.object({ id: z.string(), reason: z.string().max(1000).optional() }))
      .mutation(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'leave:request:approve', 'LeaveRequest');
        const orgId = ctx.user.organizationId;

        const request = await ctx.db.leaveRequest.findFirst({
          where: { id: input.id, organizationId: orgId },
        });
        if (!request) throw new NotFoundError('LeaveRequest', input.id);
        if (request.status !== 'PENDING') {
          throw new UnprocessableError(`Cannot reject a request in "${request.status}" status.`);
        }

        return ctx.db.$transaction(async (tx) => {
          const updated = await tx.leaveRequest.update({
            where: { id: input.id },
            data: { status: 'REJECTED', notes: input.reason },
          });

          await tx.leaveBalance.updateMany({
            where: {
              employeeId: request.employeeId,
              leaveTypeId: request.leaveTypeId,
            },
            data: { usedDays: { decrement: request.durationDays } },
          });

          await writeAuditLog(
            {
              entityType: 'LeaveRequest',
              entityId: input.id,
              action: 'STATUS_CHANGE',
              diff: { status: { before: request.status, after: 'REJECTED' } },
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
        assertCan(ctx.ability, 'leave:request:update', 'LeaveRequest');
        const orgId = ctx.user.organizationId;

        const request = await ctx.db.leaveRequest.findFirst({
          where: { id: input.id, organizationId: orgId },
        });
        if (!request) throw new NotFoundError('LeaveRequest', input.id);

        if (!['PENDING', 'APPROVED'].includes(request.status)) {
          throw new UnprocessableError(`Cannot cancel a request in "${request.status}" status.`);
        }

        return ctx.db.$transaction(async (tx) => {
          const updated = await tx.leaveRequest.update({
            where: { id: input.id },
            data: { status: 'CANCELLED', notes: input.reason },
          });

          if (request.status === 'APPROVED') {
            await tx.leaveBalance.updateMany({
              where: {
                employeeId: request.employeeId,
                leaveTypeId: request.leaveTypeId,
              },
              data: { usedDays: { decrement: request.durationDays } },
            });
          }

          await writeAuditLog(
            {
              entityType: 'LeaveRequest',
              entityId: input.id,
              action: 'STATUS_CHANGE',
              diff: { status: { before: request.status, after: 'CANCELLED' } },
              organizationId: orgId,
              userId: ctx.user.id,
              ipAddress: ctx.ipAddress,
            },
            tx,
          );

          return updated;
        });
      }),
  },

  // ── Holidays ──────────────────────────────────────────────────────────────
  holidays: {
    list: orgProcedure.input(hrListSchema.extend({ dateRange: dateRangeFilterSchema })).query(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'holiday:read', 'Holiday');
      const { search, sortBy, sortOrder, dateRange, ...pagination } = input;
      const { skip, take } = toPrismaPage(pagination);
      const orgId = ctx.user.organizationId;

      const where: Record<string, unknown> = { organizationId: orgId };
      if (dateRange?.from || dateRange?.to) {
        where.date = {
          ...(dateRange.from ? { gte: dateRange.from } : {}),
          ...(dateRange.to ? { lte: dateRange.to } : {}),
        };
      }
      if (search) {
        where.name = { contains: search, mode: 'insensitive' as const };
      }

      const [holidays, total] = await ctx.db.$transaction([
        ctx.db.holiday.findMany({ where, skip, take, orderBy: { date: 'asc' } }),
        ctx.db.holiday.count({ where }),
      ]);

      return paginatedResponse(holidays, total, pagination);
    }),

    create: orgProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          date: hrDateField(),
          isRecurringAnnual: z.boolean().default(false),
          description: z.string().max(1000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'holiday:create', 'Holiday');
        const orgId = ctx.user.organizationId;

        const existing = await ctx.db.holiday.findFirst({
          where: { date: input.date, organizationId: orgId },
          select: { id: true },
        });
        if (existing) throw new ConflictError('A holiday already exists on this date.');

        return ctx.db.holiday.create({ data: { ...input, organizationId: orgId } });
      }),

    update: orgProcedure
      .input(z.object({ id: z.string(), name: z.string().min(1).max(255).optional(), description: z.string().max(1000).optional(), isRecurringAnnual: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        assertCan(ctx.ability, 'holiday:update', 'Holiday');

        const existing = await ctx.db.holiday.findFirst({
          where: { id, organizationId: ctx.user.organizationId },
        });
        if (!existing) throw new NotFoundError('Holiday', id);

        return ctx.db.holiday.update({ where: { id }, data });
      }),

    delete: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'holiday:delete', 'Holiday');

      const existing = await ctx.db.holiday.findFirst({
        where: { id: input.id, organizationId: ctx.user.organizationId },
      });
      if (!existing) throw new NotFoundError('Holiday', input.id);

      await ctx.db.holiday.delete({ where: { id: input.id } });
      return { success: true };
    }),
  },
});
