import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UseMutationResult } from '@tanstack/react-query';

// --- Variants remain the same ---
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: 'bg-primary/50 hover:bg-primary/20 text-primary',
        outline: 'border border-border bg-background hover:bg-muted',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-muted hover:text-foreground',
        destructive: 'bg-destructive/10 hover:bg-destructive/20 text-destructive',
        success: 'bg-success-foreground/40 hover:bg-success-foreground/60 text-white',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3',
        lg: 'h-10 rounded-md px-6',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends Omit<React.ComponentProps<'button'>, 'children'>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  children?: React.ReactNode;

  /** * Directly pass a TanStack Mutation object.
   * It will automatically sync isLoading, isError, and disabled states.
   */
  mutation?: UseMutationResult<any, any, any, any>;

  isLoading?: boolean;
  loadingText?: string;
  isError?: boolean;
  errorText?: string;

  // Confirmation Props
  confirm?: boolean;
  confirmTitle?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      children,
      mutation,
      isLoading: manualIsLoading,
      loadingText,
      isError: manualIsError,
      errorText = 'An error occurred',
      confirm,
      onClick,
      disabled,
      ...props
    },
    ref,
  ) => {
    // Sync with React Query state if mutation prop is provided
    const loading = manualIsLoading || mutation?.isPending;
    const error = manualIsError || mutation?.isError;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (confirm && !window.confirm('Are you sure?')) {
        return;
      }
      onClick?.(e);
    };

    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        onClick={handleClick}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" />
            {loadingText || children}
          </>
        ) : error ? (
          <>
            <AlertTriangle className="text-destructive" />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
