import { z } from 'zod';
import { ConflictError, NotFoundError, UnprocessableError } from '@/lib/error';
import { assertCan, orgProcedure, router } from '@/lib/trpc/context';
import { paginatedResponse, toPrismaPage } from '@/lib/validations';
import { writeAuditLog } from '../shared/audit.service';
import { hrListSchema, trainingStatusSchema, hrOptionalDateField } from './hr.schemas';

const trainingCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  provider: z.string().max(255).optional(),
  durationHours: z.number().int().min(0).optional(),
  cost: z.number().min(0).optional(),
  currency: z.enum(['USD', 'BHD', 'EUR', 'GBP', 'JPY', 'AED', 'SAR', 'KWD', 'QAR', 'OMR']).default('BHD'),
  startDate: hrOptionalDateField(),
  endDate: hrOptionalDateField(),
  isMandatory: z.boolean().default(false),
});

export const trainingRouter = router({
  list: orgProcedure
    .input(
      hrListSchema.extend({
        status: trainingStatusSchema.optional(),
        isMandatory: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'training:read', 'Training');
      const { search, sortBy, sortOrder, status, isMandatory, ...pagination } = input;
      const { skip, take } = toPrismaPage(pagination);
      const orgId = ctx.user.organizationId;

      const where: Record<string, unknown> = { organizationId: orgId };
      if (status) where.status = status;
      if (isMandatory !== undefined) where.isMandatory = isMandatory;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' as const } },
          { provider: { contains: search, mode: 'insensitive' as const } },
        ];
      }

      const [trainings, total] = await ctx.db.$transaction([
        ctx.db.training.findMany({
          where,
          skip,
          take,
          orderBy: { [sortBy]: sortOrder },
          include: { _count: { select: { enrollments: true } } },
        }),
        ctx.db.training.count({ where }),
      ]);

      return paginatedResponse(trainings, total, pagination);
    }),

  byId: orgProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'training:read', 'Training');

    const training = await ctx.db.training.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId },
      include: {
        _count: { select: { enrollments: true } },
        enrollments: {
          include: {
            employee: { select: { id: true, employeeCode: true, user: { select: { name: true } } } },
          },
        },
      },
    });
    if (!training) throw new NotFoundError('Training', input.id);
    return training;
  }),

  create: orgProcedure.input(trainingCreateSchema).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'training:create', 'Training');
    const orgId = ctx.user.organizationId;

    return ctx.db.$transaction(async (tx) => {
      const training = await tx.training.create({ data: { ...input, organizationId: orgId } });

      await writeAuditLog(
        { entityType: 'Training', entityId: training.id, action: 'CREATE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
        tx,
      );

      return training;
    });
  }),

  update: orgProcedure
    .input(z.object({ id: z.string() }).merge(trainingCreateSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const orgId = ctx.user.organizationId;

      const existing = await ctx.db.training.findFirst({
        where: { id, organizationId: orgId },
      });
      if (!existing) throw new NotFoundError('Training', id);

      assertCan(ctx.ability, 'training:update', 'Training', existing as Record<string, unknown>);

      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.training.update({ where: { id }, data });

        await writeAuditLog(
          { entityType: 'Training', entityId: id, action: 'UPDATE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
          tx,
        );

        return updated;
      });
    }),

  delete: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const orgId = ctx.user.organizationId;

    const existing = await ctx.db.training.findFirst({
      where: { id: input.id, organizationId: orgId },
    });
    if (!existing) throw new NotFoundError('Training', input.id);

    assertCan(ctx.ability, 'training:delete', 'Training', existing as Record<string, unknown>);

    await ctx.db.$transaction(async (tx) => {
      await tx.trainingEnrollment.deleteMany({ where: { trainingId: input.id } });
      await tx.training.delete({ where: { id: input.id } });

      await writeAuditLog(
        { entityType: 'Training', entityId: input.id, action: 'DELETE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
        tx,
      );
    });

    return { success: true };
  }),

  enrollments: {
    list: orgProcedure
      .input(
        z.object({
          trainingId: z.string().optional(),
          employeeId: z.string().optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'training:read', 'Training');

        const where: Record<string, unknown> = { organizationId: ctx.user.organizationId };
        if (input.trainingId) where.trainingId = input.trainingId;
        if (input.employeeId) where.employeeId = input.employeeId;

        return ctx.db.trainingEnrollment.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          include: {
            training: { select: { id: true, name: true } },
            employee: { select: { id: true, employeeCode: true, user: { select: { name: true } } } },
          },
        });
      }),

    enroll: orgProcedure
      .input(z.object({ trainingId: z.string(), employeeId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'training:enroll', 'Training');
        const orgId = ctx.user.organizationId;

        const training = await ctx.db.training.findFirst({
          where: { id: input.trainingId, organizationId: orgId },
          select: { id: true },
        });
        if (!training) throw new NotFoundError('Training', input.trainingId);

        const employee = await ctx.db.employee.findFirst({
          where: { id: input.employeeId, organizationId: orgId, deletedAt: null },
          select: { id: true },
        });
        if (!employee) throw new NotFoundError('Employee', input.employeeId);

        const existing = await ctx.db.trainingEnrollment.findFirst({
          where: { trainingId: input.trainingId, employeeId: input.employeeId },
          select: { id: true },
        });
        if (existing) throw new ConflictError('Employee is already enrolled in this training.');

        return ctx.db.trainingEnrollment.create({
          data: { ...input, organizationId: orgId },
        });
      }),

    updateStatus: orgProcedure
      .input(
        z.object({
          id: z.string(),
          status: trainingStatusSchema,
          score: z.number().min(0).max(100).optional(),
          notes: z.string().max(2000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        assertCan(ctx.ability, 'training:enroll', 'Training');

        const existing = await ctx.db.trainingEnrollment.findFirst({
          where: { id, organizationId: ctx.user.organizationId },
        });
        if (!existing) throw new NotFoundError('TrainingEnrollment', id);

        return ctx.db.trainingEnrollment.update({
          where: { id },
          data: {
            ...data,
            completedAt: input.status === 'COMPLETED' ? new Date() : undefined,
          },
        });
      }),

    unenroll: orgProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'training:enroll', 'Training');

        const existing = await ctx.db.trainingEnrollment.findFirst({
          where: { id: input.id, organizationId: ctx.user.organizationId },
        });
        if (!existing) throw new NotFoundError('TrainingEnrollment', input.id);
        if (existing.status !== 'PLANNED') {
          throw new UnprocessableError('Cannot unenroll from an in-progress or completed training.');
        }

        await ctx.db.trainingEnrollment.delete({ where: { id: input.id } });
        return { success: true };
      }),
  },
});
