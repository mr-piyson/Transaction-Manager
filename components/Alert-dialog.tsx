// lib/alert.ts
"use client";
import { ReactNode } from "react";

export type AlertVariant =
  | "default"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "delete";

export type ConfirmOptions = {
  title: ReactNode;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: AlertVariant;
  destructive?: boolean;
  onConfirm?: () => void | Promise<void>;
};

export type AlertController = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

let controller: AlertController | null = null;

function ensureController() {
  if (!controller) throw new Error("AlertProvider is not mounted");
  return controller;
}

export const alert = {
  _setController(c: AlertController) {
    controller = c;
  },

  confirm(options: ConfirmOptions) {
    return ensureController().confirm(options);
  },

  success(options: Omit<ConfirmOptions, "variant">) {
    return ensureController().confirm({ ...options, variant: "success" });
  },

  error(options: Omit<ConfirmOptions, "variant">) {
    return ensureController().confirm({
      ...options,
      variant: "error",
      destructive: true,
    });
  },

  warning(options: Omit<ConfirmOptions, "variant">) {
    return ensureController().confirm({
      ...options,
      variant: "warning",
      destructive: true,
    });
  },

  info(options: Omit<ConfirmOptions, "variant">) {
    return ensureController().confirm({ ...options, variant: "info" });
  },

  delete(options: Omit<ConfirmOptions, "variant">) {
    return ensureController().confirm({
      ...options,
      variant: "delete",
      destructive: true,
    });
  },
};

// components/providers/alert-provider.tsx

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type QueueItem = {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
};

function VariantIcon({ variant }: { variant?: AlertVariant }) {
  switch (variant) {
    case "success":
      return <CheckCircle2 />;
    case "delete":
      return <Trash2 />;
    case "error":
      return <XCircle />;
    case "warning":
      return <AlertTriangle />;
    case "info":
      return <Info />;
    default:
      return null;
  }
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const queueRef = useRef<QueueItem[]>([]);
  const [current, setCurrent] = useState<QueueItem | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const processingRef = useRef(false);

  const processQueue = useCallback(() => {
    if (processingRef.current) return;
    const next = queueRef.current.shift();
    if (!next) return;
    processingRef.current = true;
    setCurrent(next);
    setOpen(true);
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) => {
      return new Promise<boolean>((resolve) => {
        queueRef.current.push({ options, resolve });
        processQueue();
      });
    },
    [processQueue],
  );

  const close = useCallback(() => {
    setOpen(false);
    setTimeout(() => {
      processingRef.current = false;
      setLoading(false);
      setCurrent(null);
      processQueue();
    }, 0);
  }, [processQueue]);

  const handleCancel = useCallback(() => {
    if (loading) return;
    current?.resolve(false);
    close();
  }, [current, close, loading]);

  const handleConfirm = useCallback(async () => {
    if (!current) return;
    try {
      setLoading(true);
      await current.options.onConfirm?.();
      current.resolve(true);
    } catch {
      current.resolve(false);
    } finally {
      close();
    }
  }, [current, close]);

  useEffect(() => {
    alert._setController({ confirm });
  }, [confirm]);

  const opts = current?.options;

  return (
    <>
      {children}

      <AlertDialog open={open} onOpenChange={(v) => !v && handleCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {opts?.title}
            </AlertDialogTitle>

            {opts?.description && (
              <AlertDialogDescription
                className="w-full"
                render={<div>{opts.description}</div>}
              ></AlertDialogDescription>
            )}
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading} onClick={handleCancel}>
              {opts?.cancelText ?? "Cancel"}
            </AlertDialogCancel>

            <AlertDialogAction
              disabled={loading}
              data-destructive={opts?.destructive || undefined}
              className={cn(opts?.destructive && "bg-destructive")}
              onClick={handleConfirm}
            >
              <VariantIcon variant={opts?.variant} />
              {loading ? "Processing..." : (opts?.confirmText ?? "Confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
