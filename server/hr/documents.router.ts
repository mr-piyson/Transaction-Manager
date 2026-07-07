import { z } from 'zod';
import { NotFoundError } from '@/lib/error';
import { assertCan, orgProcedure, router } from '@/lib/trpc/context';
import { paginatedResponse, toPrismaPage } from '@/lib/validations';
import { writeAuditLog } from '../shared/audit.service';
import { hrListSchema } from './hr.schemas';

export const documentsRouter = router({
  list: orgProcedure
    .input(
      hrListSchema.extend({
        employeeId: z.string().optional(),
        type: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'employee-document:read', 'EmployeeDocument');
      const { search, sortBy, sortOrder, employeeId, type, ...pagination } = input;
      const { skip, take } = toPrismaPage(pagination);
      const orgId = ctx.user.organizationId;

      const where: Record<string, unknown> = { organizationId: orgId };
      if (employeeId) where.employeeId = employeeId;
      if (type) where.type = type;

      const [docs, total] = await ctx.db.$transaction([
        ctx.db.employeeDocument.findMany({
          where,
          skip,
          take,
          orderBy: { [sortBy]: sortOrder },
          include: {
            employee: { select: { id: true, employeeCode: true, user: { select: { name: true } } } },
            uploadedBy: { select: { id: true, name: true } },
          },
        }),
        ctx.db.employeeDocument.count({ where }),
      ]);

      return paginatedResponse(docs, total, pagination);
    }),

  create: orgProcedure
    .input(
      z.object({
        employeeId: z.string(),
        name: z.string().min(1).max(255),
        type: z.string().min(1).max(50),
        fileUrl: z.string(),
        mimeType: z.string().max(100).optional(),
        sizeBytes: z.number().int().optional(),
        expiryDate: z.coerce.date().optional(),
        notes: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'employee-document:create', 'EmployeeDocument');
      const orgId = ctx.user.organizationId;

      const employee = await ctx.db.employee.findFirst({
        where: { id: input.employeeId, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      if (!employee) throw new NotFoundError('Employee', input.employeeId);

      return ctx.db.$transaction(async (tx) => {
        const doc = await tx.employeeDocument.create({
          data: {
            ...input,
            uploadedById: ctx.user.id,
            organizationId: orgId,
          },
        });

        await writeAuditLog(
          { entityType: 'EmployeeDocument', entityId: doc.id, action: 'CREATE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
          tx,
        );

        return doc;
      });
    }),

  delete: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const orgId = ctx.user.organizationId;

    const existing = await ctx.db.employeeDocument.findFirst({
      where: { id: input.id, organizationId: orgId },
    });
    if (!existing) throw new NotFoundError('EmployeeDocument', input.id);

    assertCan(ctx.ability, 'employee-document:delete', 'EmployeeDocument', existing as Record<string, unknown>);

    await ctx.db.$transaction(async (tx) => {
      await tx.employeeDocument.delete({ where: { id: input.id } });

      await writeAuditLog(
        { entityType: 'EmployeeDocument', entityId: input.id, action: 'DELETE', organizationId: orgId, userId: ctx.user.id, ipAddress: ctx.ipAddress },
        tx,
      );
    });

    return { success: true };
  }),
});
