import { z } from 'zod';
import { authed, t } from '@/trpc/server';
import { TRPCError } from '@trpc/server';
import db from '@/lib/db';

export const customerRouter = t.router({
  getCustomers: authed.query(async () => {
    try {
      return await db.customer.findMany({});
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch customers',
      });
    }
  }),

  getCustomerById: authed.input(z.object({ id: z.number() })).query(async ({ input }) => {
    try {
      const customer = await db.customer.findUnique({
        where: { id: input.id },
        include: {
          organization: true,
          invoices: true,
        },
      });
      if (!customer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Customer not found',
        });
      }
      return customer;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch customer',
      });
    }
  }),

  createCustomer: authed
    .input(
      z.object({
        name: z.string(),
        phone: z.string(),
        address: z.string(),
        email: z.string().email().optional().nullable(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await db.customer.create({
          data: {
            ...input,
            organizationId: ctx.user.organizationId,
          },
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create customer',
        });
      }
    }),

  updateCustomer: authed
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          name: z.string().optional(),
          phone: z.string().optional(),
          address: z.string().optional(),
          email: z.string().email().optional().nullable(),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        return await db.customer.update({
          where: { id: input.id },
          data: input.data,
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update customer',
        });
      }
    }),

  deleteCustomer: authed.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    try {
      return await db.customer.delete({
        where: { id: input.id },
      });
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete customer',
      });
    }
  }),
});
