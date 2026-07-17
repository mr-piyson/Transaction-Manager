import { NextRequest, NextResponse } from 'next/server';
import { uploadFile, deleteUpload, deleteUploadByStoragePath } from '@/server/services/file/upload.service';

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

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');
    const storagePath = searchParams.get('storagePath');

    if (!fileId && !storagePath) {
      return NextResponse.json({ error: 'fileId or storagePath parameter is required' }, { status: 400 });
    }

    if (storagePath) {
      await deleteUploadByStoragePath(storagePath);
    } else {
      await deleteUpload(fileId!);
    }

    return NextResponse.json({ message: 'File deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delete failed';
    console.error('[Delete Error]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
