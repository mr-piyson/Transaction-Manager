import { z } from 'zod';
import { NotFoundError, UnprocessableError } from '@/lib/error';
import { assertCan, orgProcedure, router } from '@/lib/trpc/context';
import { paginatedResponse, toPrismaPage } from '@/lib/validations';
import { writeAuditLog } from '../shared/audit.service';
import { hrListSchema, grievanceStatusSchema, disciplinaryActionTypeSchema } from './hr.schemas';

// ── Grievances ───────────────────────────────────────────────────────────────

export const employeeRelationsRouter = router({
  grievances: {
    list: orgProcedure
      .input(
        hrListSchema.extend({
          employeeId: z.string().optional(),
          status: grievanceStatusSchema.optional(),
          assignedToId: z.string().optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'grievance:read', 'Grievance');
        const { search, sortBy, sortOrder, employeeId, status, assignedToId, ...pagination } = input;
        const { skip, take } = toPrismaPage(pagination);
        const orgId = ctx.user.organizationId;

        const where: Record<string, unknown> = { organizationId: orgId };
        if (employeeId) where.employeeId = employeeId;
        if (status) where.status = status;
        if (assignedToId) where.assignedToId = assignedToId;
        if (search) {
          where.OR = [
            { subject: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ];
        }

        const [grievances, total] = await ctx.db.$transaction([
          ctx.db.grievance.findMany({
            where,
            skip,
            take,
            orderBy: { [sortBy]: sortOrder },
            include: {
              employee: { select: { id: true, employeeCode: true, user: { select: { name: true } } } },
              assignedTo: { select: { id: true, name: true } },
            },
          }),
          ctx.db.grievance.count({ where }),
        ]);

        return paginatedResponse(grievances, total, pagination);
      }),

    byId: orgProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'grievance:read', 'Grievance');

      const grievance = await ctx.db.grievance.findFirst({
        where: { id: input.id, organizationId: ctx.user.organizationId },
        include: {
          employee: { select: { id: true, employeeCode: true, user: { select: { id: true, name: true, email: true } } } },
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      });
      if (!grievance) throw new NotFoundError('Grievance', input.id);
      return grievance;
    }),

    create: orgProcedure
      .input(
        z.object({
          employeeId: z.string(),
          subject: z.string().min(1).max(500),
          description: z.string().min(1).max(5000),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'grievance:create', 'Grievance');
        const orgId = ctx.user.organizationId;

        const employee = await ctx.db.employee.findFirst({
          where: { id: input.employeeId, organizationId: orgId, deletedAt: null },
          select: { id: true },
        });
        if (!employee) throw new NotFoundError('Employee', input.employeeId);

        return ctx.db.$transaction(async (tx) => {
          const grievance = await tx.grievance.create({
            data: { ...input, organizationId: orgId },
          });

          await writeAuditLog(
            { entityType: 'Grievance', entityId: grievance.id, action: 'CREATE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
            tx,
          );

          return grievance;
        });
      }),

    assign: orgProcedure
      .input(z.object({ id: z.string(), assignedToId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'grievance:update', 'Grievance');
        const orgId = ctx.user.organizationId;

        const grievance = await ctx.db.grievance.findFirst({
          where: { id: input.id, organizationId: orgId },
        });
        if (!grievance) throw new NotFoundError('Grievance', input.id);

        return ctx.db.grievance.update({
          where: { id: input.id },
          data: { assignedToId: input.assignedToId },
        });
      }),

    updateStatus: orgProcedure
      .input(
        z.object({
          id: z.string(),
          status: grievanceStatusSchema,
          resolution: z.string().max(5000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'grievance:resolve', 'Grievance');
        const orgId = ctx.user.organizationId;

        const grievance = await ctx.db.grievance.findFirst({
          where: { id: input.id, organizationId: orgId },
        });
        if (!grievance) throw new NotFoundError('Grievance', input.id);

        if (grievance.status === 'CLOSED') {
          throw new UnprocessableError('Cannot update a closed grievance.');
        }

        if ((input.status === 'RESOLVED' || input.status === 'CLOSED') && !input.resolution) {
          throw new UnprocessableError('Resolution is required when resolving or closing a grievance.');
        }

        return ctx.db.$transaction(async (tx) => {
          const updated = await tx.grievance.update({
            where: { id: input.id },
            data: {
              status: input.status,
              resolution: input.resolution,
              resolvedAt: ['RESOLVED', 'CLOSED'].includes(input.status) ? new Date() : undefined,
            },
          });

          await writeAuditLog(
            {
              entityType: 'Grievance',
              entityId: input.id,
              action: 'STATUS_CHANGE',
              diff: { status: { before: grievance.status, after: input.status } },
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

      const existing = await ctx.db.grievance.findFirst({
        where: { id: input.id, organizationId: orgId },
      });
      if (!existing) throw new NotFoundError('Grievance', input.id);

      assertCan(ctx.ability, 'grievance:update', 'Grievance', existing as Record<string, unknown>);

      if (existing.status !== 'OPEN') {
        throw new UnprocessableError('Only OPEN grievances can be deleted.');
      }

      await ctx.db.$transaction(async (tx) => {
        await tx.grievance.delete({ where: { id: input.id } });

        await writeAuditLog(
          { entityType: 'Grievance', entityId: input.id, action: 'DELETE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
          tx,
        );
      });

      return { success: true };
    }),
  },

  // ── Disciplinary Actions ──────────────────────────────────────────────────
  disciplinaryActions: {
    list: orgProcedure
      .input(
        hrListSchema.extend({
          employeeId: z.string().optional(),
          type: disciplinaryActionTypeSchema.optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'disciplinary:read', 'DisciplinaryAction');
        const { search, sortBy, sortOrder, employeeId, type, ...pagination } = input;
        const { skip, take } = toPrismaPage(pagination);
        const orgId = ctx.user.organizationId;

        const where: Record<string, unknown> = { organizationId: orgId };
        if (employeeId) where.employeeId = employeeId;
        if (type) where.type = type;

        const [actions, total] = await ctx.db.$transaction([
          ctx.db.disciplinaryAction.findMany({
            where,
            skip,
            take,
            orderBy: { [sortBy]: sortOrder },
            include: {
              employee: { select: { id: true, employeeCode: true, user: { select: { name: true } } } },
              issuedBy: { select: { id: true, name: true } },
            },
          }),
          ctx.db.disciplinaryAction.count({ where }),
        ]);

        return paginatedResponse(actions, total, pagination);
      }),

    create: orgProcedure
      .input(
        z.object({
          employeeId: z.string(),
          type: disciplinaryActionTypeSchema,
          reason: z.string().min(1).max(5000),
          documentUrl: z.string().optional(),
          notes: z.string().max(2000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        assertCan(ctx.ability, 'disciplinary:create', 'DisciplinaryAction');
        const orgId = ctx.user.organizationId;

        const employee = await ctx.db.employee.findFirst({
          where: { id: input.employeeId, organizationId: orgId, deletedAt: null },
        });
        if (!employee) throw new NotFoundError('Employee', input.employeeId);

        return ctx.db.$transaction(async (tx) => {
          const action = await tx.disciplinaryAction.create({
            data: {
              ...input,
              issuedById: ctx.user.id,
              organizationId: orgId,
            },
          });

          if (input.type === 'SUSPENSION' || input.type === 'TERMINATION') {
            const newStatus = input.type === 'SUSPENSION' ? 'SUSPENDED' as const : 'TERMINATED' as const;
            await tx.employee.update({
              where: { id: input.employeeId },
              data: { status: newStatus, terminationDate: newStatus === 'TERMINATED' ? new Date() : undefined },
            });

            await tx.employeeStatusHistory.create({
              data: {
                previousStatus: employee.status,
                newStatus,
                reason: `Disciplinary: ${input.type} — ${input.reason}`,
                employeeId: input.employeeId,
                changedById: ctx.user.id,
                organizationId: orgId,
              },
            });
          }

          await writeAuditLog(
            { entityType: 'DisciplinaryAction', entityId: action.id, action: 'CREATE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
            tx,
          );

          return action;
        });
      }),

    delete: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;

      const existing = await ctx.db.disciplinaryAction.findFirst({
        where: { id: input.id, organizationId: orgId },
      });
      if (!existing) throw new NotFoundError('DisciplinaryAction', input.id);

      assertCan(ctx.ability, 'disciplinary:update', 'DisciplinaryAction', existing as Record<string, unknown>);

      await ctx.db.$transaction(async (tx) => {
        await tx.disciplinaryAction.delete({ where: { id: input.id } });

        await writeAuditLog(
          { entityType: 'DisciplinaryAction', entityId: input.id, action: 'DELETE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
          tx,
        );
      });

      return { success: true };
    }),
  },
});
