import { z } from 'zod';
import { NotFoundError, UnprocessableError } from '@/lib/error';
import { assertCan, orgProcedure, router } from '@/lib/trpc/context';
import { paginatedResponse, toPrismaPage } from '@/lib/validations';
import { writeAuditLog } from '../shared/audit.service';
import { hrListSchema, performanceRatingSchema } from './hr.schemas';

const reviewCreateSchema = z.object({
  employeeId: z.string(),
  reviewerId: z.string(),
  reviewPeriod: z.string().min(1).max(100),
  reviewDate: z.coerce.date().default(() => new Date()),
  rating: performanceRatingSchema,
  comments: z.string().max(5000).optional(),
  goals: z.string().max(5000).optional(),
  strengths: z.string().max(5000).optional(),
  weaknesses: z.string().max(5000).optional(),
});

const reviewUpdateSchema = reviewCreateSchema.partial().extend({
  id: z.string(),
});

export const performanceRouter = router({
  list: orgProcedure
    .input(
      hrListSchema.extend({
        employeeId: z.string().optional(),
        reviewerId: z.string().optional(),
        status: z.string().optional(),
        reviewPeriod: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'performance:read', 'PerformanceReview');
      const { search, sortBy, sortOrder, employeeId, reviewerId, status, reviewPeriod, ...pagination } = input;
      const { skip, take } = toPrismaPage(pagination);
      const orgId = ctx.user.organizationId;

      const where: Record<string, unknown> = { organizationId: orgId };
      if (employeeId) where.employeeId = employeeId;
      if (reviewerId) where.reviewerId = reviewerId;
      if (status) where.status = status;
      if (reviewPeriod) where.reviewPeriod = reviewPeriod;

      const [reviews, total] = await ctx.db.$transaction([
        ctx.db.performanceReview.findMany({
          where,
          skip,
          take,
          orderBy: { [sortBy]: sortOrder },
          include: {
            employee: { select: { id: true, employeeCode: true, user: { select: { name: true } } } },
            reviewer: { select: { id: true, name: true } },
          },
        }),
        ctx.db.performanceReview.count({ where }),
      ]);

      return paginatedResponse(reviews, total, pagination);
    }),

  byId: orgProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'performance:read', 'PerformanceReview');

    const review = await ctx.db.performanceReview.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId },
      include: {
        employee: { select: { id: true, employeeCode: true, user: { select: { id: true, name: true, email: true } } } },
        reviewer: { select: { id: true, name: true, email: true } },
      },
    });
    if (!review) throw new NotFoundError('PerformanceReview', input.id);
    return review;
  }),

  create: orgProcedure.input(reviewCreateSchema).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'performance:create', 'PerformanceReview');
    const orgId = ctx.user.organizationId;

    const employee = await ctx.db.employee.findFirst({
      where: { id: input.employeeId, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!employee) throw new NotFoundError('Employee', input.employeeId);

    return ctx.db.$transaction(async (tx) => {
      const review = await tx.performanceReview.create({
        data: { ...input, organizationId: orgId },
      });

      await writeAuditLog(
        { entityType: 'PerformanceReview', entityId: review.id, action: 'CREATE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
        tx,
      );

      return review;
    });
  }),

  update: orgProcedure.input(reviewUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const orgId = ctx.user.organizationId;

    const existing = await ctx.db.performanceReview.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) throw new NotFoundError('PerformanceReview', id);

    assertCan(ctx.ability, 'performance:update', 'PerformanceReview', existing as Record<string, unknown>);

    if (existing.status !== 'DRAFT') {
      throw new UnprocessableError(`Cannot edit a review in "${existing.status}" status.`);
    }

    return ctx.db.$transaction(async (tx) => {
      const updated = await tx.performanceReview.update({ where: { id }, data });

      await writeAuditLog(
        { entityType: 'PerformanceReview', entityId: id, action: 'UPDATE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
        tx,
      );

      return updated;
    });
  }),

  submit: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'performance:submit', 'PerformanceReview');
      const orgId = ctx.user.organizationId;

      const existing = await ctx.db.performanceReview.findFirst({
        where: { id: input.id, organizationId: orgId },
      });
      if (!existing) throw new NotFoundError('PerformanceReview', input.id);
      if (existing.status !== 'DRAFT') {
        throw new UnprocessableError(`Cannot submit a review in "${existing.status}" status.`);
      }

      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.performanceReview.update({
          where: { id: input.id },
          data: { status: 'SUBMITTED' },
        });

        await writeAuditLog(
          {
            entityType: 'PerformanceReview',
            entityId: input.id,
            action: 'STATUS_CHANGE',
            diff: { status: { before: existing.status, after: 'SUBMITTED' } },
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return updated;
      });
    }),

  acknowledge: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'performance:acknowledge', 'PerformanceReview');
      const orgId = ctx.user.organizationId;

      const existing = await ctx.db.performanceReview.findFirst({
        where: { id: input.id, organizationId: orgId },
      });
      if (!existing) throw new NotFoundError('PerformanceReview', input.id);
      if (existing.status !== 'SUBMITTED') {
        throw new UnprocessableError(`Cannot acknowledge a review in "${existing.status}" status.`);
      }

      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.performanceReview.update({
          where: { id: input.id },
          data: { status: 'ACKNOWLEDGED' },
        });

        await writeAuditLog(
          {
            entityType: 'PerformanceReview',
            entityId: input.id,
            action: 'STATUS_CHANGE',
            diff: { status: { before: existing.status, after: 'ACKNOWLEDGED' } },
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return updated;
      });
    }),

  delete: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const orgId = ctx.user.organizationId;

    const existing = await ctx.db.performanceReview.findFirst({
      where: { id: input.id, organizationId: orgId },
    });
    if (!existing) throw new NotFoundError('PerformanceReview', input.id);

    assertCan(ctx.ability, 'performance:delete', 'PerformanceReview', existing as Record<string, unknown>);

    if (existing.status !== 'DRAFT') {
      throw new UnprocessableError('Only DRAFT reviews can be deleted.');
    }

    await ctx.db.$transaction(async (tx) => {
      await tx.performanceReview.delete({ where: { id: input.id } });

      await writeAuditLog(
        { entityType: 'PerformanceReview', entityId: input.id, action: 'DELETE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
        tx,
      );
    });

    return { success: true };
  }),
});
