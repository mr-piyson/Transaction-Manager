interface UploadResponse {
  path: string;
  name: string;
}

interface HandleImageUploadOptions<T> {
  file: File | any;
  onMutation: (imagePath?: string) => Promise<T> | void;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

/**
 * Handles image uploading, mutation execution, and automatic cleanup on failure.
 */
export async function uploadImage<T>({
  file,
  onMutation,
  onSuccess,
  onError,
}: HandleImageUploadOptions<T>) {
  let uploadedImagePath: string | undefined = undefined;
  let uploadedFileName: string | undefined = undefined;

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

      const uploadData: UploadResponse = await res.json();
      uploadedImagePath = uploadData.path;
      uploadedFileName = uploadData.name;
    }

    // 2. Execute Mutation
    // We wrap this in a promise if it's not already to handle the cleanup catch
    await onMutation(uploadedImagePath);

    // 3. Success Callback
    onSuccess?.();
  } catch (error) {
    // 4. Cleanup: If mutation failed but file was uploaded, delete it
    if (uploadedFileName) {
      await fetch('/api/uploads', {
        method: 'DELETE',
        body: JSON.stringify({ fileName: uploadedFileName }),
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5. User Feedback
    const message =
      error instanceof Error && error.message === 'UPLOAD_FAILED'
        ? 'Failed to upload image'
        : 'Failed to process request';

    onError?.(message);
  }
}
