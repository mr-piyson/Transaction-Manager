import db from '@/lib/db';
import type { Prisma } from '@prisma/client';

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
    orderBy: { createdAt: 'desc' },
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

export async function deleteFileIfOrphaned(fileId: string): Promise<boolean> {
  const count = await countAttachmentsForFile(fileId);
  if (count === 0) {
    await db.file.delete({ where: { id: fileId } });
    return true;
  }
  return false;
}
