'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '@/lib/utils';
import { Separator } from '../../components/ui/separator';
import { useSidebar } from '../../components/sidebar';
import { SidebarToggleButton } from './App-Sidebar';

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
        <SidebarToggleButton className="hidden md:flex" />
        <Separator orientation="vertical" className="bg-primary w-1 h-1/2 rounded-2xl" />

        {/* Left Section */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {leftContent || (
            <div className="flex items-center gap-2 truncate">
              {title && (
                <>
                  {icon && <span className="text-muted-foreground">{icon}</span>}
                  <h1 className="text-xl font-semibold capitalize truncate">{title}</h1>
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
