import { fileTypeFromBuffer } from 'file-type';
import { createId } from '@paralleldrive/cuid2';
import { NotFoundError } from '@/lib/error';
import { computeSha256 } from './hash.service';
import { processImage } from './image.service';
import * as storage from './storage.service';
import * as fileRepo from './file.repository';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export interface UploadResult {
  id: string;
  storagePath: string;
  originalName: string;
  mime: string;
  extension: string;
  size: number;
  width: number | null;
  height: number | null;
}

function extensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'text/plain': 'txt',
    'text/csv': 'csv',
    'application/zip': 'zip',
  };
  return map[mime] ?? 'bin';
}

export async function uploadFile(file: File): Promise<UploadResult> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024} MB`);
  }

  const rawBuffer = Buffer.from(await file.arrayBuffer());

  // Validate MIME via binary magic bytes (not user-supplied Content-Type)
  const detected = await fileTypeFromBuffer(rawBuffer);
  const mime = detected?.mime ?? file.type ?? 'application/octet-stream';
  const extension = detected?.ext ?? extensionFromMime(mime);

  // Deduplicate by SHA-256
  const hash = computeSha256(rawBuffer);
  const existing = await fileRepo.findByHash(hash);
  if (existing) {
    return {
      id: existing.id,
      storagePath: existing.storagePath,
      originalName: existing.originalName,
      mime: existing.mime,
      extension: existing.extension,
      size: existing.size,
      width: existing.width,
      height: existing.height,
    };
  }

  // Process images (compress + thumbnail)
  const { buffer: processedBuffer, metadata } = await processImage(rawBuffer, mime);

  // Generate unique filename and write to disk
  const filename = `${createId()}.${extension}`;
  const { storagePath } = await storage.write(processedBuffer, filename);

  // Persist File record
  const fileRecord = await fileRepo.createFile({
    filename,
    originalName: file.name,
    hash,
    storagePath,
    mime,
    extension,
    size: processedBuffer.length,
    width: metadata?.width ?? null,
    height: metadata?.height ?? null,
  });

  return {
    id: fileRecord.id,
    storagePath: fileRecord.storagePath,
    originalName: fileRecord.originalName,
    mime: fileRecord.mime,
    extension: fileRecord.extension,
    size: fileRecord.size,
    width: fileRecord.width,
    height: fileRecord.height,
  };
}

export async function deleteUpload(fileId: string): Promise<void> {
  const record = await fileRepo.findById(fileId);
  if (!record) throw new NotFoundError('File', fileId);

  // Only delete if no other attachments reference this file
  const wasDeleted = await fileRepo.deleteFileIfOrphaned(fileId);
  if (wasDeleted) {
    await storage.remove(record.storagePath);
  }
}

export async function deleteUploadByStoragePath(storagePath: string): Promise<void> {
  const record = await fileRepo.findByStoragePath(storagePath);
  if (!record) return; // already gone or never existed

  const wasDeleted = await fileRepo.deleteFileIfOrphaned(record.id);
  if (wasDeleted) {
    await storage.remove(record.storagePath);
  }
}
