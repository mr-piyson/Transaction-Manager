'use client';

import { ImagePlus, X, Upload, ImageIcon } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

interface ImageUploadProps {
  value?: string | null;
  file: File | null;
  onFileChange: (file: File | null) => void;
  onRemove?: () => void;
  disabled?: boolean;
}

export function ImageUpload({ value, file, onFileChange, onRemove, disabled }: ImageUploadProps) {
  const [preview, setPreview] = React.useState<string | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Generate preview URL when file changes
  React.useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const validate = (f: File): boolean => {
    if (!(ACCEPTED_TYPES as readonly string[]).includes(f.type)) {
      return false;
    }
    if (f.size > MAX_SIZE) {
      return false;
    }
    return true;
  };

  const handleFile = (f: File | null) => {
    if (!f || disabled) return;
    if (validate(f)) {
      onFileChange(f);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;
    const f = e.dataTransfer.files?.[0];
    handleFile(f ?? null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    handleFile(f ?? null);
    e.target.value = '';
  };

  const remove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileChange(null);
    onRemove?.();
  };

  const displayUrl = preview ?? value;

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleChange}
        className="hidden"
        tabIndex={-1}
      />

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative group flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden',
          displayUrl ? 'h-40 p-0 border-solid border-muted' : 'h-32 p-4',
          isDragOver && 'border-primary bg-primary/5 scale-[1.01]',
          !isDragOver && !displayUrl && 'hover:border-muted-foreground/50 hover:bg-muted/30',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        {displayUrl ? (
          <>
            <img src={displayUrl} alt="Item image" className="h-full w-full object-contain" />
            {!disabled && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    inputRef.current?.click();
                  }}
                  className="h-8 text-xs"
                >
                  <Upload className="size-3 mr-1" />
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={remove}
                  className="h-8 text-xs"
                >
                  <X className="size-3 mr-1" />
                  Remove
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
            {isDragOver ? (
              <ImageIcon className="size-8 text-primary animate-pulse" />
            ) : (
              <ImagePlus className="size-8" />
            )}
            <p className="text-xs font-medium">
              {isDragOver ? 'Drop image here' : 'Drop image or click to browse'}
            </p>
            <p className="text-[11px] text-muted-foreground/70">JPG, PNG, or WebP · Max 5 MB</p>
          </div>
        )}
      </div>
    </div>
  );
}
