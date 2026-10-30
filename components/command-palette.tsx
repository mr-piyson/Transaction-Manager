"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  type LucideIcon,
  Search,
  Undo2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RouteConfig } from "@/components/layout/App-Sidebar";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { usePaletteActions } from "@/lib/actions";
import { apps } from "@/lib/apps";

interface FlatItem {
  id: string;
  label: string;
  href?: string;
  onSelect?: () => void | Promise<void>;
  icon?: LucideIcon;
  category: string;
  keywords: string[];
}

function flattenRoutes(
  routes: RouteConfig[],
  category: string,
  appSlug: string,
): FlatItem[] {
  const items: FlatItem[] = [];
  for (const route of routes) {
    if (route.type === "item" && route.href && !route.search?.hidden) {
      items.push({
        id: `${appSlug}:${route.href}`,
        label: route.label,
        href: route.href,
        icon: route.icon,
        category,
        keywords: route.search?.keywords ?? [],
      });
    }
    if (route.type === "group" && route.children) {
      items.push(...flattenRoutes(route.children, route.label, appSlug));
    }
  }
  return items;
}

export function CommandPaletteTrigger() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-muted-foreground w-full max-w-56 justify-between hidden lg:flex"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2">
          <Search className="size-3.5" />
          <span className="text-xs">{t("common.search") ?? "Search"}</span>
        </span>
        <Kbd className="text-[10px] h-5 px-1">
          <span className="text-xs">⌘</span>K
        </Kbd>
      </Button>
      <button
        className="lg:hidden p-2 text-muted-foreground transition-colors"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
      >
        <Search className="size-4" />
      </button>
      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  );
}

function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const paletteActions = usePaletteActions(t as (key: string) => string);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // Defer to ensure the dialog content (and input) is mounted.
      const id = requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  const tCast = t as (key: string) => string;

  const allItems = useMemo<{ label: string; items: FlatItem[] }[]>(() => {
    const groups: { label: string; items: FlatItem[] }[] = [];

    for (const app of apps.filter((a) => a.isActive)) {
      const routes = app.getRoutes(tCast);
      const appName = tCast(app.nameKey);
      const items = flattenRoutes(routes, appName, app.slug);
      if (items.length > 0) {
        groups.push({ label: appName, items });
      }
    }

    for (const group of paletteActions) {
      const items: FlatItem[] = group.items.map((action) => ({
        id: action.id,
        label: action.label,
        href: action.href,
        onSelect: action.onSelect,
        icon: action.icon,
        category: group.label,
        keywords: action.keywords ?? [],
      }));
      if (items.length > 0) {
        groups.push({ label: group.label, items });
      }
    }

    return groups;
  }, [paletteActions, tCast]);

  const handleSelect = useCallback(
    (item: FlatItem) => {
      onOpenChange(false);
      if (item.onSelect) {
        void item.onSelect();
      } else if (item.href) {
        router.push(item.href);
      }
    },
    [router, onOpenChange],
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      initialFocus={inputRef}
    >
      <Command className="rounded-lg">
        <CommandInput
          ref={inputRef}
          placeholder={t("common.search") ?? "Type a command or search..."}
        />
        <CommandList className="max-h-[60vh]">
          <CommandEmpty>
            {t("common.noResults") ?? "No results found."}
          </CommandEmpty>
          {allItems.map((group, idx) => (
            <React.Fragment key={group.label}>
              {idx > 0 && <CommandSeparator />}
              <CommandGroup heading={group.label}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.id}
                      value={`${item.label} ${item.keywords.join(" ")}`}
                      onSelect={() => handleSelect(item)}
                    >
                      {Icon && <Icon />}
                      <span className="flex-1 truncate">{item.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </React.Fragment>
          ))}
        </CommandList>
        <CommandSeparator />
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-xs">
          <div className="flex items-center gap-1.5">
            <Kbd className="h-5 px-1 text-[10px]">
              <span>esc</span>
            </Kbd>
            <span>to close</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex size-5 items-center justify-center rounded border">
              <Undo2Icon className="size-3" />
            </div>
            <span>to select</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex size-5 items-center justify-center rounded border">
              <ArrowUpIcon className="size-3" />
            </div>
            <div className="flex size-5 items-center justify-center rounded border">
              <ArrowDownIcon className="size-3" />
            </div>
            <span>to navigate</span>
          </div>
        </div>
      </Command>
    </CommandDialog>
  );
}
