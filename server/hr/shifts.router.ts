import { z } from 'zod';
import { ConflictError, NotFoundError, UnprocessableError } from '@/lib/error';
import { assertCan, orgProcedure, router } from '@/lib/trpc/context';
import { paginatedResponse, toPrismaPage } from '@/lib/validations';
import { writeAuditLog } from '../shared/audit.service';
import { hrListSchema, dateRangeFilterSchema } from './hr.schemas';

const shiftCreateSchema = z.object({
  name: z.string().min(1).max(255),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format'),
  color: z.string().max(7).optional(),
});

const shiftUpdateSchema = shiftCreateSchema.partial().extend({ id: z.string() });

const employeeShiftUpsertSchema = z.object({
  employeeId: z.string(),
  shiftId: z.string(),
  date: z.coerce.date(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  notes: z.string().max(500).optional(),
});

export const shiftsRouter = router({
  list: orgProcedure.input(hrListSchema).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'shift:read', 'Shift');
    const { search, sortBy, sortOrder, ...pagination } = input;
    const { skip, take } = toPrismaPage(pagination);
    const orgId = ctx.user.organizationId;

    const where: Record<string, unknown> = { organizationId: orgId, isActive: true };
    if (search) {
      where.name = { contains: search, mode: 'insensitive' as const };
    }

    const [shifts, total] = await ctx.db.$transaction([
      ctx.db.shift.findMany({ where, skip, take, orderBy: { [sortBy]: sortOrder } }),
      ctx.db.shift.count({ where }),
    ]);

    return paginatedResponse(shifts, total, pagination);
  }),

  byId: orgProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'shift:read', 'Shift');

    const shift = await ctx.db.shift.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId },
    });
    if (!shift) throw new NotFoundError('Shift', input.id);
    return shift;
  }),

  create: orgProcedure.input(shiftCreateSchema).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'shift:create', 'Shift');
    const orgId = ctx.user.organizationId;

    const existing = await ctx.db.shift.findFirst({
      where: { name: input.name, organizationId: orgId },
      select: { id: true },
    });
    if (existing) throw new ConflictError('A shift with this name already exists.');

    return ctx.db.$transaction(async (tx) => {
      const shift = await tx.shift.create({ data: { ...input, organizationId: orgId } });

      await writeAuditLog(
        { entityType: 'Shift', entityId: shift.id, action: 'CREATE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
        tx,
      );

      return shift;
    });
  }),

  update: orgProcedure.input(shiftUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const orgId = ctx.user.organizationId;

    const existing = await ctx.db.shift.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) throw new NotFoundError('Shift', id);

    assertCan(ctx.ability, 'shift:update', 'Shift', existing as Record<string, unknown>);

    if (data.name) {
      const dup = await ctx.db.shift.findFirst({
        where: { name: data.name, organizationId: orgId, id: { not: id } },
        select: { id: true },
      });
      if (dup) throw new ConflictError('Another shift with this name already exists.');
    }

    return ctx.db.$transaction(async (tx) => {
      const updated = await tx.shift.update({ where: { id }, data });

      await writeAuditLog(
        { entityType: 'Shift', entityId: id, action: 'UPDATE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
        tx,
      );

      return updated;
    });
  }),

  delete: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const orgId = ctx.user.organizationId;

    const existing = await ctx.db.shift.findFirst({
      where: { id: input.id, organizationId: orgId },
      include: { _count: { select: { employeeShifts: true } } },
    });
    if (!existing) throw new NotFoundError('Shift', input.id);

    assertCan(ctx.ability, 'shift:delete', 'Shift', existing as Record<string, unknown>);

    if (existing._count.employeeShifts > 0) {
      throw new UnprocessableError('Cannot delete a shift that has employee assignments.');
    }

    await ctx.db.$transaction(async (tx) => {
      await tx.shift.update({ where: { id: input.id }, data: { isActive: false } });

      await writeAuditLog(
        { entityType: 'Shift', entityId: input.id, action: 'DELETE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
        tx,
      );
    });

    return { success: true };
  }),

  employeeShifts: {
    list: orgProcedure
      .input(hrListSchema.extend({ employeeId: z.string().optional(), dateRange: dateRangeFilterSchema }))
      .query(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'shift:read', 'Shift');
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

        const [assignments, total] = await ctx.db.$transaction([
          ctx.db.employeeShift.findMany({
            where,
            skip,
            take,
            orderBy: { [sortBy]: sortOrder },
            include: {
              shift: { select: { id: true, name: true, startTime: true, endTime: true } },
              employee: { select: { id: true, employeeCode: true, user: { select: { name: true } } } },
            },
          }),
          ctx.db.employeeShift.count({ where }),
        ]);

        return paginatedResponse(assignments, total, pagination);
      }),

    upsert: orgProcedure.input(employeeShiftUpsertSchema).mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;

      const employee = await ctx.db.employee.findFirst({
        where: { id: input.employeeId, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      if (!employee) throw new NotFoundError('Employee', input.employeeId);

      const shift = await ctx.db.shift.findFirst({
        where: { id: input.shiftId, organizationId: orgId },
        select: { id: true },
      });
      if (!shift) throw new NotFoundError('Shift', input.shiftId);

      return ctx.db.employeeShift.upsert({
        where: {
          employeeId_shiftId_date: {
            employeeId: input.employeeId,
            shiftId: input.shiftId,
            date: input.date,
          },
        },
        create: { ...input, organizationId: orgId },
        update: { startTime: input.startTime, endTime: input.endTime, notes: input.notes },
      });
    }),

    delete: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      const assignment = await ctx.db.employeeShift.findFirst({
        where: { id: input.id, organizationId: ctx.user.organizationId },
      });
      if (!assignment) throw new NotFoundError('EmployeeShift', input.id);

      await ctx.db.employeeShift.delete({ where: { id: input.id } });
      return { success: true };
    }),
  },
});
