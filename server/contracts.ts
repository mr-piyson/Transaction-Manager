/**
 * contracts.ts
 * CRM contracts — ongoing customer agreements with renewal alert support.
 */

import { z } from 'zod';
import { protectedProcedure, adminProcedure, t } from '@/lib/trpc/server';
import { TRPCError } from '@trpc/server';
import { assertOwnership, requireOrgId } from './_shared';
import { CurrencyCode } from '@prisma/client';

const contractInput = z.object({
  customerId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  value: z.number().int().min(0).default(0), // fils
  currency: z.enum(CurrencyCode).default('BHD'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  renewalDate: z.coerce.date().optional(),
  renewalAlertDays: z.number().int().min(0).default(30),
  notes: z.string().optional(),
});

export const contractRouter = t.router({
  // -------------------------------------------------------------------------
  // List — paginated, filterable
  // -------------------------------------------------------------------------
  list: protectedProcedure
    .input(
      z.object({
        customerId: z.string().optional(),
        isActive: z.boolean().optional(),
        expiringWithinDays: z.number().int().min(0).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);
      const { customerId, isActive } = input;

      const where: any = {
        organizationId: orgId,
        deletedAt: null,
        ...(customerId && { customerId }),
        ...(isActive !== undefined && { isActive }),
      };

      return await ctx.prisma.contract.findMany({
        where,
        orderBy: { renewalDate: 'asc' },
        select: {
          id: true,
          title: true,
          value: true,
          currency: true,
          startDate: true,
          endDate: true,
          renewalDate: true,
          renewalAlertDays: true,
          isActive: true,
          customer: { select: { id: true, name: true } },
        },
      });
    }),

  // -------------------------------------------------------------------------
  // Get single
  // -------------------------------------------------------------------------
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const orgId = requireOrgId(ctx.organizationId);

    const contract = await ctx.prisma.contract.findUnique({
      where: { id: input.id },
    });

    assertOwnership(contract, orgId, 'Contract');
    return contract;
  }),

  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------
  create: protectedProcedure.input(contractInput).mutation(async ({ ctx, input }) => {
    const orgId = requireOrgId(ctx.organizationId);
    const { value, ...rest } = input;

    const customer = await ctx.prisma.customer.findUnique({
      where: { id: input.customerId },
      select: { organizationId: true },
    });
    if (!customer) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Customer is not exist',
      });
    }
    assertOwnership(customer, orgId, 'Customer');

    return ctx.prisma.contract.create({
      data: {
        title: rest.title,
        startDate: rest.startDate,
        renewalDate: rest.renewalDate,
        endDate: rest.endDate,
        customerId: rest.customerId,
        currency: rest.currency,
        value: BigInt(value),
        organizationId: orgId,
        isActive: true,
      },
    });
  }),

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------
  update: protectedProcedure
    .input(z.object({ id: z.string() }).merge(contractInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);
      const { id, value, ...rest } = input;

      const existing = await ctx.prisma.contract.findUnique({
        where: { id },
        select: { organizationId: true },
      });
      if (!existing) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Contract is not exist',
        });
      }
      assertOwnership(existing, orgId, 'Contract');

      return ctx.prisma.contract.update({
        where: { id },
        data: {
          ...rest,
          ...(value !== undefined && { value: BigInt(value) }),
        },
      });
    }),

  // -------------------------------------------------------------------------
  // Soft delete
  // -------------------------------------------------------------------------
  delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const orgId = requireOrgId(ctx.organizationId);

    const existing = await ctx.prisma.contract.findUnique({
      where: { id: input.id },
      select: { organizationId: true },
    });
    assertOwnership(existing, orgId, 'Contract');

    return ctx.prisma.contract.update({
      where: { id: input.id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }),

  // -------------------------------------------------------------------------
  // Renewal alerts — for dashboard widget
  // -------------------------------------------------------------------------
  renewalAlerts: protectedProcedure.query(async ({ ctx }) => {
    const orgId = requireOrgId(ctx.organizationId);

    const contracts = await ctx.prisma.contract.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        isActive: true,
        renewalDate: { not: null },
      },
      select: {
        id: true,
        title: true,
        renewalDate: true,
        renewalAlertDays: true,
        customer: { select: { id: true, name: true } },
      },
    });

    const now = new Date();

    // Filter contracts where today falls within the alert window
    return contracts
      .filter((c) => {
        if (!c.renewalDate) return false;
        const msUntilRenewal = c.renewalDate.getTime() - now.getTime();
        const daysUntilRenewal = msUntilRenewal / (1000 * 60 * 60 * 24);
        return daysUntilRenewal >= 0 && daysUntilRenewal <= c.renewalAlertDays;
      })
      .map((c) => ({
        ...c,
        daysUntilRenewal: Math.ceil(
          (c.renewalDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        ),
      }))
      .sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal);
  }),
});
