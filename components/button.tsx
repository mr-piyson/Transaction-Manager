import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Variants ────────────────────────────────────────────────────────────────

const buttonVariants = cva(
  "inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive relative",
  {
    variants: {
      variant: {
        default:
          "bg-primary/10 hover:bg-primary/20 focus-visible:ring-primary/20 dark:focus-visible:ring-primary/40 dark:bg-primary/20 text-primary focus-visible:border-primary/40 dark:hover:bg-primary/30",
        outline:
          "border border-border bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-muted hover:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/20 text-destructive focus-visible:border-destructive/40 dark:hover:bg-destructive/30",
        success:
          "bg-success/10 hover:bg-success/20 focus-visible:ring-success/20 dark:focus-visible:ring-success/40 dark:bg-success/20 text-success focus-visible:border-success/40 dark:hover:bg-success/30",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

// ─── Alert Dialog (headless, no extra dep) ───────────────────────────────────

interface ConfirmAlertProps {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmAlert({
  open,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmAlertProps) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Panel */}
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
        <div className="mb-1 flex items-center gap-2 text-base font-semibold text-foreground">
          <AlertTriangle className="size-4 text-destructive" />
          <span id="confirm-title">{title}</span>
        </div>
        <p id="confirm-desc" className="mb-5 text-sm text-muted-foreground">
          {description}
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-destructive/90 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-destructive"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Button Props ─────────────────────────────────────────────────────────────

export interface ButtonProps
  extends
    Omit<React.ComponentProps<"button">, "children">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;

  /** Left-side icon element */
  icon?: React.ReactNode;

  /** Button label text */
  children?: React.ReactNode;

  // ── Mutation / async state ──────────────────────────────────────────────────

  /**
   * Pass the `isPending` / `isLoading` flag from a React Query mutation or
   * any axios-driven state — the button will show a spinner and be disabled.
   */
  isLoading?: boolean;

  /**
   * Label shown beside the spinner while `isLoading` is true.
   * Defaults to the button's normal children.
   */
  loadingText?: string;

  /**
   * Pass the `isError` flag from a React Query mutation.
   * Switches the icon to a warning indicator.
   */
  isError?: boolean;

  /**
   * Error message tooltip / aria-label when `isError` is true.
   */
  errorText?: string;

  // ── Confirmation alert ──────────────────────────────────────────────────────

  /**
   * When `true`, a confirmation dialog is shown before the `onClick` fires.
   */
  confirm?: boolean;

  /** Title shown in the confirmation dialog. */
  confirmTitle?: string;

  /** Body text shown in the confirmation dialog. */
  confirmDescription?: string;

  /** Label for the confirm action button. */
  confirmLabel?: string;

  /** Label for the cancel button. */
  cancelLabel?: string;
}

// ─── Button ───────────────────────────────────────────────────────────────────

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,

  icon,
  children,

  isLoading = false,
  loadingText,
  isError = false,
  errorText = "An error occurred",

  confirm = false,
  confirmTitle,
  confirmDescription,
  confirmLabel,
  cancelLabel,

  onClick,
  disabled,
  ...props
}: ButtonProps) {
  const [alertOpen, setAlertOpen] = React.useState(false);
  // Holds the synthetic event so we can pass it after confirmation
  const pendingEventRef =
    React.useRef<React.MouseEvent<HTMLButtonElement> | null>(null);

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (confirm) {
        e.preventDefault();
        pendingEventRef.current = e;
        setAlertOpen(true);
        return;
      }
      onClick?.(e);
    },
    [confirm, onClick],
  );

  const handleConfirm = React.useCallback(() => {
    setAlertOpen(false);
    if (pendingEventRef.current && onClick) {
      onClick(pendingEventRef.current);
    }
    pendingEventRef.current = null;
  }, [onClick]);

  const handleCancel = React.useCallback(() => {
    setAlertOpen(false);
    pendingEventRef.current = null;
  }, []);

  // ── Resolve icon ────────────────────────────────────────────────────────────
  const resolvedIcon = React.useMemo(() => {
    if (isLoading) return <Loader2 className="animate-spin" aria-hidden />;
    if (isError)
      return <AlertTriangle className="text-destructive" aria-hidden />;
    return icon ?? null;
  }, [isLoading, isError, icon]);

  const resolvedChildren = isLoading && loadingText ? loadingText : children;

  const Comp = asChild ? Slot : "button";

  return (
    <>
      <Comp
        data-slot="button"
        data-variant={variant}
        data-size={size}
        aria-busy={isLoading || undefined}
        aria-label={isError ? errorText : props["aria-label"]}
        title={isError ? errorText : props.title}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || isLoading}
        onClick={handleClick}
        {...props}
      >
        {/*
          Layout:
          ┌──────────────────────────────────────┐
          │ [icon]   [     label     ]            │
          └──────────────────────────────────────┘
          Icon sits at the start (left-aligned).
          Label is centered in the remaining space.
          We use an absolutely-positioned icon trick so the text truly centres
          relative to the full button width.
        */}
        {resolvedIcon && (
          <span className="absolute left-3 flex items-center">
            {resolvedIcon}
          </span>
        )}
        <span
          className={cn(
            "flex-1 text-center",
            // Only offset when there's an icon so text remains centred
            resolvedIcon && "px-5",
          )}
        >
          {resolvedChildren}
        </span>
      </Comp>

      <ConfirmAlert
        open={alertOpen}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}

export { Button, buttonVariants };
