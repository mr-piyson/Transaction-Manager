import { z } from 'zod';
import { adminProcedure, protectedProcedure, t } from '@/lib/trpc/server';
import { TRPCError } from '@trpc/server';
import db from '@/lib/db';
import { assertOwnership, requireOrgId } from './_shared';

const customerInput = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  email: z.email().optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  taxId: z.string().optional(),
  notes: z.string().optional(),
  creditLimit: z.number().int().min(0).default(0), // fils
});

export const customerRouter = t.router({
  // -------------------------------------------------------------------------
  // List — paginated, filterable
  // -------------------------------------------------------------------------
  list: protectedProcedure
    .input(
      z
        .object({
          isActive: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      return await ctx.prisma.customer.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
          isActive: input?.isActive,
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          city: true,
          isActive: true,
          creditLimit: true,
          _count: { select: { invoices: true } },
        },
      });
    }),

  // -------------------------------------------------------------------------
  // Get single with AR balance
  // -------------------------------------------------------------------------
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const orgId = requireOrgId(ctx.organizationId);

    const customer = await ctx.prisma.customer.findUnique({
      where: { id: input.id },
      include: {
        contracts: {
          where: { deletedAt: null, isActive: true },
          orderBy: { endDate: 'asc' },
        },
        _count: { select: { invoices: true, jobs: true } },
      },
    });

    assertOwnership(customer, orgId, 'Customer');

    // AR balance: sum of all outstanding invoice amounts
    const arBalance = await ctx.prisma.invoice.aggregate({
      where: {
        customerId: input.id,
        organizationId: orgId,
        status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] },
      },
      _sum: { amountDue: true },
    });

    return {
      ...customer,
      arBalance: arBalance._sum.amountDue ?? BigInt(0),
    };
  }),

  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------
  create: protectedProcedure.input(customerInput).mutation(async ({ ctx, input }) => {
    const orgId = requireOrgId(ctx.organizationId);

    return ctx.prisma.customer.create({
      data: {
        ...input,
        creditLimit: BigInt(input.creditLimit),
        organizationId: orgId,
      },
    });
  }),

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------
  update: protectedProcedure
    .input(z.object({ id: z.string() }).merge(customerInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);
      const { id, creditLimit, ...rest } = input;

      const existing = await ctx.prisma.customer.findUnique({
        where: { id },
        select: { organizationId: true },
      });
      assertOwnership(existing, orgId, 'Customer');

      return ctx.prisma.customer.update({
        where: { id },
        data: {
          ...rest,
          ...(creditLimit !== undefined && { creditLimit: BigInt(creditLimit) }),
        },
      });
    }),

  // -------------------------------------------------------------------------
  // Soft delete
  // -------------------------------------------------------------------------
  delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const orgId = requireOrgId(ctx.organizationId);

    const existing = await ctx.prisma.customer.findUnique({
      where: { id: input.id },
      select: { organizationId: true, _count: { select: { invoices: true } } },
    });
    assertOwnership(existing, orgId, 'Customer');

    // Block delete if open invoices exist
    const openInvoices = await ctx.prisma.invoice.count({
      where: {
        customerId: input.id,
        status: { in: ['DRAFT', 'SENT', 'PARTIAL', 'OVERDUE'] },
      },
    });
    if (openInvoices > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot delete customer with ${openInvoices} open invoice(s)`,
      });
    }

    return ctx.prisma.customer.update({
      where: { id: input.id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }),

  // -------------------------------------------------------------------------
  // Recent invoices for a customer (for sidebar / detail view)
  // -------------------------------------------------------------------------
  recentInvoices: protectedProcedure
    .input(z.object({ customerId: z.string(), limit: z.number().int().min(1).max(20).default(5) }))
    .query(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      return ctx.prisma.invoice.findMany({
        where: {
          customerId: input.customerId,
          organizationId: orgId,
          status: { not: 'DELETED' },
        },
        orderBy: { date: 'desc' },
        take: input.limit,
        select: {
          id: true,
          serial: true,
          type: true,
          status: true,
          paymentStatus: true,
          date: true,
          dueDate: true,
          total: true,
          amountDue: true,
        },
      });
    }),
});
