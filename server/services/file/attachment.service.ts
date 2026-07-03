import * as fileRepo from './file.repository';
import * as storage from './storage.service';

export interface CreateAttachmentInput {
  fileId: string;
  entityType: string;
  entityId: string;
  field?: string;
  label?: string;
  uploadedById?: string;
  organizationId: string;
}

export async function createAttachment(input: CreateAttachmentInput) {
  const file = await fileRepo.findById(input.fileId);
  if (!file) throw new Error('File not found');

  return fileRepo.createAttachment({
    file: { connect: { id: input.fileId } },
    entityType: input.entityType,
    entityId: input.entityId,
    field: input.field ?? null,
    label: input.label ?? null,
    uploadedById: input.uploadedById ?? null,
    organizationId: input.organizationId,
  });
}

export async function listByEntity(entityType: string, entityId: string) {
  return fileRepo.findAttachmentsByEntity(entityType, entityId);
}

export async function getAttachment(id: string) {
  return fileRepo.findAttachmentById(id);
}

export async function deleteAttachment(id: string): Promise<boolean> {
  const attachment = await fileRepo.findAttachmentById(id);
  if (!attachment) return false;

  await fileRepo.deleteAttachment(id);

  // Reference-counted garbage collection
  const orphaned = await fileRepo.deleteFileIfOrphaned(attachment.fileId);
  if (orphaned) {
    await storage.remove(attachment.file.storagePath);
  }

  return true;
}

export async function deleteByEntity(entityType: string, entityId: string): Promise<number> {
  const attachments = await fileRepo.findAttachmentsByEntity(entityType, entityId);
  let deleted = 0;

  for (const attachment of attachments) {
    await fileRepo.deleteAttachment(attachment.id);
    const orphaned = await fileRepo.deleteFileIfOrphaned(attachment.fileId);
    if (orphaned) {
      await storage.remove(attachment.file.storagePath);
    }
    deleted++;
  }

  return deleted;
}
