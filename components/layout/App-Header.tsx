'use client';

import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarToggleButton } from './App-Sidebar';
import { NavUser } from '@/components/layout/User-Options';
import { CommandPaletteTrigger } from '@/components/command-palette';

interface HeaderProps {
  title?: ReactNode;
  subtitle?: string;
  icon?: ReactNode;
  showBorder?: boolean;
  sticky?: boolean;
  transparent?: boolean;
  className?: string;
  description?: string;
  actions?: ReactNode;
  rightContent?: ReactNode;
  onCreate?: () => void;
  createLabel?: string;
  children?: ReactNode;
}

export function Header({
  title,
  subtitle,
  icon,
  showBorder = true,
  sticky = true,
  transparent = false,
  className,
  description,
  actions,
  rightContent,
  onCreate,
  createLabel,
  children,
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
        <div className="flex items-center gap-2 truncate">
          {title && (
            <div className="flex flex-row gap-2 items-center truncate">
              {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
              <div className="truncate">
                <h1 className="text-lg font-semibold capitalize truncate">{title}</h1>
                {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
              </div>
              {description && (
                <p className="text-sm text-muted-foreground truncate hidden sm:block">
                  {description}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Children / Actions */}
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      {onCreate && (
        <Button size="sm" onClick={onCreate}>
          <Plus className="size-4 mr-1" />
          {createLabel ?? 'Create'}
        </Button>
      )}

      {/* Right Content */}
      {rightContent && <div className="flex items-center gap-2 shrink-0">{rightContent}</div>}

      {/* Command Palette */}
      <CommandPaletteTrigger />
      {/* User DropDown */}
      <NavUser />
    </header>
  );
}
