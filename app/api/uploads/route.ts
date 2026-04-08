import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { createId } from '@paralleldrive/cuid2';
import { unlink } from 'fs/promises';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const fileExtension = path.extname(file.name);
    const fileName = `${createId()}${fileExtension}`;
    const uploadDir = path.join(process.cwd(), 'public/uploads');
    const filePath = path.join(uploadDir, fileName);

    // Ensure directory exists
    await mkdir(uploadDir, { recursive: true });

    // Write file to disk
    await writeFile(filePath, buffer);

    return NextResponse.json({
      message: 'File uploaded successfully',
      name: fileName,
      path: `/uploads/${fileName}`, // Publicly accessible URL
    });
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { fileName } = await req.json();

    if (!fileName) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'public/uploads', fileName);

    // Delete the file
    await unlink(filePath);

    return NextResponse.json({
      message: 'File deleted successfully',
      name: fileName,
      path: `/uploads/${fileName}`,
    });
  } catch (error) {
    // Check if file exists before throwing error
    return NextResponse.json({ error: 'File not found or could not be deleted' }, { status: 404 });
  }
}
