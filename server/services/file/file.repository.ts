import type { Prisma } from "@prisma/client";
import db from "@/lib/db";

// ---------------------------------------------------------------------------
// File CRUD
// ---------------------------------------------------------------------------

export function findByHash(hash: string) {
  return db.file.findUnique({ where: { hash } });
}

export function createFile(data: Prisma.FileCreateInput) {
  return db.file.create({ data });
}

export function findById(id: string) {
  return db.file.findUnique({ where: { id } });
}

export function findByStoragePath(storagePath: string) {
  return db.file.findUnique({ where: { storagePath } });
}

export function deleteFile(id: string) {
  return db.file.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Attachment CRUD
// ---------------------------------------------------------------------------

export function createAttachment(data: Prisma.AttachmentCreateInput) {
  return db.attachment.create({ data });
}

export function findAttachmentsByEntity(entityType: string, entityId: string) {
  return db.attachment.findMany({
    where: { entityType, entityId },
    include: { file: true },
    orderBy: { createdAt: "desc" },
  });
}

export function findAttachmentById(id: string) {
  return db.attachment.findUnique({
    where: { id },
    include: { file: true },
  });
}

export function deleteAttachment(id: string) {
  return db.attachment.delete({ where: { id } });
}

export async function countAttachmentsForFile(fileId: string): Promise<number> {
  return db.attachment.count({ where: { fileId } });
}

/**
 * Count ALL references to a storagePath across the entire schema:
 *   - Attachment records (via File → storagePath)
 *   - Item.image string fields
 *   - Organization.logo / Organization.stampImage string fields
 *   - User.image string fields
 *
 * Returns 0 only when nothing in the system still points to this file.
 */
export async function countStoragePathReferences(
  storagePath: string,
): Promise<number> {
  const [attachmentCount, itemCount, orgCount, userCount] = await Promise.all([
    db.attachment.count({
      where: { file: { storagePath } },
    }),
    db.item.count({
      where: { image: storagePath },
    }),
    db.organization.count({
      where: {
        OR: [{ logo: storagePath }, { stampImage: storagePath }],
      },
    }),
    db.user.count({
      where: { image: storagePath },
    }),
  ]);

  return attachmentCount + itemCount + orgCount + userCount;
}

/**
 * Delete a File record only if nothing references it.
 * When `storagePath` is provided, checks ALL reference sources (attachments,
 * Item.image, Organization.logo/stampImage, User.image).  Falls back to
 * attachment-only check when storagePath is omitted (backwards-compatible).
 */
export async function deleteFileIfOrphaned(
  fileId: string,
  storagePath?: string,
): Promise<boolean> {
  const count = storagePath
    ? await countStoragePathReferences(storagePath)
    : await countAttachmentsForFile(fileId);

  if (count === 0) {
    await db.file.delete({ where: { id: fileId } });
    return true;
  }
  return false;
}
