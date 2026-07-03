import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/server/services/file/upload.service';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const result = await uploadFile(file);

    return NextResponse.json({
      message: 'File uploaded successfully',
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    console.error('[Upload Error]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
