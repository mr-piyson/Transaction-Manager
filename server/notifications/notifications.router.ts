import { z } from 'zod';
import { NotFoundError } from '@/lib/error';
import { orgProcedure, router } from '@/lib/trpc/context';
import { cuidSchema, offsetPaginationSchema, paginatedResponse, toPrismaPage } from '@/lib/validations';

const notificationStatusSchema = z.enum(['UNREAD', 'READ', 'ARCHIVED', 'DISMISSED']);

const listSchema = z.object({
  ...offsetPaginationSchema.shape,
  status: notificationStatusSchema.optional(),
  search: z.string().optional(),
});

export const notificationsRouter = router({
  list: orgProcedure.input(listSchema).query(async ({ ctx, input }) => {
    const { search, status, ...pagination } = input;
    const { skip, take } = toPrismaPage(pagination);

    const where: Record<string, unknown> = {
      userId: ctx.user.id,
      organizationId: ctx.user.organizationId,
    };
    if (status) where.status = status;
    if (search) where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { body: { contains: search, mode: 'insensitive' } },
    ];

    const [data, total] = await Promise.all([
      ctx.db.notification.findMany({
        where: where as any,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      ctx.db.notification.count({ where: where as any }),
    ]);

    return paginatedResponse(data, total, pagination);
  }),

  getUnreadCount: orgProcedure.query(async ({ ctx }) => {
    const count = await ctx.db.notification.count({
      where: {
        userId: ctx.user.id,
        organizationId: ctx.user.organizationId,
        status: 'UNREAD',
      },
    });
    return { count };
  }),

  markRead: orgProcedure.input(z.object({ id: cuidSchema })).mutation(async ({ ctx, input }) => {
    const notification = await ctx.db.notification.findFirst({
      where: { id: input.id, userId: ctx.user.id, organizationId: ctx.user.organizationId },
    });
    if (!notification) throw new NotFoundError('Notification', input.id);

    return ctx.db.notification.update({
      where: { id: input.id },
      data: { status: 'READ', readAt: new Date() },
    });
  }),

  markAllRead: orgProcedure.mutation(async ({ ctx }) => {
    await ctx.db.notification.updateMany({
      where: {
        userId: ctx.user.id,
        organizationId: ctx.user.organizationId,
        status: 'UNREAD',
      },
      data: { status: 'READ', readAt: new Date() },
    });
    return { success: true };
  }),

  archive: orgProcedure.input(z.object({ id: cuidSchema })).mutation(async ({ ctx, input }) => {
    const notification = await ctx.db.notification.findFirst({
      where: { id: input.id, userId: ctx.user.id, organizationId: ctx.user.organizationId },
    });
    if (!notification) throw new NotFoundError('Notification', input.id);

    return ctx.db.notification.update({
      where: { id: input.id },
      data: { status: 'ARCHIVED' },
    });
  }),

  dismiss: orgProcedure.input(z.object({ id: cuidSchema })).mutation(async ({ ctx, input }) => {
    const notification = await ctx.db.notification.findFirst({
      where: { id: input.id, userId: ctx.user.id, organizationId: ctx.user.organizationId },
    });
    if (!notification) throw new NotFoundError('Notification', input.id);

    return ctx.db.notification.update({
      where: { id: input.id },
      data: { status: 'DISMISSED' },
    });
  }),
});
