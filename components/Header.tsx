'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronLeft,
  LucideSidebarOpen,
  Sidebar,
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { useSidebar } from './sidebar';

interface HeaderProps {
  title?: ReactNode;
  icon?: ReactNode;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  showBorder?: boolean;
  sticky?: boolean;
  transparent?: boolean;
  showBackButton?: boolean;
  className?: string;
}

export function Header({
  title,
  icon,
  leftContent,
  rightContent,
  showBorder = true,
  sticky = true,
  transparent = false,
  showBackButton = false,
  className,
}: HeaderProps) {
  const router = useRouter();
  const sidebar = useSidebar();

  function OldHeader() {
    return (
      <>
        <header
          className={cn(
            'w-full z-50 transition-all duration-300 print:hidden',
            sticky && 'sticky top-0',
            transparent
              ? 'bg-transparent'
              : 'bg-background/95 backdrop-blur-md supports-backdrop-filter:bg-background/60',
            showBorder && 'border-b border-border',
            className,
          )}
        >
          <div className="mx-auto px-4 sm:px-6">
            <div className="flex h-16 items-center justify-between gap-4">
              {/* Left Section */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {showBackButton && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="mr-1"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                )}

                {leftContent || (
                  <div className="flex items-center gap-2 truncate">
                    {title && (
                      <>
                        <div className="hidden sm:block bg-primary w-1 h-6 rounded-full" />
                        {icon && (
                          <span className="text-muted-foreground">{icon}</span>
                        )}
                        <h1 className="text-xl sm:text-2xl font-semibold capitalize truncate">
                          {title}
                        </h1>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Right Section */}
              {rightContent && (
                <div className="flex items-center gap-2">{rightContent}</div>
              )}
            </div>
          </div>
        </header>
      </>
    );
  }

  return (
    <>
      <header
        className={cn(
          'flex h-14 items-center gap-2 px-2 z-50 transition-all duration-300 print:hidden',
          sticky && 'sticky top-0',
          transparent
            ? 'bg-transparent'
            : 'bg-background/95 backdrop-blur-md supports-backdrop-filter:bg-background/60',
          showBorder && 'border-b border-border',
          className,
        )}
      >
        <Button
          variant={'ghost'}
          className="px-2 "
          onClick={sidebar.toggleSidebar}
        >
          <Sidebar />
        </Button>
        <Separator
          orientation="vertical"
          className="bg-primary w-1 h-1/2 rounded-2xl"
        />

        {/* Left Section */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {leftContent || (
            <div className="flex items-center gap-2 truncate">
              {title && (
                <>
                  {icon && (
                    <span className="text-muted-foreground">{icon}</span>
                  )}
                  <h1 className="text-xl font-semibold capitalize truncate">
                    {title}
                  </h1>
                </>
              )}
            </div>
          )}
        </div>
        {rightContent}
      </header>
    </>
  );
}
