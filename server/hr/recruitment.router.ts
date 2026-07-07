import { z } from 'zod';
import { ConflictError, NotFoundError, UnprocessableError } from '@/lib/error';
import { assertCan, orgProcedure, router } from '@/lib/trpc/context';
import { paginatedResponse, toPrismaPage } from '@/lib/validations';
import { writeAuditLog } from '../shared/audit.service';
import { hrListSchema, candidateStatusSchema, interviewStageSchema, offerStatusSchema } from './hr.schemas';

const jobPostingSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(10000).optional(),
  requirements: z.string().max(10000).optional(),
  location: z.string().max(255).optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'TEMPORARY']).default('FULL_TIME'),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  currency: z.enum(['USD', 'BHD', 'EUR', 'GBP', 'JPY', 'AED', 'SAR', 'KWD', 'QAR', 'OMR']).default('BHD'),
  closingDate: z.coerce.date().optional(),
  departmentId: z.string().optional(),
});

export const recruitmentRouter = router({
  // ── Job Postings ──────────────────────────────────────────────────────────
  jobPostings: {
    list: orgProcedure
      .input(
        hrListSchema.extend({
          isActive: z.boolean().optional(),
          departmentId: z.string().optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'job-posting:read', 'JobPosting');
        const { search, sortBy, sortOrder, isActive, departmentId, ...pagination } = input;
        const { skip, take } = toPrismaPage(pagination);
        const orgId = ctx.user.organizationId;

        const where: Record<string, unknown> = { organizationId: orgId };
        if (isActive !== undefined) where.isActive = isActive;
        if (departmentId) where.departmentId = departmentId;
        if (search) {
          where.OR = [
            { title: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ];
        }

        const [postings, total] = await ctx.db.$transaction([
          ctx.db.jobPosting.findMany({
            where,
            skip,
            take,
            orderBy: { [sortBy]: sortOrder },
            include: {
              department: { select: { id: true, name: true } },
              _count: { select: { candidates: true } },
            },
          }),
          ctx.db.jobPosting.count({ where }),
        ]);

        return paginatedResponse(postings, total, pagination);
      }),

    byId: orgProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'job-posting:read', 'JobPosting');

      const posting = await ctx.db.jobPosting.findFirst({
        where: { id: input.id, organizationId: ctx.user.organizationId },
        include: {
          department: { select: { id: true, name: true } },
          _count: { select: { candidates: true } },
        },
      });
      if (!posting) throw new NotFoundError('JobPosting', input.id);
      return posting;
    }),

    create: orgProcedure.input(jobPostingSchema).mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'job-posting:create', 'JobPosting');
      const orgId = ctx.user.organizationId;

      if (input.departmentId) {
        const dept = await ctx.db.department.findFirst({
          where: { id: input.departmentId, organizationId: orgId, deletedAt: null },
          select: { id: true },
        });
        if (!dept) throw new NotFoundError('Department', input.departmentId);
      }

      return ctx.db.jobPosting.create({ data: { ...input, publishedAt: new Date(), organizationId: orgId } });
    }),

    update: orgProcedure
      .input(z.object({ id: z.string() }).merge(jobPostingSchema.partial()))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const orgId = ctx.user.organizationId;

        const existing = await ctx.db.jobPosting.findFirst({
          where: { id, organizationId: orgId },
        });
        if (!existing) throw new NotFoundError('JobPosting', id);

        assertCan(ctx.ability, 'job-posting:update', 'JobPosting', existing as Record<string, unknown>);

        return ctx.db.jobPosting.update({ where: { id }, data });
      }),

    delete: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;

      const existing = await ctx.db.jobPosting.findFirst({
        where: { id: input.id, organizationId: orgId },
      });
      if (!existing) throw new NotFoundError('JobPosting', input.id);

      assertCan(ctx.ability, 'job-posting:delete', 'JobPosting', existing as Record<string, unknown>);

      await ctx.db.$transaction(async (tx) => {
        await tx.candidate.updateMany({
          where: { jobPostingId: input.id },
          data: { jobPostingId: null },
        });
        await tx.jobPosting.delete({ where: { id: input.id } });

        await writeAuditLog(
          { entityType: 'JobPosting', entityId: input.id, action: 'DELETE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
          tx,
        );
      });

      return { success: true };
    }),
  },

  // ── Candidates ────────────────────────────────────────────────────────────
  candidates: {
    list: orgProcedure
      .input(
        hrListSchema.extend({
          jobPostingId: z.string().optional(),
          status: candidateStatusSchema.optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'candidate:read', 'Candidate');
        const { search, sortBy, sortOrder, jobPostingId, status, ...pagination } = input;
        const { skip, take } = toPrismaPage(pagination);
        const orgId = ctx.user.organizationId;

        const where: Record<string, unknown> = { organizationId: orgId };
        if (jobPostingId) where.jobPostingId = jobPostingId;
        if (status) where.status = status;
        if (search) {
          where.OR = [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ];
        }

        const [candidates, total] = await ctx.db.$transaction([
          ctx.db.candidate.findMany({
            where,
            skip,
            take,
            orderBy: { [sortBy]: sortOrder },
            include: {
              jobPosting: { select: { id: true, title: true } },
              interviewRounds: { orderBy: { scheduledAt: 'desc' }, take: 1 },
            },
          }),
          ctx.db.candidate.count({ where }),
        ]);

        return paginatedResponse(candidates, total, pagination);
      }),

    byId: orgProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'candidate:read', 'Candidate');

      const candidate = await ctx.db.candidate.findFirst({
        where: { id: input.id, organizationId: ctx.user.organizationId },
        include: {
          jobPosting: { select: { id: true, title: true } },
          interviewRounds: { orderBy: { scheduledAt: 'asc' } },
          offer: true,
        },
      });
      if (!candidate) throw new NotFoundError('Candidate', input.id);
      return candidate;
    }),

    create: orgProcedure
      .input(
        z.object({
          firstName: z.string().min(1).max(255),
          lastName: z.string().min(1).max(255),
          email: z.string().email(),
          phone: z.string().max(50).optional(),
          resumeUrl: z.string().optional(),
          coverLetter: z.string().max(10000).optional(),
          source: z.string().max(100).optional(),
          notes: z.string().max(5000).optional(),
          jobPostingId: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'candidate:create', 'Candidate');
        const orgId = ctx.user.organizationId;

        const existing = await ctx.db.candidate.findFirst({
          where: { email: input.email, organizationId: orgId },
          select: { id: true },
        });
        if (existing) throw new ConflictError('A candidate with this email already exists.');

        return ctx.db.$transaction(async (tx) => {
          const candidate = await tx.candidate.create({ data: { ...input, organizationId: orgId } });

          await writeAuditLog(
            { entityType: 'Candidate', entityId: candidate.id, action: 'CREATE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
            tx,
          );

          return candidate;
        });
      }),

    update: orgProcedure
      .input(z.object({ id: z.string(), firstName: z.string().min(1).max(255).optional(), lastName: z.string().min(1).max(255).optional(), phone: z.string().max(50).optional(), resumeUrl: z.string().optional(), coverLetter: z.string().max(10000).optional(), source: z.string().max(100).optional(), notes: z.string().max(5000).optional(), jobPostingId: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        assertCan(ctx.ability, 'candidate:update', 'Candidate');

        const existing = await ctx.db.candidate.findFirst({
          where: { id, organizationId: ctx.user.organizationId },
        });
        if (!existing) throw new NotFoundError('Candidate', id);

        return ctx.db.candidate.update({ where: { id }, data });
      }),

    updateStatus: orgProcedure
      .input(z.object({ id: z.string(), status: candidateStatusSchema }))
      .mutation(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'candidate:status:update', 'Candidate');
        const orgId = ctx.user.organizationId;

        const existing = await ctx.db.candidate.findFirst({
          where: { id: input.id, organizationId: orgId },
        });
        if (!existing) throw new NotFoundError('Candidate', input.id);

        if (input.status === 'HIRED' && existing.status !== 'OFFERED') {
          throw new UnprocessableError('Cannot hire a candidate who has not been offered.');
        }

        return ctx.db.$transaction(async (tx) => {
          const updated = await tx.candidate.update({
            where: { id: input.id },
            data: { status: input.status },
          });

          await writeAuditLog(
            {
              entityType: 'Candidate',
              entityId: input.id,
              action: 'STATUS_CHANGE',
              diff: { status: { before: existing.status, after: input.status } },
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

      const existing = await ctx.db.candidate.findFirst({
        where: { id: input.id, organizationId: orgId },
      });
      if (!existing) throw new NotFoundError('Candidate', input.id);

      assertCan(ctx.ability, 'candidate:delete', 'Candidate', existing as Record<string, unknown>);

      await ctx.db.$transaction(async (tx) => {
        await tx.interviewRound.deleteMany({ where: { candidateId: input.id } });
        await tx.offer.deleteMany({ where: { candidateId: input.id } });
        await tx.candidate.delete({ where: { id: input.id } });

        await writeAuditLog(
          { entityType: 'Candidate', entityId: input.id, action: 'DELETE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
          tx,
        );
      });

      return { success: true };
    }),

    // ── Interview Rounds ──────────────────────────────────────────────────
    interviewRounds: {
      list: orgProcedure
        .input(z.object({ candidateId: z.string() }))
        .query(async ({ ctx, input }) => {
          assertCan(ctx.ability, 'interview:read', 'InterviewRound');

          return ctx.db.interviewRound.findMany({
            where: {
              candidateId: input.candidateId,
              candidate: { organizationId: ctx.user.organizationId },
            },
            orderBy: { scheduledAt: 'asc' },
            include: {
              interviewer: { select: { id: true, name: true } },
            },
          });
        }),

      create: orgProcedure
        .input(
          z.object({
            candidateId: z.string(),
            stage: interviewStageSchema,
            scheduledAt: z.coerce.date(),
            durationMin: z.number().int().optional(),
            interviewerId: z.string().optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          assertCan(ctx.ability, 'interview:create', 'InterviewRound');
          const orgId = ctx.user.organizationId;

          const candidate = await ctx.db.candidate.findFirst({
            where: { id: input.candidateId, organizationId: orgId },
            select: { id: true },
          });
          if (!candidate) throw new NotFoundError('Candidate', input.candidateId);

          return ctx.db.interviewRound.create({
            data: { ...input, organizationId: orgId },
          });
        }),

      update: orgProcedure
        .input(
          z.object({
            id: z.string(),
            scheduledAt: z.coerce.date().optional(),
            durationMin: z.number().int().optional(),
            result: z.enum(['PENDING', 'PASSED', 'FAILED', 'CANCELLED']).optional(),
            feedback: z.string().max(5000).optional(),
            score: z.number().min(0).max(100).optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const { id, ...data } = input;
          assertCan(ctx.ability, 'interview:update', 'InterviewRound');

          const existing = await ctx.db.interviewRound.findFirst({
            where: { id, candidate: { organizationId: ctx.user.organizationId } },
          });
          if (!existing) throw new NotFoundError('InterviewRound', id);

          return ctx.db.interviewRound.update({ where: { id }, data });
        }),
    },

    // ── Offers ───────────────────────────────────────────────────────────
    offer: {
      get: orgProcedure
        .input(z.object({ candidateId: z.string() }))
        .query(async ({ ctx, input }) => {
          assertCan(ctx.ability, 'offer:read', 'Offer');

          const offer = await ctx.db.offer.findFirst({
            where: {
              candidateId: input.candidateId,
              candidate: { organizationId: ctx.user.organizationId },
            },
            include: {
              candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
              issuedBy: { select: { id: true, name: true } },
            },
          });
          if (!offer) throw new NotFoundError('Offer', input.candidateId);
          return offer;
        }),

      create: orgProcedure
        .input(
          z.object({
            candidateId: z.string(),
            position: z.string().min(1).max(255),
            salaryAmount: z.number().min(0),
            currency: z.enum(['USD', 'BHD', 'EUR', 'GBP', 'JPY', 'AED', 'SAR', 'KWD', 'QAR', 'OMR']).default('BHD'),
            startDate: z.coerce.date(),
            expiryDate: z.coerce.date().optional(),
            notes: z.string().max(5000).optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          assertCan(ctx.ability, 'offer:create', 'Offer');
          const orgId = ctx.user.organizationId;

          const candidate = await ctx.db.candidate.findFirst({
            where: { id: input.candidateId, organizationId: orgId },
          });
          if (!candidate) throw new NotFoundError('Candidate', input.candidateId);

          const existingOffer = await ctx.db.offer.findFirst({
            where: { candidateId: input.candidateId },
            select: { id: true },
          });
          if (existingOffer) throw new ConflictError('An offer already exists for this candidate.');

          return ctx.db.$transaction(async (tx) => {
            const offer = await tx.offer.create({
              data: {
                ...input,
                issuedById: ctx.user.id,
                organizationId: orgId,
              },
            });

            await tx.candidate.update({
              where: { id: input.candidateId },
              data: { status: 'OFFERED' },
            });

            await writeAuditLog(
              { entityType: 'Offer', entityId: offer.id, action: 'CREATE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
              tx,
            );

            return offer;
          });
        }),

      respond: orgProcedure
        .input(z.object({ id: z.string(), status: z.enum(['ACCEPTED', 'REJECTED']) }))
        .mutation(async ({ ctx, input }) => {
          assertCan(ctx.ability, 'offer:respond', 'Offer');
          const orgId = ctx.user.organizationId;

          const offer = await ctx.db.offer.findFirst({
            where: { id: input.id, organizationId: orgId },
          });
          if (!offer) throw new NotFoundError('Offer', input.id);
          if (offer.status !== 'PENDING') {
            throw new UnprocessableError(`Offer is already in "${offer.status}" status.`);
          }

          return ctx.db.$transaction(async (tx) => {
            const updated = await tx.offer.update({
              where: { id: input.id },
              data: {
                status: input.status,
                respondedAt: new Date(),
              },
            });

            await tx.candidate.update({
              where: { id: offer.candidateId },
              data: { status: input.status === 'ACCEPTED' ? 'HIRED' : 'REJECTED' },
            });

            await writeAuditLog(
              {
                entityType: 'Offer',
                entityId: input.id,
                action: 'STATUS_CHANGE',
                diff: { status: { before: offer.status, after: input.status } },
                organizationId: orgId,
                userId: ctx.user.id,
                ipAddress: ctx.ipAddress,
              },
              tx,
            );

            return updated;
          });
        }),

      withdraw: orgProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
          assertCan(ctx.ability, 'offer:update', 'Offer');
          const orgId = ctx.user.organizationId;

          const offer = await ctx.db.offer.findFirst({
            where: { id: input.id, organizationId: orgId },
          });
          if (!offer) throw new NotFoundError('Offer', input.id);
          if (!['PENDING', 'ACCEPTED'].includes(offer.status)) {
            throw new UnprocessableError('Only PENDING or ACCEPTED offers can be withdrawn.');
          }

          return ctx.db.offer.update({
            where: { id: input.id },
            data: { status: 'WITHDRAWN' },
          });
        }),
    },
  },
});
