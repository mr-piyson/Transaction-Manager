import { z } from 'zod';
import sharp from 'sharp';
import path from 'path';
import { promises as fs } from 'fs';
import { PDFDocument } from 'pdf-lib';

// ─── Constants ───────────────────────────────────────────────────────────────

const MIME_TO_EXT: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/x-icon': 'ico',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'text/html': 'html',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'application/zip': 'zip',
  'application/x-7z-compressed': '7z',
  'application/x-rar-compressed': 'rar',
  'application/x-tar': 'tar',
} as const;

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

const DEFAULT_PDF_MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const DEFAULT_IMG_MAX_SIZE = 5 * 1024 * 1024; //  5 MB
const IMAGE_QUALITY = 80;

// ─── Schemas ─────────────────────────────────────────────────────────────────

const makePDFSchema = (maxSize: number) =>
  z.object({
    pdf: z
      .instanceof(File)
      .refine((f) => f.size <= maxSize, `Max file size is ${maxSize / 1024 / 1024} MB.`)
      .refine((f) => f.type === 'application/pdf', 'Only .pdf files are allowed.'),
  });

const makeImageSchema = (maxSize: number) =>
  z.object({
    image: z
      .instanceof(File)
      .refine((f) => f.size <= maxSize, `Max file size is ${maxSize / 1024 / 1024} MB.`)
      .refine(
        (f): f is File & { type: SupportedImageType } =>
          (SUPPORTED_IMAGE_TYPES as readonly string[]).includes(f.type),
        'Only .jpg, .png, and .webp formats are supported.',
      ),
  });

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolves a file's extension, preferring the MIME map then falling back to
 * the filename, then 'bin'.
 */
export function getFileExtension(file: File): string {
  if (file.type && MIME_TO_EXT[file.type]) return MIME_TO_EXT[file.type];

  const dot = file.name.lastIndexOf('.');
  if (dot > 0) {
    const ext = file.name.slice(dot + 1).toLowerCase();
    if (ext.length >= 2 && ext.length <= 5) return ext;
  }

  return 'bin';
}

/** Generates a timestamped random filename with the given extension. */
function generateFilename(ext: string): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
}

/** Ensures the upload directory exists (cached after first call by the OS). */
async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

/**
 * Applies format-specific Sharp compression and returns the processed buffer.
 * Using `toBuffer()` avoids a redundant disk-read and keeps the pipeline pure.
 */
async function compressImage(buffer: Buffer, mimeType: SupportedImageType): Promise<Buffer> {
  const pipeline = sharp(buffer);

  switch (mimeType) {
    case 'image/jpeg':
      return pipeline.jpeg({ quality: IMAGE_QUALITY, mozjpeg: true }).toBuffer();
    case 'image/png':
      return pipeline.png({ quality: IMAGE_QUALITY, compressionLevel: 8 }).toBuffer();
    case 'image/webp':
      return pipeline.webp({ quality: IMAGE_QUALITY }).toBuffer();
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface SaveResult {
  url: string;
  filename: string;
  sizeBytes: number;
}

/**
 * Validates, optimises (via pdf-lib object streams), and persists a PDF.
 * Returns a `SaveResult` on success, or `null` on any failure.
 */
export async function savePDF(
  rawPDF: File,
  maxSize = DEFAULT_PDF_MAX_SIZE,
): Promise<SaveResult | null> {
  const parsed = makePDFSchema(maxSize).safeParse({ pdf: rawPDF });
  if (!parsed.success) {
    console.error('[savePDF] Validation error:', parsed.error.message);
    return null;
  }

  try {
    const buffer = Buffer.from(await rawPDF.arrayBuffer());
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const optimized = await pdfDoc.save({ useObjectStreams: true });

    await ensureUploadDir();

    const filename = generateFilename('pdf');
    const filePath = path.join(UPLOAD_DIR, filename);
    await fs.writeFile(filePath, optimized);

    return { url: `/uploads/${filename}`, filename, sizeBytes: optimized.length };
  } catch (err) {
    console.error('[savePDF] Processing error:', err);
    return null;
  }
}

/**
 * Validates, compresses (via Sharp), and persists a JPEG / PNG / WebP image.
 * Returns a `SaveResult` on success, or `null` on any failure.
 */
export async function saveImage(
  rawImage: File,
  { maxSize = DEFAULT_IMG_MAX_SIZE, fileName }: { maxSize?: number; fileName?: string } = {},
): Promise<SaveResult | null> {
  const parsed = makeImageSchema(maxSize).safeParse({ image: rawImage });
  if (!parsed.success) {
    console.error('[saveImage] Validation error:', parsed.error.message);
    return null;
  }

  try {
    const mimeType = rawImage.type as SupportedImageType;
    const buffer = Buffer.from(await rawImage.arrayBuffer());
    const compressed = await compressImage(buffer, mimeType);

    await ensureUploadDir();

    const ext = MIME_TO_EXT[mimeType];
    const filename = fileName ? fileName : generateFilename(ext);
    const filePath = path.join(UPLOAD_DIR, filename);
    await fs.writeFile(filePath, compressed);

    return { url: `/uploads/${filename}`, filename, sizeBytes: compressed.length };
  } catch (err) {
    console.error('[saveImage] Processing error:', err);
    return null;
  }
}
