/**
 * jobs.ts
 * Job / project tracking. One job can produce one invoice.
 */

import { z } from 'zod';
import { protectedProcedure, adminProcedure, t } from '@/lib/trpc/server';
import { TRPCError } from '@trpc/server';
import { assertOwnership, requireOrgId } from './_shared';

const JOB_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as const;

const jobInput = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  customerId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const jobRouter = t.router({
  // -------------------------------------------------------------------------
  // List — paginated, filterable by status / customer
  // -------------------------------------------------------------------------
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.enum(JOB_STATUSES).optional(),
        customerId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);
      const { search, status, customerId } = input;

      const where: any = {
        organizationId: orgId,
        ...(status && { status }),
        ...(customerId && { customerId }),
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }),
      };

      return await ctx.prisma.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          startDate: true,
          endDate: true,
          completedAt: true,
          createdAt: true,
          customer: { select: { id: true, name: true } },
          _count: { select: { invoices: true } },
        },
      });
    }),

  // -------------------------------------------------------------------------
  // Get single job with related invoices
  // -------------------------------------------------------------------------
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const orgId = requireOrgId(ctx.organizationId);

    const job = await ctx.prisma.job.findUnique({
      where: { id: input.id },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        invoices: {
          where: { status: { not: 'DELETED' } },
          select: {
            id: true,
            serial: true,
            type: true,
            status: true,
            paymentStatus: true,
            total: true,
            date: true,
          },
        },
      },
    });

    assertOwnership(job, orgId, 'Job');
    return job;
  }),

  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------
  create: protectedProcedure.input(jobInput).mutation(async ({ ctx, input }) => {
    const orgId = requireOrgId(ctx.organizationId);

    // Verify customer belongs to org if provided
    if (input.customerId) {
      const customer = await ctx.prisma.customer.findUnique({
        where: { id: input.customerId },
        select: { organizationId: true },
      });
      assertOwnership(customer, orgId, 'Customer');
    }

    return ctx.prisma.job.create({
      data: { ...input, organizationId: orgId, status: 'NOT_STARTED', createdById: ctx.user.id },
    });
  }),

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------
  update: protectedProcedure
    .input(z.object({ id: z.string() }).merge(jobInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);
      const { id, ...rest } = input;

      const existing = await ctx.prisma.job.findUnique({
        where: { id },
        select: { organizationId: true, status: true },
      });
      if (!existing) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Job is not exist' });
      }
      assertOwnership(existing, orgId, 'Job');

      if (existing.status === 'CANCELLED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot edit a cancelled job' });
      }

      return ctx.prisma.job.update({ where: { id }, data: rest });
    }),

  // -------------------------------------------------------------------------
  // Update status
  // -------------------------------------------------------------------------
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(JOB_STATUSES),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      const existing = await ctx.prisma.job.findUnique({
        where: { id: input.id },
        select: { organizationId: true, status: true },
      });
      if (!existing) {
        throw new TRPCError({
          message: 'job is not exists',
          code: 'BAD_REQUEST',
        });
      }
      assertOwnership(existing, orgId, 'Job');

      // Validate transitions
      const ALLOWED_TRANSITIONS: Record<string, string[]> = {
        NOT_STARTED: ['IN_PROGRESS', 'CANCELLED'],
        IN_PROGRESS: ['ON_HOLD', 'COMPLETED', 'CANCELLED'],
        ON_HOLD: ['IN_PROGRESS', 'CANCELLED'],
        COMPLETED: [], // terminal
        CANCELLED: [], // terminal
      };

      if (!ALLOWED_TRANSITIONS[existing.status]?.includes(input.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot transition job from ${existing.status} to ${input.status}`,
        });
      }

      const data: any = { status: input.status };
      if (input.status === 'COMPLETED') data.completedAt = new Date();

      return ctx.prisma.job.update({ where: { id: input.id }, data });
    }),

  // -------------------------------------------------------------------------
  // Delete (admin only, only non-started/cancelled jobs)
  // -------------------------------------------------------------------------
  delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const orgId = requireOrgId(ctx.organizationId);

    const existing = await ctx.prisma.job.findUnique({
      where: { id: input.id },
      select: {
        organizationId: true,
        status: true,
        _count: { select: { invoices: true } },
      },
    });
    assertOwnership(existing, orgId, 'Job');

    if (!existing || existing._count.invoices > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot delete a job that has invoices',
      });
    }

    if (!['NOT_STARTED', 'CANCELLED'].includes(existing.status)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Only not-started or cancelled jobs can be deleted',
      });
    }

    return ctx.prisma.job.delete({ where: { id: input.id } });
  }),
});
