'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, ImageIcon, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ParsedItem, ImportImage } from './types';

interface ImageUploadStepProps {
  items: ParsedItem[];
  onImagesChange: (images: ImportImage[] | ((prev: ImportImage[]) => ImportImage[])) => void;
  images: ImportImage[];
}

export function ImageUploadStep({ items, onImagesChange, images }: ImageUploadStepProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const matchedCount = images.filter((i) => i.uploadState === 'done').length;
  const unmatchedCount = images.filter((i) => i.uploadState === 'error').length;
  const pendingCount = images.filter((i) => i.uploadState === 'pending' || i.uploadState === 'uploading').length;

  const skuSet = new Set(items.map((i) => i.sku));

  const uploadImage = useCallback(async (file: File): Promise<ImportImage> => {
    const sku = file.name.replace(/\.[^.]+$/, '');
    const dataUrl = URL.createObjectURL(file);
    const base: ImportImage = { file, dataUrl, sku, uploadState: 'pending' };

    if (!skuSet.has(sku)) {
      return { ...base, uploadState: 'error', error: `No item with SKU "${sku}"` };
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/uploads', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      return { ...base, fileId: data.id, storagePath: data.storagePath, uploadState: 'done' };
    } catch {
      return { ...base, uploadState: 'error', error: 'Upload failed' };
    }
  }, [skuSet]);

  const handleFiles = useCallback(async (files: FileList) => {
    const imageFiles = Array.from(files).filter((f) =>
      ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(f.type) ||
      /\.(jpg|jpeg|png|webp|gif)$/i.test(f.name)
    );

    const results = await Promise.all(imageFiles.map(uploadImage));
    onImagesChange((prev) => [...prev, ...results]);
  }, [uploadImage, onImagesChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeImage = useCallback((sku: string) => {
    onImagesChange((prev) => prev.filter((i) => i.sku !== sku));
  }, [onImagesChange]);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-medium">Upload Images</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Images are matched to items by filename (must match SKU, e.g. &quot;RAW-AL-001.jpg&quot;)
        </p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <ImageIcon className="mx-auto size-8 text-muted-foreground mb-2" />
        <p className="text-sm font-medium">Drop images here, or click to browse</p>
        <p className="text-xs text-muted-foreground mt-1">
          JPG, PNG, WebP — named by SKU (e.g. SKU-001.jpg)
        </p>
      </div>

      {images.length > 0 && (
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle2 className="size-3.5" /> {matchedCount} matched
          </span>
          {pendingCount > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> {pendingCount} uploading
            </span>
          )}
          {unmatchedCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertCircle className="size-3.5" /> {unmatchedCount} unmatched
            </span>
          )}
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
          {images.map((img) => (
            <div key={img.sku} className="relative group aspect-square rounded-md border overflow-hidden bg-muted">
              <img
                src={img.dataUrl}
                alt={img.sku}
                className="size-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => removeImage(img.sku)}
                  className="opacity-0 group-hover:opacity-100 size-6 rounded-full bg-background/80 flex items-center justify-center"
                >
                  <X className="size-3" />
                </button>
              </div>
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                <p className="text-[9px] text-white truncate">{img.sku}</p>
              </div>
              {img.uploadState === 'done' && (
                <div className="absolute top-0.5 right-0.5">
                  <CheckCircle2 className="size-3 text-green-500" />
                </div>
              )}
              {img.uploadState === 'error' && (
                <div className="absolute top-0.5 right-0.5" title={img.error}>
                  <AlertCircle className="size-3 text-amber-500" />
                </div>
              )}
              {img.uploadState === 'uploading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Loader2 className="size-4 text-white animate-spin" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {items.length} item(s) in data. {matchedCount} image(s) matched.
          {items.length - matchedCount > 0 && ` ${items.length - matchedCount} item(s) without images.`}
        </p>
      )}
    </div>
  );
}
