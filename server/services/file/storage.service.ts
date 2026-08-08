import { promises as fs } from "fs";
import path from "path";
import { env } from "@/lib/env";

// Uploads live outside `public/` so they are not frozen at build time and are
// streamed through the `/api/files/...` route handler instead.
const DATA_ROOT = path.resolve(env.DATA_DIR);
const UPLOAD_ROOT = path.join(DATA_ROOT, "uploads");
const LEGACY_ROOT = path.resolve("public");

export interface StorageResult {
	storagePath: string;
	absolutePath: string;
}

function datePath(): string {
	const now = new Date();
	const yyyy = String(now.getFullYear());
	const mm = String(now.getMonth() + 1).padStart(2, "0");
	return path.join(yyyy, mm);
}

/** Resolves a `/uploads/...` storage path inside `root`, rejecting traversal. */
function toAbsolute(root: string, storagePath: string): string {
	const clean = storagePath.replace(/^\/+/, "");
	const abs = path.resolve(root, clean);
	const rel = path.relative(root, abs);
	if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) {
		throw new RangeError(`Invalid storage path: ${storagePath}`);
	}
	return abs;
}

export function buildStoragePath(filename: string): string {
	return `/uploads/${datePath()}/${filename}`;
}

export async function write(
	buffer: Buffer,
	filename: string,
): Promise<StorageResult> {
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

/**
 * Reads a file by its `/uploads/...` storage path. Tries the current data root
 * first, then falls back to the legacy `public/uploads` location so files
 * uploaded before the storage move keep working.
 */
export async function readByStoragePath(
	storagePath: string,
): Promise<Buffer | null> {
	try {
		return await fs.readFile(toAbsolute(DATA_ROOT, storagePath));
	} catch {
		try {
			return await fs.readFile(toAbsolute(LEGACY_ROOT, storagePath));
		} catch {
			return null;
		}
	}
}

export async function read(storagePath: string): Promise<Buffer | null> {
	return readByStoragePath(storagePath);
}

export async function remove(storagePath: string): Promise<boolean> {
	for (const root of [DATA_ROOT, LEGACY_ROOT]) {
		try {
			await fs.unlink(toAbsolute(root, storagePath));
			return true;
		} catch {
			// try next location
		}
	}
	return false;
}

export async function exists(storagePath: string): Promise<boolean> {
	for (const root of [DATA_ROOT, LEGACY_ROOT]) {
		try {
			await fs.access(toAbsolute(root, storagePath));
			return true;
		} catch {
			// try next location
		}
	}
	return false;
}
