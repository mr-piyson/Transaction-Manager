import { z } from 'zod';
import { randomUUID } from 'crypto';
import { NotFoundError } from '@/lib/error';
import { assertCan, orgProcedure, publicProcedure, router } from '@/lib/trpc/context';

export const kioskRouter = router({
  validateToken: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const kiosk = await ctx.db.kiosk.findFirst({
        where: { token: input.token, isActive: true, deletedAt: null },
        select: { id: true, name: true, organizationId: true },
      });
      if (!kiosk) throw new NotFoundError('Kiosk', input.token);
      return kiosk;
    }),
  list: orgProcedure.query(async ({ ctx }) => {
    assertCan(ctx.ability, 'org:settings:read', 'Organization');
    return ctx.db.kiosk.findMany({
      where: { organizationId: ctx.user.organizationId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }),

  byId: orgProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'org:settings:read', 'Organization');
    const kiosk = await ctx.db.kiosk.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId, deletedAt: null },
    });
    if (!kiosk) throw new NotFoundError('Kiosk', input.id);
    return kiosk;
  }),

  create: orgProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'org:settings:update', 'Organization');
      const token = randomUUID();
      return ctx.db.kiosk.create({
        data: {
          name: input.name,
          token,
          organizationId: ctx.user.organizationId,
        },
      });
    }),

  update: orgProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'org:settings:update', 'Organization');
      const { id, ...data } = input;
      const existing = await ctx.db.kiosk.findFirst({
        where: { id, organizationId: ctx.user.organizationId, deletedAt: null },
      });
      if (!existing) throw new NotFoundError('Kiosk', id);
      return ctx.db.kiosk.update({ where: { id }, data });
    }),

  regenerateToken: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'org:settings:update', 'Organization');
      const existing = await ctx.db.kiosk.findFirst({
        where: { id: input.id, organizationId: ctx.user.organizationId, deletedAt: null },
      });
      if (!existing) throw new NotFoundError('Kiosk', input.id);
      const token = randomUUID();
      return ctx.db.kiosk.update({ where: { id: input.id }, data: { token } });
    }),

  remove: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'org:settings:update', 'Organization');
      const existing = await ctx.db.kiosk.findFirst({
        where: { id: input.id, organizationId: ctx.user.organizationId, deletedAt: null },
      });
      if (!existing) throw new NotFoundError('Kiosk', input.id);
      return ctx.db.kiosk.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });
    }),
});
