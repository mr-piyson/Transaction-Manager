'use client';

import * as React from 'react';
import { ChevronRight, ArrowLeft, ChevronDown, LucideIcon } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuShortcut,
} from '@/components/ui/dropdown-menu';
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';

// ─── Discriminated Union Schema Types ────────────────────────────────────────
// Identical to the context-menu schema — reuse or re-export as needed.

interface BaseMenuItem {
  /** Unique identifier for stable React keys */
  id: string;
  /** Whether the item is disabled */
  disabled?: boolean;
}

export interface DropdownMenuActionItem extends BaseMenuItem {
  type?: 'item';
  label: string;
  /** Lucide icon component */
  icon?: LucideIcon;
  onClick?: (data: any) => void;
  shortcut?: string;
  destructive?: boolean;
  children?: DropdownMenuItemSchema[];
}

export interface DropdownMenuSwitchItem extends BaseMenuItem {
  type: 'switch';
  label: string;
  /** Lucide icon component */
  icon?: LucideIcon;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export interface DropdownMenuSeparatorItem {
  id: string;
  type: 'separator';
}

export interface DropdownMenuLabelItem {
  id: string;
  type: 'label';
  label: string;
  /** Lucide icon component */
  icon?: LucideIcon;
}

export type DropdownMenuItemSchema =
  | DropdownMenuActionItem
  | DropdownMenuSwitchItem
  | DropdownMenuSeparatorItem
  | DropdownMenuLabelItem;

export interface UniversalDropdownMenuProps {
  /** The menu schema */
  items: DropdownMenuItemSchema[];
  /**
   * The trigger element. Rendered as a button that opens the dropdown/drawer.
   * Receives `open` state so you can style it (e.g. rotate a chevron).
   */
  trigger: React.ReactNode | ((open: boolean) => React.ReactNode);
  /** Optional className for the trigger wrapper */
  className?: string;
  /** Alignment of the desktop dropdown relative to the trigger (default: "start") */
  align?: 'start' | 'center' | 'end';
  /** Side of the desktop dropdown relative to the trigger (default: "bottom") */
  side?: 'top' | 'right' | 'bottom' | 'left';
}

// ─── Shared Icon Renderer ────────────────────────────────────────────────────

function MenuIcon({
  icon: Icon,
  size = 16,
  className,
}: {
  icon: LucideIcon;
  size?: number;
  className?: string;
}) {
  return <Icon size={size} className={cn('shrink-0', className)} aria-hidden="true" />;
}

// ─── Desktop: Recursive Dropdown Menu Items (memoized) ──────────────────────

const DesktopMenuItems = React.memo(function DesktopMenuItems({
  items,
}: {
  items: DropdownMenuItemSchema[];
}) {
  return (
    <>
      {items.map((item) => {
        if (item.type === 'separator') {
          return <DropdownMenuSeparator key={item.id} />;
        }

        if (item.type === 'label') {
          return (
            <DropdownMenuLabel key={item.id}>
              <span className="flex items-center gap-2">
                {item.icon && (
                  <MenuIcon icon={item.icon} size={14} className="text-muted-foreground" />
                )}
                {item.label}
              </span>
            </DropdownMenuLabel>
          );
        }

        if (item.type === 'switch') {
          return (
            <DropdownMenuItem
              key={item.id}
              disabled={item.disabled}
              onSelect={(e) => {
                e.preventDefault();
                item.onCheckedChange?.(!item.checked);
              }}
              className="flex items-center justify-between gap-4"
            >
              <span className="flex items-center gap-2">
                {item.icon && (
                  <MenuIcon icon={item.icon} size={16} className="text-muted-foreground" />
                )}
                {item.label}
              </span>
              <Switch
                checked={item.checked}
                tabIndex={-1}
                className="pointer-events-none scale-75"
              />
            </DropdownMenuItem>
          );
        }

        // type === "item" or undefined (default action item)
        const actionItem = item as DropdownMenuActionItem;

        if (actionItem.children && actionItem.children.length > 0) {
          return (
            <DropdownMenuSub key={item.id}>
              <DropdownMenuSubTrigger disabled={item.disabled}>
                <span className="flex items-center gap-2">
                  {actionItem.icon && (
                    <MenuIcon icon={actionItem.icon} size={16} className="text-muted-foreground" />
                  )}
                  {actionItem.label}
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-48">
                <DesktopMenuItems items={actionItem.children} />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          );
        }

        return (
          <DropdownMenuItem
            key={item.id}
            disabled={item.disabled}
            onClick={() => actionItem.onClick?.(item)}
            className={cn(
              actionItem.destructive &&
                'text-destructive focus:bg-destructive/10 focus:text-destructive',
            )}
          >
            <span className="flex items-center gap-2">
              {actionItem.icon && (
                <MenuIcon
                  icon={actionItem.icon}
                  size={16}
                  className={actionItem.destructive ? 'text-destructive' : 'text-muted-foreground'}
                />
              )}
              {actionItem.label}
            </span>
            {actionItem.shortcut && (
              <DropdownMenuShortcut>{actionItem.shortcut}</DropdownMenuShortcut>
            )}
          </DropdownMenuItem>
        );
      })}
    </>
  );
});

// ─── Mobile: Drawer Items (memoized) ────────────────────────────────────────
// Identical logic to the context-menu mobile drawer items.

const MobileDrawerItems = React.memo(function MobileDrawerItems({
  items,
  onNavigate,
  onClose,
}: {
  items: DropdownMenuItemSchema[];
  onNavigate: (title: string, children: DropdownMenuItemSchema[]) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-0.5" role="menu">
      {items.map((item) => {
        if (item.type === 'separator') {
          return <div key={item.id} className="my-1 h-px bg-border" role="separator" />;
        }

        if (item.type === 'label') {
          return (
            <div
              key={item.id}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {item.icon && <MenuIcon icon={item.icon} size={14} />}
              {item.label}
            </div>
          );
        }

        if (item.type === 'switch') {
          return (
            <div
              key={item.id}
              role="menuitemcheckbox"
              aria-checked={item.checked}
              aria-disabled={item.disabled}
              tabIndex={item.disabled ? -1 : 0}
              onClick={() => !item.disabled && item.onCheckedChange?.(!item.checked)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !item.disabled) {
                  e.preventDefault();
                  item.onCheckedChange?.(!item.checked);
                }
              }}
              className={cn(
                'flex w-full cursor-pointer items-center justify-between gap-4 rounded-lg px-3 py-3 text-sm transition-colors',
                'active:bg-accent',
                item.disabled && 'pointer-events-none opacity-50',
              )}
            >
              <span className="flex items-center gap-3 text-foreground">
                {item.icon && (
                  <MenuIcon icon={item.icon} size={20} className="text-muted-foreground" />
                )}
                {item.label}
              </span>
              <Switch checked={item.checked} tabIndex={-1} className="pointer-events-none" />
            </div>
          );
        }

        // type === "item" or undefined
        const actionItem = item as DropdownMenuActionItem;

        if (actionItem.children && actionItem.children.length > 0) {
          return (
            <button
              key={item.id}
              disabled={item.disabled}
              onClick={() => {
                if (!item.disabled) {
                  onNavigate(actionItem.label, actionItem.children!);
                }
              }}
              className={cn(
                'flex w-full items-center justify-between gap-4 rounded-lg px-3 py-3 text-sm transition-colors',
                'active:bg-accent',
                item.disabled && 'pointer-events-none opacity-50',
              )}
            >
              <span className="flex items-center gap-3 text-foreground">
                {actionItem.icon && (
                  <MenuIcon icon={actionItem.icon} size={20} className="text-muted-foreground" />
                )}
                {actionItem.label}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          );
        }

        return (
          <button
            key={item.id}
            disabled={item.disabled}
            onClick={() => {
              actionItem.onClick?.(item);
              onClose();
            }}
            className={cn(
              'flex w-full items-center justify-between gap-4 rounded-lg px-3 py-3 text-sm transition-colors',
              'active:bg-accent',
              actionItem.destructive && 'text-destructive',
              item.disabled && 'pointer-events-none opacity-50',
            )}
          >
            <span className="flex items-center gap-3">
              {actionItem.icon && (
                <MenuIcon
                  icon={actionItem.icon}
                  size={20}
                  className={actionItem.destructive ? 'text-destructive' : 'text-muted-foreground'}
                />
              )}
              {actionItem.label}
            </span>
            {actionItem.shortcut && (
              <span className="text-xs text-muted-foreground">{actionItem.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
});

// ─── Mobile Drawer Container ─────────────────────────────────────────────────

interface DrawerLevel {
  title: string;
  items: DropdownMenuItemSchema[];
}

function MobileDrawerMenu({
  items,
  open,
  onOpenChange,
}: {
  items: DropdownMenuItemSchema[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [stack, setStack] = React.useState<DrawerLevel[]>([{ title: 'Menu', items }]);

  // Reset stack to root whenever drawer opens
  React.useEffect(() => {
    if (open) {
      setStack([{ title: 'Menu', items }]);
    }
  }, [open, items]);

  const currentLevel = stack[stack.length - 1];
  const canGoBack = stack.length > 1;

  const pushLevel = React.useCallback((title: string, children: DropdownMenuItemSchema[]) => {
    setStack((prev) => [...prev, { title, items: children }]);
  }, []);

  const popLevel = React.useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const handleClose = React.useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="min-h-[50dvh] max-h-[85dvh]">
        <DrawerTitle className="sr-only">{currentLevel.title}</DrawerTitle>
        <DrawerDescription className="sr-only">Dropdown menu options</DrawerDescription>

        {/* Header with back navigation */}
        <div className="flex items-center gap-3 border-b border-border px-4 pb-3 pt-2">
          {canGoBack ? (
            <button
              onClick={popLevel}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
          ) : null}
          <span className={cn('text-sm font-semibold text-foreground', canGoBack && 'ml-auto')}>
            {currentLevel.title}
          </span>
        </div>

        {/* Scrollable menu items */}
        <div className="overflow-y-auto overscroll-contain px-2 py-2">
          <MobileDrawerItems
            items={currentLevel.items}
            onNavigate={pushLevel}
            onClose={handleClose}
          />
        </div>

        {/* Safe area padding for iOS bottom inset */}
        <div className="pb-safe h-2" />
      </DrawerContent>
    </Drawer>
  );
}

// ─── Universal Dropdown Menu ──────────────────────────────────────────────────

export function UniversalDropdownMenu({
  items,
  trigger,
  className,
  align = 'start',
  side = 'bottom',
}: UniversalDropdownMenuProps) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  // Hydration safety: wait for client mount before rendering platform-specific UI
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const resolvedTrigger = typeof trigger === 'function' ? trigger(open) : trigger;

  // Before hydration completes, render an inert wrapper to avoid mismatch
  if (!mounted) {
    return (
      <div className={className}>
        <div className="cursor-pointer">{resolvedTrigger}</div>
      </div>
    );
  }

  // ─── Mobile: tap trigger → bottom drawer (same UX as context menu) ─────────
  if (isMobile) {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="cursor-pointer"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          {resolvedTrigger}
        </button>
        <MobileDrawerMenu items={items} open={open} onOpenChange={setOpen} />
      </div>
    );
  }

  // ─── Desktop: Radix DropdownMenu ────────────────────────────────────────────
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={cn('cursor-pointer', className)}
            aria-haspopup="menu"
            aria-expanded={open}
          >
            {resolvedTrigger}
          </button>
        }
      ></DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56" align={align} side={side}>
        <DesktopMenuItems items={items} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
