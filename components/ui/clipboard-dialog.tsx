'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface ClipboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  text: string;
  label: string;
}

export function ClipboardDialog({ open, onOpenChange, text, label }: ClipboardDialogProps) {
  const t = useTranslations();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="size-4" />
            {label}
          </DialogTitle>
          <DialogDescription>
            {t('clipboard.automationFailed') || 'Press Ctrl+C (or Cmd+C on Mac) to copy the text below.'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Input
            ref={inputRef}
            value={text}
            readOnly
            onClick={(e) => {
              e.currentTarget.focus();
              e.currentTarget.select();
            }}
            className="font-mono text-sm"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
