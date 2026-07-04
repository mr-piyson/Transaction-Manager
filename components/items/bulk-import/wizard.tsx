'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Check, Upload, ImageIcon, Table2, ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc/client';
import { FileUploadStep } from './file-upload-step';
import { ImageUploadStep } from './image-upload-step';
import { PreviewStep } from './preview-step';
import { markForCleanup, removeFromCleanup, getPendingFileIds, cleanupUploadedFiles, clearPending } from './upload-cleanup';
import type { ParsedItem, ImportImage, ImportStep } from './types';

const STEPS: { key: ImportStep; label: string; icon: typeof Upload }[] = [
  { key: 'upload-file', label: 'Data File', icon: Upload },
  { key: 'upload-images', label: 'Images', icon: ImageIcon },
  { key: 'preview', label: 'Preview & Import', icon: Table2 },
];

function StepIndicator({ current, onNavigate }: { current: ImportStep; onNavigate?: (step: ImportStep) => void }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, i) => {
        const isActive = i === currentIdx;
        const isDone = i < currentIdx;
        const canClick = i <= currentIdx && onNavigate;
        return (
          <div key={step.key} className="flex items-center">
            <button
              type="button"
              onClick={() => canClick && onNavigate?.(step.key)}
              disabled={!canClick}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                isActive && 'bg-primary text-primary-foreground',
                isDone && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/50',
                !isActive && !isDone && 'bg-muted text-muted-foreground',
                canClick && 'cursor-pointer',
              )}
            >
              {isDone ? <Check className="size-4" /> : <step.icon className="size-4" />}
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={cn('w-8 h-0.5 mx-1', i < currentIdx ? 'bg-green-500' : 'bg-muted')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ItemImportWizard() {
  const [step, setStep] = useState<ImportStep>('upload-file');
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [images, setImages] = useState<ImportImage[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number } | null>(null);
  const cleanupRef = useRef(false);

  useEffect(() => {
    return () => {
      const ids = getPendingFileIds();
      if (ids.length > 0) {
        cleanupUploadedFiles(ids);
      }
    };
  }, []);

  const syncImages = useCallback((currentImages: ImportImage[], currentItems: ParsedItem[]): ParsedItem[] => {
    const imageMap = new Map<string, string>();
    for (const img of currentImages) {
      if (img.uploadState === 'done' && img.storagePath) {
        imageMap.set(img.sku, img.storagePath);
      }
    }
    return currentItems.map((item) => {
      const imgPath = imageMap.get(item.sku);
      if (imgPath) {
        return { ...item, image: imgPath, hasImage: true };
      }
      return item;
    });
  }, []);

  const prevImagesRef = useRef<ImportImage[]>([]);

  useEffect(() => {
    setItems((prev) => syncImages(images, prev));
  }, [images, syncImages]);

  useEffect(() => {
    const prev = prevImagesRef.current;
    for (const img of images) {
      const wasDone = prev.some((p) => p.sku === img.sku && p.uploadState === 'done');
      if (img.uploadState === 'done' && img.fileId && !wasDone) {
        markForCleanup(img.fileId);
      }
    }
    prevImagesRef.current = images;
  }, [images]);

  const bulkImport = trpc.items.bulkImport.useMutation({
    onSuccess: (data) => {
      clearPending();
      setResult(data);
      setStep('done');
      toast.success(`Import complete: ${data.created} created, ${data.updated} updated`);
    },
    onError: (err) => {
      toast.error('Import failed', { description: err.message });
    },
    onSettled: () => {
      setIsImporting(false);
    },
  });

  const handleParsed = useCallback((parsedItems: ParsedItem[]) => {
    setItems(parsedItems);
    setStep('upload-images');
  }, []);

  const handleImagesChange = useCallback((updater: ImportImage[] | ((prev: ImportImage[]) => ImportImage[])) => {
    setImages(updater);
  }, []);

  const handleClear = useCallback(() => {
    const ids = getPendingFileIds();
    if (ids.length > 0) {
      cleanupUploadedFiles(ids);
    }
    setItems([]);
    setImages([]);
    setResult(null);
    setStep('upload-file');
  }, []);

  const handleBackFromImages = useCallback(() => {
    const ids = getPendingFileIds();
    if (ids.length > 0) {
      cleanupUploadedFiles(ids);
    }
    setImages([]);
    setStep('upload-file');
    setItems((prev) => prev.map((item) => ({ ...item, image: undefined, hasImage: false })));
  }, []);

  const handleImport = useCallback(() => {
    if (items.length === 0) return;
    setIsImporting(true);

    const imageMap = new Map<string, string>();
    for (const img of images) {
      if (img.uploadState === 'done' && img.storagePath) {
        imageMap.set(img.sku, img.storagePath);
      }
    }

    const importItems = items.map((item) => ({
      sku: item.sku,
      name: item.name,
      description: item.description,
      salesPrice: item.salesPrice,
      purchasePrice: item.purchasePrice,
      unit: item.unit || 'pcs',
      minStock: item.minStock ?? 0,
      reorderPoint: item.reorderPoint ?? 0,
      reorderQty: item.reorderQty ?? 0,
      barcode: item.barcode,
      image: imageMap.get(item.sku) || item.image,
      categoryName: item.categoryName,
      taxRateId: item.taxRateId,
    }));

    bulkImport.mutate({ items: importItems, updateExisting: false });
  }, [items, images, bulkImport]);

  const currentIdx = STEPS.findIndex((s) => s.key === step);

  if (step === 'done' && result) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="size-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
          <Check className="size-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Import Complete</h2>
        <div className="space-y-1 text-sm text-muted-foreground mb-6">
          <p>{result.created} item(s) created</p>
          {result.updated > 0 && <p>{result.updated} item(s) updated</p>}
          {result.skipped > 0 && <p>{result.skipped} item(s) skipped</p>}
        </div>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={handleClear}>
            Import Another
          </Button>
          <Button onClick={() => window.location.href = '/erp/items'}>
            View Items
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <StepIndicator current={step} onNavigate={handleClear} />

      {step === 'upload-file' && (
        <FileUploadStep onParsed={handleParsed} onClear={handleClear} parsedItems={items} />
      )}

      {step === 'upload-images' && (
        <div className="space-y-4">
          <ImageUploadStep items={items} images={images} onImagesChange={handleImagesChange} />
          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={handleBackFromImages}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Button>
            <Button onClick={() => setStep('preview')}>
              Next <ArrowRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <PreviewStep
          items={items}
          onItemsChange={setItems}
          onClear={handleClear}
          onImport={handleImport}
          isImporting={isImporting}
        />
      )}
    </div>
  );
}
