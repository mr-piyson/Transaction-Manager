import { z } from 'zod';
import { NotFoundError, UnprocessableError } from '@/lib/error';
import { assertCan, orgProcedure, publicProcedure, router } from '@/lib/trpc/context';
import { paginatedResponse, toPrismaPage } from '@/lib/validations';
import { hrListSchema, dateRangeFilterSchema, hrDateField, hrOptionalDateField } from './hr.schemas';

export const attendanceRouter = router({
  logPublicAttendance: publicProcedure
    .input(
      z.object({
        employeeCode: z.string().min(1).max(50),
        organizationSlug: z.string().optional(),
        token: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let orgId: string;

      if (input.token) {
        const kiosk = await ctx.db.kiosk.findFirst({
          where: { token: input.token, isActive: true, deletedAt: null },
          select: { organizationId: true },
        });
        if (!kiosk) throw new NotFoundError('Kiosk', input.token);
        orgId = kiosk.organizationId;
      } else if (input.organizationSlug) {
        const org = await ctx.db.organization.findFirst({
          where: { slug: input.organizationSlug, deletedAt: null },
          select: { id: true },
        });
        if (!org) throw new NotFoundError('Organization', input.organizationSlug);
        orgId = org.id;
      } else {
        throw new NotFoundError('Kiosk', 'token or slug required');
      }

      const employee = await ctx.db.employee.findFirst({
        where: {
          employeeCode: input.employeeCode,
          organizationId: orgId,
          deletedAt: null,
          status: 'ACTIVE',
        },
        select: { id: true, user: { select: { name: true } } },
      });
      if (!employee) throw new NotFoundError('Employee', input.employeeCode);

      const punch = await ctx.db.timePunch.create({
        data: {
          employeeId: employee.id,
          organizationId: orgId,
          timestamp: new Date(),
          source: 'kiosk',
          punchState: 'CHECK_IN',
        },
      });

      return { success: true, employeeName: employee.user.name, punchTime: punch.timestamp };
    }),

  timePunches: {
    list: orgProcedure
      .input(
        hrListSchema.extend({
          employeeId: z.string().optional(),
          dateRange: dateRangeFilterSchema,
        }),
      )
      .query(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'attendance:read', 'TimePunch');
        const { search, sortBy, sortOrder, employeeId, dateRange, ...pagination } = input;
        const { skip, take } = toPrismaPage(pagination);
        const orgId = ctx.user.organizationId;

        const where: Record<string, unknown> = { organizationId: orgId };
        if (employeeId) where.employeeId = employeeId;
        if (dateRange?.from || dateRange?.to) {
          where.date = {
            ...(dateRange.from ? { gte: dateRange.from } : {}),
            ...(dateRange.to ? { lte: dateRange.to } : {}),
          };
        }

        const [punches, total] = await ctx.db.$transaction([
          ctx.db.timePunch.findMany({
            where,
            skip,
            take,
            orderBy: { timestamp: 'desc' },
            include: {
              employee: { select: { id: true, employeeCode: true, user: { select: { name: true } } } },
            },
          }),
          ctx.db.timePunch.count({ where }),
        ]);

        return paginatedResponse(punches, total, pagination);
      }),

    create: orgProcedure
      .input(
        z.object({
          employeeId: z.string(),
          timestamp: hrDateField(),
          source: z.string().max(100).optional(),
          punchState: z.string().max(10).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'attendance:create', 'TimePunch');
        const orgId = ctx.user.organizationId;

        const employee = await ctx.db.employee.findFirst({
          where: { id: input.employeeId, organizationId: orgId, deletedAt: null },
          select: { id: true },
        });
        if (!employee) throw new NotFoundError('Employee', input.employeeId);

        return ctx.db.timePunch.create({
          data: { ...input, organizationId: orgId },
        });
      }),
  },

  records: {
    list: orgProcedure
      .input(
        hrListSchema.extend({
          employeeId: z.string().optional(),
          departmentId: z.string().optional(),
          dateRange: dateRangeFilterSchema,
          isLate: z.boolean().optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'attendance:read', 'AttendanceRecord');
        const { search, sortBy, sortOrder, employeeId, departmentId, dateRange, isLate, ...pagination } = input;
        const { skip, take } = toPrismaPage(pagination);
        const orgId = ctx.user.organizationId;

        const where: Record<string, unknown> = { organizationId: orgId };
        if (employeeId) where.employeeId = employeeId;
        if (departmentId) where.employee = { departmentId };
        if (isLate !== undefined) where.isLate = isLate;
        if (dateRange?.from || dateRange?.to) {
          where.date = {
            ...(dateRange.from ? { gte: dateRange.from } : {}),
            ...(dateRange.to ? { lte: dateRange.to } : {}),
          };
        }

        const [records, total] = await ctx.db.$transaction([
          ctx.db.attendanceRecord.findMany({
            where,
            skip,
            take,
            orderBy: { [sortBy]: sortOrder },
            include: {
              employee: { select: { id: true, employeeCode: true, user: { select: { name: true } } } },
            },
          }),
          ctx.db.attendanceRecord.count({ where }),
        ]);

        return paginatedResponse(records, total, pagination);
      }),

    byId: orgProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'attendance:read', 'AttendanceRecord');

      const record = await ctx.db.attendanceRecord.findFirst({
        where: { id: input.id, organizationId: ctx.user.organizationId },
        include: {
          employee: {
            select: { id: true, employeeCode: true, user: { select: { id: true, name: true, email: true } } },
          },
        },
      });
      if (!record) throw new NotFoundError('AttendanceRecord', input.id);
      return record;
    }),

    calculate: orgProcedure
      .input(z.object({ employeeId: z.string(), date: hrDateField() }))
      .mutation(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'attendance:create', 'AttendanceRecord');
        const orgId = ctx.user.organizationId;

        const employee = await ctx.db.employee.findFirst({
          where: { id: input.employeeId, organizationId: orgId, deletedAt: null },
          select: { id: true },
        });
        if (!employee) throw new NotFoundError('Employee', input.employeeId);

        const startOfDay = new Date(input.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(input.date);
        endOfDay.setHours(23, 59, 59, 999);

        const punches = await ctx.db.timePunch.findMany({
          where: {
            employeeId: input.employeeId,
            timestamp: { gte: startOfDay, lte: endOfDay },
          },
          orderBy: { timestamp: 'asc' },
        });

        if (punches.length === 0) {
          throw new UnprocessableError('No time punches found for this employee on this date.');
        }

        const checkIn = punches[0].timestamp;
        const checkOut = punches.length > 1 ? punches[punches.length - 1].timestamp : null;
        const totalHours = checkOut
          ? Number(((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)).toFixed(2))
          : null;

        return ctx.db.attendanceRecord.upsert({
          where: {
            employeeId_date: { employeeId: input.employeeId, date: input.date },
          },
          create: {
            employeeId: input.employeeId,
            date: input.date,
            checkIn,
            checkOut,
            totalHours,
            organizationId: orgId,
          },
          update: {
            checkIn,
            checkOut,
            totalHours,
          },
        });
      }),

    update: orgProcedure
      .input(
        z.object({
          id: z.string(),
          checkIn: hrOptionalDateField(),
          checkOut: hrOptionalDateField(),
          breakStart: hrOptionalDateField(),
          breakEnd: hrOptionalDateField(),
          totalHours: z.number().optional(),
          isLate: z.boolean().optional(),
          notes: z.string().max(1000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'attendance:update', 'AttendanceRecord');
        const { id, ...data } = input;

        const existing = await ctx.db.attendanceRecord.findFirst({
          where: { id, organizationId: ctx.user.organizationId },
        });
        if (!existing) throw new NotFoundError('AttendanceRecord', id);

        return ctx.db.attendanceRecord.update({ where: { id }, data });
      }),
  },
});
