/**
 * src/server/modules/customers/router.ts
 *
 * Customer management router.
 *
 * PATTERNS USED THROUGHOUT:
 *
 * 1. assertCan() before every mutation — CASL check against the record itself
 *    (not just the action type) enables field-level and condition-level rules.
 *
 * 2. Soft delete — `deletedAt` timestamp instead of hard DELETE.
 *    All queries filter `deletedAt: null`. Deleted customers still appear on
 *    historical invoices; we never lose referential integrity.
 *
 * 3. Every list query counts total rows in the same round-trip using
 *    Prisma's $transaction([findMany, count]) — avoids a second network call.
 *
 * 4. organizationId is ALWAYS injected from context, never trusted from input.
 *    This is the critical multi-tenant isolation guarantee.
 */

import { z } from 'zod';
import { ConflictError, NotFoundError } from '@/lib/error';
import { assertCan, orgProcedure, router } from '@/lib/trpc/context';
import {
  currencyCodeSchema,
  decimalSchema,
  offsetPaginationSchema,
  paginatedResponse,
  sortOrderSchema,
  toPrismaPage,
} from '@/lib/validations';
import { writeAuditLog } from './audit.service';

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const customerBaseSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().max(50).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional().or(z.literal('')),
  taxId: z.string().max(100).optional(),
  crNumber: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
  creditLimit: decimalSchema.optional(),
  creditTermsDays: z.number().int().min(0).max(365).optional(),
  currencyCode: currencyCodeSchema.optional(),
  priceListId: z.string().cuid().optional(),
});

const createCustomerSchema = customerBaseSchema;
const updateCustomerSchema = customerBaseSchema.partial().extend({
  id: z.string().cuid(),
});

const listCustomersSchema = z.object({
  ...offsetPaginationSchema.shape,
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('name'),
  sortOrder: sortOrderSchema,
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const customersRouter = router({
  // ── LIST ──────────────────────────────────────────────────────────────────
  list: orgProcedure.input(listCustomersSchema).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'customer:read', 'Customer');

    const { search, isActive, sortBy, sortOrder, ...pagination } = input;
    const { skip, take } = toPrismaPage(pagination);
    const orgId = ctx.user.organizationId;

    const where = {
      organizationId: orgId,
      deletedAt: null,
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
              { phone: { contains: search, mode: 'insensitive' as const } },
              { code: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [customers, total] = await ctx.db.$transaction([
      ctx.db.customer.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          name: true,
          code: true,
          email: true,
          phone: true,
          isActive: true,
          creditLimit: true,
          creditTermsDays: true,
          currencyCode: true,
          createdAt: true,
          _count: { select: { invoices: true } },
        },
      }),
      ctx.db.customer.count({ where }),
    ]);

    return paginatedResponse(customers, total, pagination);
  }),

  // ── GET BY ID ─────────────────────────────────────────────────────────────
  byId: orgProcedure.input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'customer:read', 'Customer');

    const customer = await ctx.db.customer.findFirst({
      where: {
        id: input.id,
        organizationId: ctx.user.organizationId,
        deletedAt: null,
      },
      include: {
        priceList: { select: { id: true, name: true } },
        _count: {
          select: {
            invoices: { where: { deletedAt: null } },
            contracts: { where: { deletedAt: null, status: 'ACTIVE' } },
          },
        },
      },
    });

    if (!customer) throw new NotFoundError('Customer', input.id);

    return customer;
  }),

  // ── CREATE ────────────────────────────────────────────────────────────────
  create: orgProcedure.input(createCustomerSchema).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'customer:create', 'Customer');

    // Code uniqueness check within org
    if (input.code) {
      const existing = await ctx.db.customer.findFirst({
        where: {
          code: input.code,
          organizationId: ctx.user.organizationId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictError(`Customer code "${input.code}" is already in use.`);
      }
    }

    const customer = await ctx.db.$transaction(async (tx) => {
      const created = await tx.customer.create({
        data: {
          ...input,
          organizationId: ctx.user.organizationId,
          createdById: ctx.user.id,
        },
      });

      await writeAuditLog(
        {
          entityType: 'Customer',
          entityId: created.id,
          action: 'CREATE',
          organizationId: ctx.user.organizationId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
        },
        tx,
      );

      return created;
    });

    return customer;
  }),

  // ── UPDATE ────────────────────────────────────────────────────────────────
  update: orgProcedure.input(updateCustomerSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    const existing = await ctx.db.customer.findFirst({
      where: { id, organizationId: ctx.user.organizationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundError('Customer', id);

    assertCan(ctx.ability, 'customer:update', 'Customer', existing as Record<string, unknown>);

    // Code uniqueness check (ignore self)
    if (data.code && data.code !== existing.code) {
      const conflict = await ctx.db.customer.findFirst({
        where: {
          code: data.code,
          organizationId: ctx.user.organizationId,
          deletedAt: null,
          NOT: { id },
        },
        select: { id: true },
      });
      if (conflict) {
        throw new ConflictError(`Customer code "${data.code}" is already in use.`);
      }
    }

    const updated = await ctx.db.$transaction(async (tx) => {
      const result = await tx.customer.update({
        where: { id },
        data: { ...data, updatedById: ctx.user.id },
      });

      // Build diff for audit
      const diff: Record<string, { before: unknown; after: unknown }> = {};
      for (const key of Object.keys(data) as (keyof typeof data)[]) {
        if (data[key] !== (existing as Record<string, unknown>)[key]) {
          diff[key] = {
            before: (existing as Record<string, unknown>)[key],
            after: data[key],
          };
        }
      }

      await writeAuditLog(
        {
          entityType: 'Customer',
          entityId: id,
          action: 'UPDATE',
          diff,
          organizationId: ctx.user.organizationId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
        },
        tx,
      );

      return result;
    });

    return updated;
  }),

  // ── SOFT DELETE ───────────────────────────────────────────────────────────
  delete: orgProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.customer.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.user.organizationId,
          deletedAt: null,
        },
        select: {
          id: true,
          organizationId: true,
          _count: {
            select: {
              invoices: { where: { deletedAt: null } },
              contracts: { where: { deletedAt: null } },
            },
          },
        },
      });
      if (!existing) throw new NotFoundError('Customer', input.id);

      assertCan(ctx.ability, 'customer:delete', 'Customer', existing as Record<string, unknown>);

      // Block delete if active invoices or contracts exist
      if (existing._count.invoices > 0) {
        throw new ConflictError(
          `Cannot delete customer: ${existing._count.invoices} active invoice(s) exist.`,
          { entityId: input.id },
        );
      }
      if (existing._count.contracts > 0) {
        throw new ConflictError(
          `Cannot delete customer: ${existing._count.contracts} active contract(s) exist.`,
          { entityId: input.id },
        );
      }

      await ctx.db.$transaction(async (tx) => {
        await tx.customer.update({
          where: { id: input.id },
          data: { deletedAt: new Date(), isActive: false },
        });

        await writeAuditLog(
          {
            entityType: 'Customer',
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

  // ── TOGGLE ACTIVE ─────────────────────────────────────────────────────────
  setActive: orgProcedure
    .input(z.object({ id: z.string().cuid(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.customer.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.user.organizationId,
          deletedAt: null,
        },
      });
      if (!existing) throw new NotFoundError('Customer', input.id);

      assertCan(ctx.ability, 'customer:update', 'Customer', existing as Record<string, unknown>);

      return ctx.db.customer.update({
        where: { id: input.id },
        data: { isActive: input.isActive, updatedById: ctx.user.id },
      });
    }),

  // ── CREDIT BALANCE ────────────────────────────────────────────────────────
  // Returns outstanding AR balance for a customer (sum of unpaid invoices)
  creditBalance: orgProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'customer:read', 'Customer');

      const [customer, invoiceAggregate] = await ctx.db.$transaction([
        ctx.db.customer.findFirst({
          where: {
            id: input.id,
            organizationId: ctx.user.organizationId,
            deletedAt: null,
          },
          select: { id: true, name: true, creditLimit: true },
        }),
        ctx.db.invoice.aggregate({
          where: {
            customerId: input.id,
            organizationId: ctx.user.organizationId,
            status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] },
            deletedAt: null,
          },
          _sum: { amountDue: true },
          _count: true,
        }),
      ]);

      if (!customer) throw new NotFoundError('Customer', input.id);

      return {
        customer,
        outstandingBalance: invoiceAggregate._sum.amountDue ?? 0,
        openInvoiceCount: invoiceAggregate._count,
      };
    }),
});
