"use client";

import { MoreHorizontal } from "lucide-react";
import * as React from "react";
import {
  type ContextMenuItemSchema,
  DropdownMenuItems,
  MobileDrawerMenu,
} from "@/components/context-menu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export interface ActionsDropdownProps {
  /** Menu schema — identical to the one consumed by UniversalContextMenu */
  items: ContextMenuItemSchema[];
  /** Screen-reader label for the trigger button */
  label?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  disabled?: boolean;
  /** Also disable every (non-separator/label) menu item — e.g. while a mutation is pending */
  itemDisabled?: boolean;
  /** Render nothing when there are no items (e.g. permission-less detail page) */
  hideWhenEmpty?: boolean;
  /** Extra classes for the popover/content */
  className?: string;
  /** Extra classes for the trigger button */
  triggerClassName?: string;
  /** Custom trigger content (defaults to a MoreHorizontal icon) */
  trigger?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Universal three-dot actions dropdown.
 *
 * Renders the same `ContextMenuItemSchema[]` as `UniversalContextMenu`: on
 * desktop it's a radix DropdownMenu, on mobile the shared drawer. Actions are
 * resolved elsewhere (per user via CASL ability + record state) and passed in
 * as `items`.
 */
export function ActionsDropdown({
  items,
  label = "More actions",
  align = "end",
  side = "bottom",
  sideOffset = 4,
  disabled,
  itemDisabled,
  hideWhenEmpty,
  className,
  triggerClassName,
  trigger,
  onOpenChange,
}: ActionsDropdownProps) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const renderItems = React.useMemo(() => {
    if (!itemDisabled) return items;
    return items.map((item) => {
      if (item.type === "separator" || item.type === "label") return item;
      return { ...item, disabled: true };
    });
  }, [items, itemDisabled]);

  if (hideWhenEmpty && items.length === 0) {
    return null;
  }

  // Hydration safety: deterministic <button> markup until client mount decides
  // between the dropdown and the drawer.
  if (!mounted || !isMobile) {
    return (
      <DropdownMenu onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={label}
            disabled={disabled}
            className={cn("size-8", triggerClassName)}
          >
            {trigger ?? <MoreHorizontal className="size-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={align}
          side={side}
          sideOffset={sideOffset}
          className={className}
        >
          <DropdownMenuItems items={renderItems} />
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={label}
        disabled={disabled}
        onClick={() => setDrawerOpen(true)}
        className={cn("size-8", triggerClassName)}
      >
        {trigger ?? <MoreHorizontal className="size-4" />}
      </Button>
      <MobileDrawerMenu
        items={renderItems}
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          onOpenChange?.(open);
        }}
      />
    </>
  );
}
