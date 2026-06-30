import { z } from 'zod';
import { NotFoundError, UnprocessableError, StaleDataError } from '@/lib/error';
import { generateSerial } from '@/lib/sequences';
import { assertCan, orgProcedure, router } from '@/lib/trpc/context';
import {
  currencyCodeSchema,
  offsetPaginationSchema,
  paginatedResponse,
  sortOrderSchema,
  toPrismaPage,
} from '@/lib/validations';
import { writeAuditLog } from './audit.service';

const contractBaseSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED']).default('DRAFT'),
  contractValue: z.number().min(0).optional(),
  currency: currencyCodeSchema.default('BHD'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  renewalDate: z.coerce.date().optional(),
  renewalAlertDays: z.number().int().min(0).max(365).default(30),
  notes: z.string().max(5000).optional(),
  customerId: z.string().optional(),
});

const createContractSchema = contractBaseSchema;
const updateContractSchema = contractBaseSchema.partial().extend({
  id: z.string(),
});

const listContractsSchema = z.object({
  ...offsetPaginationSchema.shape,
  search: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED']).optional(),
  customerId: z.string().optional(),
  expiringSoon: z.boolean().optional(),
  sortBy: z
    .enum(['title', 'startDate', 'endDate', 'contractValue', 'createdAt'])
    .default('endDate'),
  sortOrder: sortOrderSchema,
});

export const contractsRouter = router({
  list: orgProcedure.input(listContractsSchema).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'invoice:read', 'Invoice');

    const { search, status, customerId, expiringSoon, sortBy, sortOrder, ...pagination } = input;
    const { skip, take } = toPrismaPage(pagination);
    const orgId = ctx.user.organizationId;

    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const where: Record<string, unknown> = {
      organizationId: orgId,
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(customerId ? { customerId } : {}),
      ...(expiringSoon ? { endDate: { lte: thirtyDaysFromNow }, status: 'ACTIVE' } : {}),
      ...(search
        ? {
            OR: [
              { serial: { contains: search, mode: 'insensitive' as const } },
              { title: { contains: search, mode: 'insensitive' as const } },
              { customer: { name: { contains: search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };

    const [contracts, total] = await ctx.db.$transaction([
      ctx.db.contract.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          serial: true,
          title: true,
          status: true,
          contractValue: true,
          currency: true,
          startDate: true,
          endDate: true,
          renewalDate: true,
          renewalAlertDays: true,
          customer: { select: { id: true, name: true } },
          createdAt: true,
        },
      }),
      ctx.db.contract.count({ where }),
    ]);

    return paginatedResponse(contracts, total, pagination);
  }),

  byId: orgProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'invoice:read', 'Invoice');

    const contract = await ctx.db.contract.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId, deletedAt: null },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
      },
    });

    if (!contract) throw new NotFoundError('Contract', input.id);
    return contract;
  }),

  create: orgProcedure.input(createContractSchema).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'invoice:create', 'Invoice');

    const orgId = ctx.user.organizationId;

    if (input.customerId) {
      const customer = await ctx.db.customer.findFirst({
        where: { id: input.customerId, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      if (!customer) throw new NotFoundError('Customer', input.customerId);
    }

    if (new Date(input.endDate) <= new Date(input.startDate)) {
      throw new UnprocessableError('End date must be after start date.');
    }

    return ctx.db.$transaction(async (tx) => {
      const serial = await generateSerial({
        db: tx,
        organizationId: orgId,
        prefix: 'CTR',
      });

      const created = await tx.contract.create({
        data: {
          serial,
          ...input,
          organizationId: orgId,
          createdById: ctx.user.id,
        },
      });

      await writeAuditLog(
        {
          entityType: 'Contract',
          entityId: created.id,
          action: 'CREATE',
          diff: { serial: { before: null, after: serial } },
          organizationId: orgId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
        },
        tx,
      );

      return created;
    });
  }),

  update: orgProcedure.input(updateContractSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const orgId = ctx.user.organizationId;

    const existing = await ctx.db.contract.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!existing) throw new NotFoundError('Contract', id);

    assertCan(ctx.ability, 'invoice:update', 'Invoice', existing as Record<string, unknown>);

    return ctx.db.$transaction(async (tx) => {
      const updated = await tx.contract.update({
        where: { id },
        data: { ...data, version: { increment: 1 }, updatedById: ctx.user.id },
      });

      await writeAuditLog(
        {
          entityType: 'Contract',
          entityId: id,
          action: 'UPDATE',
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
    const existing = await ctx.db.contract.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!existing) throw new NotFoundError('Contract', input.id);

    assertCan(ctx.ability, 'invoice:delete', 'Invoice', existing as Record<string, unknown>);

    if (existing.status === 'ACTIVE') {
      throw new UnprocessableError('Active contracts must be terminated before deletion.');
    }

    await ctx.db.$transaction(async (tx) => {
      await tx.contract.update({
        where: { id: input.id },
        data: { deletedAt: new Date(), status: 'TERMINATED' },
      });

      await writeAuditLog(
        {
          entityType: 'Contract',
          entityId: input.id,
          action: 'DELETE',
          organizationId: ctx.user.organizationId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
        },
        tx,
      );
    });

    return { success: true };
  }),

  activate: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const orgId = ctx.user.organizationId;

    const contract = await ctx.db.contract.findFirst({
      where: { id: input.id, organizationId: orgId, deletedAt: null },
      select: { id: true, status: true, serial: true, startDate: true, endDate: true },
    });
    if (!contract) throw new NotFoundError('Contract', input.id);

    assertCan(ctx.ability, 'invoice:update', 'Invoice', contract as Record<string, unknown>);

    if (contract.status !== 'DRAFT') {
      throw new UnprocessableError(
        `Only DRAFT contracts can be activated. Current: ${contract.status}`,
      );
    }

    if (new Date(contract.endDate) <= new Date()) {
      throw new UnprocessableError('Cannot activate a contract whose end date is in the past.');
    }

    return ctx.db.$transaction(async (tx) => {
      const updated = await tx.contract.update({
        where: { id: input.id },
        data: { status: 'ACTIVE', version: { increment: 1 }, updatedById: ctx.user.id },
      });

      await writeAuditLog(
        {
          entityType: 'Contract',
          entityId: input.id,
          action: 'STATUS_CHANGE',
          diff: { status: { before: contract.status, after: 'ACTIVE' } },
          organizationId: orgId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
        },
        tx,
      );

      return updated;
    });
  }),

  expire: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const orgId = ctx.user.organizationId;

    const contract = await ctx.db.contract.findFirst({
      where: { id: input.id, organizationId: orgId, deletedAt: null },
      select: { id: true, status: true, serial: true },
    });
    if (!contract) throw new NotFoundError('Contract', input.id);

    assertCan(ctx.ability, 'invoice:update', 'Invoice', contract as Record<string, unknown>);

    if (contract.status !== 'ACTIVE') {
      throw new UnprocessableError(
        `Only ACTIVE contracts can be expired. Current: ${contract.status}`,
      );
    }

    return ctx.db.$transaction(async (tx) => {
      const updated = await tx.contract.update({
        where: { id: input.id },
        data: { status: 'EXPIRED', version: { increment: 1 }, updatedById: ctx.user.id },
      });

      await writeAuditLog(
        {
          entityType: 'Contract',
          entityId: input.id,
          action: 'STATUS_CHANGE',
          diff: { status: { before: contract.status, after: 'EXPIRED' } },
          organizationId: orgId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
        },
        tx,
      );

      return updated;
    });
  }),

  terminate: orgProcedure
    .input(z.object({ id: z.string(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;

      const contract = await ctx.db.contract.findFirst({
        where: { id: input.id, organizationId: orgId, deletedAt: null },
        select: { id: true, status: true, serial: true, notes: true },
      });
      if (!contract) throw new NotFoundError('Contract', input.id);

      assertCan(ctx.ability, 'invoice:update', 'Invoice', contract as Record<string, unknown>);

      if (!['ACTIVE', 'DRAFT'].includes(contract.status)) {
        throw new UnprocessableError(
          `Contract in status "${contract.status}" cannot be terminated.`,
        );
      }

      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.contract.update({
          where: { id: input.id },
          data: {
            status: 'TERMINATED',
            notes: input.reason
              ? `TERMINATED: ${input.reason}\n${contract.notes ?? ''}`
              : contract.notes,
            version: { increment: 1 },
            updatedById: ctx.user.id,
          },
        });

        await writeAuditLog(
          {
            entityType: 'Contract',
            entityId: input.id,
            action: 'STATUS_CHANGE',
            diff: {
              status: { before: contract.status, after: 'TERMINATED' },
              reason: { before: null, after: input.reason },
            },
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return updated;
      });
    }),

  renew: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const orgId = ctx.user.organizationId;

    const contract = await ctx.db.contract.findFirst({
      where: { id: input.id, organizationId: orgId, deletedAt: null },
      include: {
        customer: { select: { id: true, name: true } },
      },
    });
    if (!contract) throw new NotFoundError('Contract', input.id);

    assertCan(ctx.ability, 'invoice:create', 'Invoice');

    if (!['ACTIVE', 'EXPIRED'].includes(contract.status)) {
      throw new UnprocessableError(
        `Only ACTIVE or EXPIRED contracts can be renewed. Current: ${contract.status}`,
      );
    }

    const oldEnd = new Date(contract.endDate);
    const newStart = new Date(oldEnd.getTime() + 86_400_000);
    const duration = oldEnd.getTime() - new Date(contract.startDate).getTime();
    const newEnd = new Date(newStart.getTime() + duration);

    return ctx.db.$transaction(async (tx) => {
      const serial = await generateSerial({
        db: tx,
        organizationId: orgId,
        prefix: 'CTR',
      });

      const created = await tx.contract.create({
        data: {
          serial,
          title: contract.title,
          description: contract.description,
          status: 'DRAFT',
          contractValue: contract.contractValue,
          currency: contract.currency,
          startDate: newStart,
          endDate: newEnd,
          renewalDate: contract.renewalDate,
          renewalAlertDays: contract.renewalAlertDays,
          notes: contract.notes,
          customerId: contract.customerId,
          organizationId: orgId,
          createdById: ctx.user.id,
        },
      });

      await writeAuditLog(
        {
          entityType: 'Contract',
          entityId: created.id,
          action: 'CREATE',
          diff: {
            serial: { before: null, after: serial },
            renewedFrom: { before: null, after: input.id },
          },
          organizationId: orgId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
        },
        tx,
      );

      return created;
    });
  }),

  stats: orgProcedure.query(async ({ ctx }) => {
    const orgId = ctx.user.organizationId;

    const counts = await ctx.db.contract.groupBy({
      by: ['status'],
      where: { organizationId: orgId, deletedAt: null },
      _count: true,
    });

    const total = counts.reduce((sum, c) => sum + c._count, 0);
    const byStatus: Record<string, number> = {};
    for (const c of counts) {
      byStatus[c.status] = c._count;
    }

    const expiringSoon = await ctx.db.contract.count({
      where: {
        organizationId: orgId,
        deletedAt: null,
        status: 'ACTIVE',
        endDate: {
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    return { total, byStatus, expiringSoon };
  }),
});
