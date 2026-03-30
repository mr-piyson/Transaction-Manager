'use client';

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          success:
            'backdrop-blur-md! supports-backdrop-filter:bg-success/60! bg-success/95! text-success-foreground!',

          warning:
            'backdrop-blur-md! supports-backdrop-filter:bg-warning/60! bg-warning/95! text-warning-foreground!',
          error:
            'backdrop-blur-md! supports-backdrop-filter:bg-destructive/50! bg-destructive/95! text-white border-red-600!',
          info: 'backdrop-blur-md! supports-backdrop-filter:bg-primary/60! bg-primary/95! text-white border-blue-600!',
          loading:
            'backdrop-blur-md supports-backdrop-filter:bg-gray-600/60 bg-gray-600/95! text-white border-gray-600',
        },
      }}
      style={
        {
          '--normal-bg': 'var(--popover-foreground)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
