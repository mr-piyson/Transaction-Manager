"use client";

import { ImageIcon, ImagePlus, Loader2, Upload, X } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

interface ImageUploadProps {
  value?: string | null;
  file: File | null;
  onFileChange: (file: File | null) => void;
  onRemove?: () => void;
  disabled?: boolean;
  imageRemoved?: boolean;
  /** Called when an external image URL is dropped and uploaded server-side */
  onUrlDrop?: (storagePath: string) => void;
}

export function ImageUpload({
  value,
  file,
  onFileChange,
  onRemove,
  disabled,
  imageRemoved,
  onUrlDrop,
}: ImageUploadProps) {
  const [preview, setPreview] = React.useState<string | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [isFetchingUrl, setIsFetchingUrl] = React.useState(false);
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

  const extractUrlFromDrop = (e: React.DragEvent): string | null => {
    // Check text/uri-list first (standard for URL drops), then text/plain
    const uriList = e.dataTransfer.getData("text/uri-list");
    if (uriList) {
      // text/uri-list can contain comments (lines starting with #) and multiple URLs
      // Take the first non-comment, non-empty line
      const lines = uriList.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          return trimmed;
        }
      }
    }
    const text = e.dataTransfer.getData("text/plain");
    if (text && /^https?:\/\//i.test(text.trim())) {
      return text.trim();
    }
    return null;
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;

    // Try to extract a URL (e.g. dragging from Google Images)
    const droppedUrl = extractUrlFromDrop(e);
    if (droppedUrl && onUrlDrop) {
      setIsFetchingUrl(true);
      try {
        const res = await fetch("/api/proxy-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: droppedUrl }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error ?? "Failed to fetch image");
        }
        onUrlDrop(data.storagePath as string);
      } catch (err) {
        console.error("[ImageUpload URL drop]", err);
        // Import toast dynamically to avoid circular deps
        const { toast } = await import("sonner");
        toast.error("Could not fetch image from URL", {
          description:
            err instanceof Error
              ? err.message
              : "Try downloading the image first.",
        });
      } finally {
        setIsFetchingUrl(false);
      }
      return;
    }

    // Otherwise, handle as a local file drop
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
    e.target.value = "";
  };

  const remove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileChange(null);
    onRemove?.();
  };

  const displayUrl = imageRemoved ? null : (preview ?? value);

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleChange}
        className="hidden"
        tabIndex={-1}
      />

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDrop={!isFetchingUrl ? handleDrop : undefined}
        onDragOver={!isFetchingUrl ? handleDragOver : undefined}
        onDragLeave={!isFetchingUrl ? handleDragLeave : undefined}
        className={cn(
          "relative group flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden",
          displayUrl ? "h-40 p-0 border-solid border-muted" : "h-32 p-4",
          isDragOver && "border-primary bg-primary/5 scale-[1.01]",
          !isDragOver &&
            !displayUrl &&
            "hover:border-muted-foreground/50 hover:bg-muted/30",
          disabled && "opacity-50 cursor-not-allowed",
          isFetchingUrl && "pointer-events-none opacity-70",
        )}
      >
        {displayUrl ? (
          <>
            <img
              src={displayUrl}
              alt="Item preview"
              className="h-full w-full object-contain"
            />
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
            ) : isFetchingUrl ? (
              <Loader2 className="size-8 text-primary animate-spin" />
            ) : (
              <ImagePlus className="size-8" />
            )}
            <p className="text-xs font-medium">
              {isFetchingUrl
                ? "Fetching image..."
                : isDragOver
                  ? "Drop image here"
                  : "Drop image or click to browse"}
            </p>
            <p className="text-[11px] text-muted-foreground/70">
              JPG, PNG, or WebP · Max 5 MB · You can also drag from Google
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
