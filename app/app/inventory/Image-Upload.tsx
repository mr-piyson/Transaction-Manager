'use client';

import React, { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { trpc } from '@/trpc/client';

interface ImageUploadProps {
  value?: File | string | undefined;
  onChange: (file: File | undefined) => void;
  error?: boolean;
}

export function ImageUpload({ value, onChange, error }: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onChange(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onChange(e.target.files[0]);
    }
  };

  const preview = value instanceof File ? URL.createObjectURL(value) : value;

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg transition-colors',
        dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20',
        error ? 'border-destructive' : '',
        'hover:bg-accent/50 cursor-pointer',
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleChange}
      />

      {preview ? (
        <div className="relative w-full h-full p-2">
          <img src={preview} alt="Preview" className="w-full h-full object-contain rounded-md" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-1 right-1 size-6 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              onChange(undefined);
            }}
          >
            <X className="size-3" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Upload className="size-8" />
          <p className="text-sm">Drag & drop or click to upload</p>
        </div>
      )}
    </div>
  );
}
