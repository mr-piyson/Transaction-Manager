import { z } from 'zod';
import { NotFoundError, UnprocessableError } from '@/lib/error';
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
  contractValue: z.number().min(0).optional(),
  currency: currencyCodeSchema.default('BHD'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  renewalDate: z.coerce.date().optional(),
  renewalAlertDays: z.number().int().min(0).max(365).default(30),
  notes: z.string().max(5000).optional(),
  customerId: z.string().cuid().optional(),
  isActive: z.boolean().default(true),
});

const createContractSchema = contractBaseSchema;
const updateContractSchema = contractBaseSchema.partial().extend({
  id: z.string().cuid(),
});

const listContractsSchema = z.object({
  ...offsetPaginationSchema.shape,
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  customerId: z.string().cuid().optional(),
  expiringSoon: z.boolean().optional(),
  sortBy: z.enum(['title', 'startDate', 'endDate', 'contractValue', 'createdAt']).default('endDate'),
  sortOrder: sortOrderSchema,
});

export const contractsRouter = router({
  list: orgProcedure.input(listContractsSchema).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'invoice:read', 'Invoice');

    const { search, isActive, customerId, expiringSoon, sortBy, sortOrder, ...pagination } = input;
    const { skip, take } = toPrismaPage(pagination);
    const orgId = ctx.user.organizationId;

    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const where: Record<string, unknown> = {
      organizationId: orgId,
      deletedAt: null,
      ...(isActive !== undefined ? { isActive } : {}),
      ...(customerId ? { customerId } : {}),
      ...(expiringSoon ? { endDate: { lte: thirtyDaysFromNow }, isActive: true } : {}),
      ...(search
        ? {
            OR: [
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
          title: true,
          contractValue: true,
          currency: true,
          startDate: true,
          endDate: true,
          renewalDate: true,
          isActive: true,
          customer: { select: { id: true, name: true } },
          createdAt: true,
        },
      }),
      ctx.db.contract.count({ where }),
    ]);

    return paginatedResponse(contracts, total, pagination);
  }),

  byId: orgProcedure.input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'invoice:read', 'Invoice');

    const contract = await ctx.db.contract.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId, deletedAt: null },
      include: { customer: { select: { id: true, name: true, email: true, phone: true } } },
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
      const created = await tx.contract.create({
        data: { ...input, organizationId: orgId, createdById: ctx.user.id },
      });

      await writeAuditLog(
        { entityType: 'Contract', entityId: created.id, action: 'CREATE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
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
        { entityType: 'Contract', entityId: id, action: 'UPDATE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
        tx,
      );

      return updated;
    });
  }),

  delete: orgProcedure.input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.contract.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new NotFoundError('Contract', input.id);

    assertCan(ctx.ability, 'invoice:delete', 'Invoice', existing as Record<string, unknown>);

    await ctx.db.$transaction(async (tx) => {
      await tx.contract.update({ where: { id: input.id }, data: { deletedAt: new Date(), isActive: false } });

      await writeAuditLog(
        { entityType: 'Contract', entityId: input.id, action: 'DELETE', organizationId: ctx.user.organizationId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
        tx,
      );
    });

    return { success: true };
  }),
});
