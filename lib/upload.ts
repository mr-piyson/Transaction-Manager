interface UploadResponse {
  id: string;
  storagePath: string;
  originalName: string;
  mime: string;
  extension: string;
  size: number;
  width: number | null;
  height: number | null;
}

interface HandleImageUploadOptions<T> {
  file: File | any;
  onMutation: (uploadResult?: UploadResponse) => Promise<T> | void;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

/**
 * Handles file uploading, mutation execution, and automatic cleanup on failure.
 */
export async function uploadImage<T>({
  file,
  onMutation,
  onSuccess,
  onError,
}: HandleImageUploadOptions<T>) {
  let uploadResult: UploadResponse | undefined = undefined;

  try {
    // 1. Upload if it's a file
    if (file instanceof File) {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('UPLOAD_FAILED');

      uploadResult = await res.json();
    }

    // 2. Execute Mutation
    await onMutation(uploadResult);

    // 3. Success Callback
    onSuccess?.();
  } catch (error) {
    // 4. User Feedback
    const message =
      error instanceof Error && error.message === 'UPLOAD_FAILED'
        ? 'Failed to upload file'
        : 'Failed to process request';

    onError?.(message);
  }
}
