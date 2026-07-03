import path from 'path';
import { promises as fs } from 'fs';

const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads');

export interface StorageResult {
  storagePath: string;
  absolutePath: string;
}

function datePath(): string {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return path.join(yyyy, mm);
}

export function buildStoragePath(filename: string): string {
  return `/uploads/${datePath()}/${filename}`;
}

export async function write(buffer: Buffer, filename: string): Promise<StorageResult> {
  const relDir = datePath();
  const absDir = path.join(UPLOAD_ROOT, relDir);
  await fs.mkdir(absDir, { recursive: true });

  const absPath = path.join(absDir, filename);
  await fs.writeFile(absPath, buffer);

  return {
    storagePath: `/uploads/${relDir}/${filename}`,
    absolutePath: absPath,
  };
}

export async function read(storagePath: string): Promise<Buffer | null> {
  try {
    const absPath = path.join(process.cwd(), 'public', storagePath);
    return await fs.readFile(absPath);
  } catch {
    return null;
  }
}

export async function remove(storagePath: string): Promise<boolean> {
  try {
    const absPath = path.join(process.cwd(), 'public', storagePath);
    await fs.unlink(absPath);
    return true;
  } catch {
    return false;
  }
}

export async function exists(storagePath: string): Promise<boolean> {
  try {
    const absPath = path.join(process.cwd(), 'public', storagePath);
    await fs.access(absPath);
    return true;
  } catch {
    return false;
  }
}
