'use client';

import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarToggleButton } from './App-Sidebar';
import { NavUser } from '@/components/layout/User-Options';

interface HeaderProps {
  title?: ReactNode;
  subtitle?: string;
  icon?: ReactNode;
  leftContent?: ReactNode;
  actions?: ReactNode;
  rightContent?: ReactNode;
  showBorder?: boolean;
  sticky?: boolean;
  transparent?: boolean;
  showBackButton?: boolean;
  className?: string;
  children?: ReactNode;
  description?: string;
  onCreate?: () => void;
  createLabel?: string;
}

export function Header({
  title,
  subtitle,
  icon,
  leftContent,
  actions,
  rightContent,
  showBorder = true,
  sticky = true,
  transparent = false,
  showBackButton = false,
  className,
  children,
  description,
  onCreate,
  createLabel,
}: HeaderProps) {
  const t = useTranslations();
  return (
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
      <SidebarToggleButton />
      <Separator orientation="vertical" className="bg-border w-1 h-1/2 rounded-2xl" />

      {/* Left Section */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {leftContent || (
          <div className="flex items-center gap-2 truncate">
            {title && (
              <div className="flex flex-row gap-2 items-center truncate">
                {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
                <div className="truncate">
                  <h1 className="text-lg font-semibold capitalize truncate">{title}</h1>
                  {subtitle && (
                    <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                  )}
                </div>
                {description && (
                  <p className="text-sm text-muted-foreground truncate hidden sm:block">
                    {description}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}

      {/* Create Button */}
      {onCreate && (
        <Button size="sm" className="gap-1.5 shrink-0" onClick={onCreate}>
          <Plus className="size-4" />
          {createLabel ?? t('common.create')}
        </Button>
      )}

      {/* Right Content */}
      {rightContent && <div className="flex items-center gap-2 shrink-0">{rightContent}</div>}

      <NavUser />
    </header>
  );
}
