import { z } from 'zod';
import { protectedProcedure, t } from '@/lib/trpc/server';
import { TRPCError } from '@trpc/server';
import db from '@/lib/db';

export const contractRouter = t.router({
  getContracts: protectedProcedure.query(async () => {
    try {
      return await db.contract.findMany({});
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch contracts',
      });
    }
  }),

  getContractById: protectedProcedure
    .input(z.object({ id: z.union([z.string(), z.number()]) }))
    .query(async ({ input }) => {
      try {
        const item = await db.contract.findUnique({
          where: { id: String(input.id) },
        });
        if (!item) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Contract not found',
          });
        }
        return item;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch contract',
        });
      }
    }),

  createContract: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        contractValue: z.number().optional(),
        currency: z.string().optional(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        renewalDate: z.coerce.date().optional().nullable(),
        active: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await db.contract.create({
          data: {
            endDate: input.endDate,
            startDate: input.startDate,
            title: input.title,
            description: input.description,
            contractValue: input.contractValue,
            renewalDate: input.renewalDate,
            active: input.active ?? true,
            organizationId: ctx.user.organizationId,
          },
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create contract',
        });
      }
    }),

  updateContract: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          title: z.string().optional(),
          description: z.string().optional(),
          contractValue: z.number().optional(),
          currency: z.string().optional(),
          startDate: z.coerce.date().optional(),
          endDate: z.coerce.date().optional(),
          renewalDate: z.coerce.date().optional().nullable(),
          active: z.boolean().optional(),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        return await db.contract.update({
          where: { id: input.id },
          data: {
            endDate: input.data.endDate,
            startDate: input.data.startDate,
            title: input.data.title,
            description: input.data.description,
            contractValue: input.data.contractValue,
            renewalDate: input.data.renewalDate,
            active: input.data.active,
          },
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update contract',
        });
      }
    }),

  deleteContract: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {
        return await db.contract.delete({
          where: { id: input.id },
        });
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete contract',
        });
      }
    }),
});
