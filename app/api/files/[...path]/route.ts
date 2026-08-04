import { NextRequest, NextResponse } from 'next/server';
import { fileTypeFromBuffer } from 'file-type';
import { readByStoragePath } from '@/server/services/file/storage.service';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const segments = (await params).path;

  if (!segments || segments.length === 0) {
    return NextResponse.json({ error: 'Missing file path' }, { status: 400 });
  }

  if (segments.some((s) => s === '..' || s.includes('\\') || s.includes('/'))) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
  }

  const storagePath = `/uploads/${segments.join('/')}`;
  const buffer = await readByStoragePath(storagePath);

  if (!buffer) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const detected = await fileTypeFromBuffer(buffer);
  const contentType = detected?.mime ?? 'application/octet-stream';

  const body = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'public, max-age=86400, immutable',
      'Content-Disposition': 'inline',
    },
  });
}
