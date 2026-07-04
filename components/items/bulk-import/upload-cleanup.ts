const pendingDeletes = new Set<string>();

export function markForCleanup(fileId: string) {
  pendingDeletes.add(fileId);
}

export function removeFromCleanup(fileId: string) {
  pendingDeletes.delete(fileId);
}

export function getPendingFileIds(): string[] {
  return Array.from(pendingDeletes);
}

export function clearPending() {
  pendingDeletes.clear();
}

export async function cleanupUploadedFiles(fileIds: string[]): Promise<void> {
  await Promise.allSettled(
    fileIds.map((fileId) =>
      fetch(`/api/uploads?fileId=${encodeURIComponent(fileId)}`, { method: 'DELETE' }).catch(() => {}),
    ),
  );
  for (const id of fileIds) {
    pendingDeletes.delete(id);
  }
}
