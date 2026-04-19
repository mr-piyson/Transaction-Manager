import { z } from 'zod';
import { protectedProcedure, t } from '@/lib/trpc/server';
import { TRPCError } from '@trpc/server';
import db from '@/lib/db';

// Zod schema matching the Job model in schema.prisma [cite: 22, 23, 24]
const jobInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']).default('NOT_STARTED'),
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
  customerId: z.string().min(1),
});

export const jobRouter = t.router({
  // Fetch all jobs for the user's current organization
  getJobs: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await db.job.findMany({
        where: {
          customer: {
            organizationId: ctx.user.organizationId,
          },
        },
        include: {
          customer: true,
        },
        orderBy: { updatedAt: 'desc' },
      });
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch jobs',
      });
    }
  }),

  // Fetch a single job with its financial links [cite: 24, 27, 30]
  getJobById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const job = await db.job.findFirst({
          where: {
            id: input.id,
            customer: { organizationId: ctx.user.organizationId },
          },
          include: {
            customer: true,
            invoices: true,
          },
        });

        if (!job) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found' });
        }
        return job;
      } catch (error) {
        console.log('Error fetching job by ID:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch job details',
        });
      }
    }),

  // Create a new job record [cite: 22, 24]
  createJob: protectedProcedure.input(jobInputSchema).mutation(async ({ input, ctx }) => {
    try {
      // Verify customer belongs to the organization before creating
      const customer = await db.customer.findFirst({
        where: { id: input.customerId, organizationId: ctx.user.organizationId },
      });

      if (!customer) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Invalid customer selection' });
      }

      return await db.job.create({
        data: {
          title: input.title,
          description: input.description,
          status: input.status,
          startDate: input.startDate,
          customerId: input.customerId,
        },
      });
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create job',
      });
    }
  }),

  // Update job details or status [cite: 23, 24]
  updateJob: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: jobInputSchema.partial(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await db.job.update({
          where: {
            id: input.id,
            customer: { organizationId: ctx.user.organizationId },
          },
          data: input.data,
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update job',
        });
      }
    }),

  // Delete a job record (Cascade will handle relation cleanup if configured)
  deleteJob: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await db.job.delete({
          where: {
            id: input.id,
            customer: { organizationId: ctx.user.organizationId },
          },
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete job',
        });
      }
    }),
});
