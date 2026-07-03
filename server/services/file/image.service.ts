import sharp from 'sharp';

const IMAGE_QUALITY = 80;
const THUMBNAIL_SIZE = 128;

export interface ImageMetadata {
  width: number;
  height: number;
}

export interface ImageProcessResult {
  buffer: Buffer;
  thumbnail: Buffer | null;
  metadata: ImageMetadata | null;
}

function isImageMime(mime: string): boolean {
  return mime.startsWith('image/') && mime !== 'image/svg+xml';
}

export async function processImage(
  buffer: Buffer,
  mime: string,
): Promise<ImageProcessResult> {
  if (!isImageMime(mime)) {
    return { buffer, thumbnail: null, metadata: null };
  }

  const image = sharp(buffer);
  const info = await image.metadata();

  if (!info.width || !info.height) {
    return { buffer, thumbnail: null, metadata: null };
  }

  const metadata: ImageMetadata = { width: info.width, height: info.height };

  let optimized: Buffer;
  switch (mime) {
    case 'image/jpeg':
      optimized = await sharp(buffer).jpeg({ quality: IMAGE_QUALITY, mozjpeg: true }).toBuffer();
      break;
    case 'image/png':
      optimized = await sharp(buffer).png({ quality: IMAGE_QUALITY, compressionLevel: 8 }).toBuffer();
      break;
    case 'image/webp':
      optimized = await sharp(buffer).webp({ quality: IMAGE_QUALITY }).toBuffer();
      break;
    default:
      optimized = buffer;
  }

  let thumbnail: Buffer | null = null;
  try {
    thumbnail = await sharp(buffer)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer();
  } catch {
    thumbnail = null;
  }

  return { buffer: optimized, thumbnail, metadata };
}
