import { z } from 'zod';
import { NotFoundError } from '@/lib/error';
import { assertCan, orgProcedure, router } from '@/lib/trpc/context';
import * as attachmentService from '../services/file/attachment.service';

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const createAttachmentSchema = z.object({
  fileId: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  field: z.string().max(100).optional(),
  label: z.string().max(255).optional(),
});

const listAttachmentsSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
});

const deleteAttachmentSchema = z.object({
  id: z.string().min(1),
});

const deleteByEntitySchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const attachmentsRouter = router({
  // ── CREATE ───────────────────────────────────────────────────────────────
  create: orgProcedure.input(createAttachmentSchema).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'invoice:create', 'Invoice');

    const attachment = await attachmentService.createAttachment({
      fileId: input.fileId,
      entityType: input.entityType,
      entityId: input.entityId,
      field: input.field,
      label: input.label,
      uploadedById: ctx.user.id,
      organizationId: ctx.user.organizationId,
    });

    return attachment;
  }),

  // ── LIST BY ENTITY ───────────────────────────────────────────────────────
  listByEntity: orgProcedure.input(listAttachmentsSchema).query(async ({ input }) => {
    return attachmentService.listByEntity(input.entityType, input.entityId);
  }),

  // ── GET BY ID ────────────────────────────────────────────────────────────
  byId: orgProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ input }) => {
      const attachment = await attachmentService.getAttachment(input.id);
      if (!attachment) throw new NotFoundError('Attachment', input.id);
      return attachment;
    }),

  // ── DELETE ───────────────────────────────────────────────────────────────
  delete: orgProcedure.input(deleteAttachmentSchema).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'invoice:delete', 'Invoice');

    const deleted = await attachmentService.deleteAttachment(input.id);
    if (!deleted) throw new NotFoundError('Attachment', input.id);
    return { success: true };
  }),

  // ── DELETE ALL BY ENTITY ─────────────────────────────────────────────────
  deleteByEntity: orgProcedure.input(deleteByEntitySchema).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'invoice:delete', 'Invoice');

    const count = await attachmentService.deleteByEntity(input.entityType, input.entityId);
    return { deleted: count };
  }),
});
