"use client";

import * as React from "react";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";

// ─── Discriminated Union Schema Types ────────────────────────────────────────

interface BaseMenuItem {
  /** Unique identifier for stable React keys */
  id: string;
  /** Whether the item is disabled */
  disabled?: boolean;
}

export interface ContextMenuActionItem extends BaseMenuItem {
  type?: "item";
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  shortcut?: string;
  destructive?: boolean;
  children?: ContextMenuItemSchema[];
}

export interface ContextMenuSwitchItem extends BaseMenuItem {
  type: "switch";
  label: string;
  icon?: React.ReactNode;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export interface ContextMenuSeparatorItem {
  id: string;
  type: "separator";
}

export interface ContextMenuLabelItem {
  id: string;
  type: "label";
  label: string;
  icon?: React.ReactNode;
}

export type ContextMenuItemSchema = ContextMenuActionItem | ContextMenuSwitchItem | ContextMenuSeparatorItem | ContextMenuLabelItem;

export interface UniversalContextMenuProps {
  /** The menu schema */
  items: ContextMenuItemSchema[];
  /** The content to wrap (right-click / long-press target) */
  children: React.ReactNode;
  /** Optional className for the trigger wrapper */
  className?: string;
}

// ─── Desktop: Recursive Context Menu (memoized) ─────────────────────────────

const DesktopMenuItems = React.memo(function DesktopMenuItems({ items }: { items: ContextMenuItemSchema[] }) {
  return (
    <>
      {items.map(item => {
        if (item.type === "separator") {
          return <ContextMenuSeparator key={item.id} />;
        }

        if (item.type === "label") {
          return (
            <ContextMenuLabel key={item.id}>
              <span className="flex items-center gap-2">
                {item.icon && <span className="h-4 w-4 shrink-0 [&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>}
                {item.label}
              </span>
            </ContextMenuLabel>
          );
        }

        if (item.type === "switch") {
          return (
            <ContextMenuItem
              key={item.id}
              disabled={item.disabled}
              onSelect={e => {
                e.preventDefault();
                item.onCheckedChange?.(!item.checked);
              }}
              className="flex items-center justify-between gap-4"
            >
              <span className="flex items-center gap-2">
                {item.icon && <span className="h-4 w-4 shrink-0 [&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>}
                {item.label}
              </span>
              <Switch checked={item.checked} tabIndex={-1} className="pointer-events-none scale-75" />
            </ContextMenuItem>
          );
        }

        // type === "item" or undefined (default action item)
        const actionItem = item as ContextMenuActionItem;

        if (actionItem.children && actionItem.children.length > 0) {
          return (
            <ContextMenuSub key={item.id}>
              <ContextMenuSubTrigger disabled={item.disabled}>
                <span className="flex items-center gap-2">
                  {actionItem.icon && <span className="h-4 w-4 shrink-0 [&>svg]:h-4 [&>svg]:w-4">{actionItem.icon}</span>}
                  {actionItem.label}
                </span>
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="min-w-48">
                <DesktopMenuItems items={actionItem.children} />
              </ContextMenuSubContent>
            </ContextMenuSub>
          );
        }

        return (
          <ContextMenuItem
            key={item.id}
            disabled={item.disabled}
            onSelect={() => actionItem.onClick?.()}
            className={cn(actionItem.destructive && "text-destructive focus:bg-destructive/10 focus:text-destructive")}
          >
            <span className="flex items-center gap-2">
              {actionItem.icon && <span className="h-4 w-4 shrink-0 [&>svg]:h-4 [&>svg]:w-4">{actionItem.icon}</span>}
              {actionItem.label}
            </span>
            {actionItem.shortcut && <ContextMenuShortcut>{actionItem.shortcut}</ContextMenuShortcut>}
          </ContextMenuItem>
        );
      })}
    </>
  );
});

// ─── Mobile: Drawer Items (memoized) ────────────────────────────────────────

const MobileDrawerItems = React.memo(function MobileDrawerItems({
  items,
  onNavigate,
  onClose,
}: {
  items: ContextMenuItemSchema[];
  onNavigate: (title: string, children: ContextMenuItemSchema[]) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-0.5" role="menu">
      {items.map(item => {
        if (item.type === "separator") {
          return <div key={item.id} className="my-1 h-px bg-border" role="separator" />;
        }

        if (item.type === "label") {
          return (
            <div key={item.id} className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {item.icon && <span className="h-4 w-4 shrink-0 [&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>}
              {item.label}
            </div>
          );
        }

        if (item.type === "switch") {
          return (
            <div
              key={item.id}
              role="menuitemcheckbox"
              aria-checked={item.checked}
              aria-disabled={item.disabled}
              tabIndex={item.disabled ? -1 : 0}
              onClick={() => !item.disabled && item.onCheckedChange?.(!item.checked)}
              onKeyDown={e => {
                if ((e.key === "Enter" || e.key === " ") && !item.disabled) {
                  e.preventDefault();
                  item.onCheckedChange?.(!item.checked);
                }
              }}
              className={cn(
                "flex w-full cursor-pointer items-center justify-between gap-4 rounded-lg px-3 py-3 text-sm transition-colors",
                "active:bg-accent",
                item.disabled && "pointer-events-none opacity-50",
              )}
            >
              <span className="flex items-center gap-3 text-foreground">
                {item.icon && <span className="flex h-5 w-5 items-center justify-center text-muted-foreground [&>svg]:h-5 [&>svg]:w-5">{item.icon}</span>}
                {item.label}
              </span>
              <Switch checked={item.checked} tabIndex={-1} className="pointer-events-none" />
            </div>
          );
        }

        // type === "item" or undefined
        const actionItem = item as ContextMenuActionItem;

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
              className={cn("flex w-full items-center justify-between gap-4 rounded-lg px-3 py-3 text-sm transition-colors", "active:bg-accent", item.disabled && "pointer-events-none opacity-50")}
            >
              <span className="flex items-center gap-3 text-foreground">
                {actionItem.icon && <span className="flex h-5 w-5 items-center justify-center text-muted-foreground [&>svg]:h-5 [&>svg]:w-5">{actionItem.icon}</span>}
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
              actionItem.onClick?.();
              onClose();
            }}
            className={cn(
              "flex w-full items-center justify-between gap-4 rounded-lg px-3 py-3 text-sm transition-colors",
              "active:bg-accent",
              actionItem.destructive && "text-destructive",
              item.disabled && "pointer-events-none opacity-50",
            )}
          >
            <span className="flex items-center gap-3">
              {actionItem.icon && (
                <span className={cn("flex h-5 w-5 items-center justify-center [&>svg]:h-5 [&>svg]:w-5", actionItem.destructive ? "text-destructive" : "text-muted-foreground")}>{actionItem.icon}</span>
              )}
              {actionItem.label}
            </span>
            {actionItem.shortcut && <span className="text-xs text-muted-foreground">{actionItem.shortcut}</span>}
          </button>
        );
      })}
    </div>
  );
});

// ─── Mobile Drawer Container ─────────────────────────────────────────────────

interface DrawerLevel {
  title: string;
  items: ContextMenuItemSchema[];
}

function MobileDrawerMenu({ items, open, onOpenChange }: { items: ContextMenuItemSchema[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [stack, setStack] = React.useState<DrawerLevel[]>([{ title: "Menu", items }]);

  // Reset stack to root whenever drawer opens
  React.useEffect(() => {
    if (open) {
      setStack([{ title: "Menu", items }]);
    }
  }, [open, items]);

  const currentLevel = stack[stack.length - 1];
  const canGoBack = stack.length > 1;

  const pushLevel = React.useCallback((title: string, children: ContextMenuItemSchema[]) => {
    setStack(prev => [...prev, { title, items: children }]);
  }, []);

  const popLevel = React.useCallback(() => {
    setStack(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const handleClose = React.useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85dvh]">
        <DrawerTitle className="sr-only">{currentLevel.title}</DrawerTitle>
        <DrawerDescription className="sr-only">Context menu options</DrawerDescription>

        {/* Header with back navigation */}
        <div className="flex items-center gap-3 border-b border-border px-4 pb-3 pt-2">
          {canGoBack ? (
            <button onClick={popLevel} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground" aria-label="Go back">
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
          ) : null}
          <span className={cn("text-sm font-semibold text-foreground", canGoBack && "ml-auto")}>{currentLevel.title}</span>
        </div>

        {/* Scrollable menu items */}
        <div className="overflow-y-auto overscroll-contain px-2 py-2">
          <MobileDrawerItems items={currentLevel.items} onNavigate={pushLevel} onClose={handleClose} />
        </div>

        {/* Safe area padding for iOS bottom inset */}
        <div className="pb-safe h-2" />
      </DrawerContent>
    </Drawer>
  );
}

// ─── Universal Context Menu Wrapper ──────────────────────────────────────────

export function UniversalContextMenu({ items, children, className }: UniversalContextMenuProps) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Hydration safety: wait for client mount before rendering platform-specific UI
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // On mobile: prevent native context menu, trigger haptic feedback, open drawer
  const handleContextMenu = React.useCallback(
    (e: React.MouseEvent) => {
      if (isMobile) {
        e.preventDefault();
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(50);
        }
        setDrawerOpen(true);
      }
    },
    [isMobile],
  );

  // Before hydration completes, render an inert wrapper to avoid mismatch
  if (!mounted) {
    return <div className={className}>{children}</div>;
  }

  if (isMobile) {
    return (
      <>
        <div className={cn("select-none", className)} onContextMenu={handleContextMenu} style={{ WebkitTouchCallout: "none" }}>
          {children}
        </div>
        <MobileDrawerMenu items={items} open={drawerOpen} onOpenChange={setDrawerOpen} />
      </>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger className={className} asChild>
        <div>{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-56">
        <DesktopMenuItems items={items} />
      </ContextMenuContent>
    </ContextMenu>
  );
}
