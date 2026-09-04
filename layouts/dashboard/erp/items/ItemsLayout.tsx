"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Download,
  Edit,
  Eye,
  Filter,
  Package,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { alert } from "@/components/Alert-dialog";
import { useUnifiedItemForm } from "@/components/dialogs";
import { useHardDeleteForm } from "@/components/dialogs/hardDeleteForm";
import { ItemDetailsSheet } from "@/components/items/item-details-sheet";
import {
  DEFAULT_ITEM_FILTERS,
  ItemFilterSheet,
  type ItemFilterValues,
  UNCATEGORIZED_CATEGORY_ID,
} from "@/components/items/item-filter-sheet";
import { ItemListItem } from "@/components/items/item-list-item";
import { AuthGuard } from "@/components/auth-guard";
import { Header } from "@/components/layout/App-Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

const title = "Items";

export default function ItemsLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  const t = useTranslations();
  const { openCreate, openEdit } = useUnifiedItemForm();
  const { openDialog: openHardDelete } = useHardDeleteForm();
  const { data: me } = trpc.auth.me.useQuery();
  const isSuperAdmin = me?.platformRole === "SUPER_ADMIN";

  const [itemFilters, setItemFilters] =
    useState<ItemFilterValues>(DEFAULT_ITEM_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrollReady, setScrollReady] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: categoryList } = trpc.categories.list.useQuery();
  const { data, isPending } = trpc.items.list.useQuery({
    search: searchQuery.trim() || undefined,
    type: itemFilters.type || undefined,
    categoryId:
      itemFilters.categoryId === UNCATEGORIZED_CATEGORY_ID
        ? null
        : (itemFilters.categoryId ?? undefined),
    isActive:
      itemFilters.isActive === "all"
        ? undefined
        : itemFilters.isActive === "active",
    isSaleable: itemFilters.isSaleable ? true : undefined,
    lowStock: itemFilters.lowStock ? true : undefined,
    withStock: true,
  });
  const pathname = usePathname();
  const isListRoute = pathname === `/erp/${title.toLowerCase()}`;

  const utils = trpc.useUtils();
  const deleteMutation = trpc.items.delete.useMutation({
    onSuccess: () => {
      utils.items.list.invalidate();
      toast.success(t("common.itemDeleted"));
      setSelectedItemId(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const items = data ?? [];
  const activeFilterCount = [
    itemFilters.type,
    itemFilters.categoryId,
    itemFilters.isActive !== "all" ? itemFilters.isActive : null,
    itemFilters.isSaleable,
    itemFilters.lowStock,
  ].filter(Boolean).length;

  const setScrollRef = useCallback((node: HTMLDivElement | null) => {
    scrollRef.current = node;
    setScrollReady(Boolean(node));
  }, []);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  useEffect(() => {
    if (scrollReady && items.length > 0) {
      virtualizer.scrollToIndex(0);
    }
  }, [scrollReady, items.length, virtualizer]);

  return (
    <AuthGuard permission="item:read" subject="Item">
      <div className="flex h-screen flex-col overflow-hidden">
        <Header title={t("layout.items")} icon={<Package className="size-5" />} />
        <div className="flex-1 min-h-0 w-full">
          {isListRoute ? (
            <div className="h-full w-full flex flex-col">
              <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto border-b px-4 py-2 shrink-0">
                <div className="flex min-w-max flex-1 flex-nowrap items-center gap-2">
                  <Button size="sm" onClick={() => openCreate()}>
                    <Plus className="size-3.5" />
                    <span className="hidden sm:inline">
                      {t("items.createItem")}
                    </span>
                  </Button>
                  <InputGroup className="w-52 shrink-0 sm:w-64">
                    <InputGroupAddon align="inline-start">
                      <Search className="size-3.5" />
                    </InputGroupAddon>
                    <InputGroupInput
                      placeholder="Search items..."
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                    />
                    {searchQuery && (
                      <InputGroupAddon align="inline-end">
                        <button
                          type="button"
                          aria-label="Clear search"
                          onClick={() => setSearchQuery("")}
                          className="flex size-5 items-center justify-center rounded hover:bg-muted"
                        >
                          <X className="size-3 text-muted-foreground" />
                        </button>
                      </InputGroupAddon>
                    )}
                  </InputGroup>
                  <Button
                    variant={activeFilterCount > 0 ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setIsFilterOpen(true)}
                  >
                    <Filter className="size-3.5" />
                    <span className="hidden sm:inline">Filters</span>
                    {activeFilterCount > 0 && <Badge>{activeFilterCount}</Badge>}
                  </Button>
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <Link href="/erp/items/import">
                    <Button variant="outline" size="sm">
                      <Download className="size-3.5" />
                      <span className="hidden md:block">Import</span>
                    </Button>
                  </Link>
                </div>
              </div>
              {/* Category filter bar */}
              <div className="w-full min-w-0 border-b px-4 py-1.5 shrink-0 overflow-hidden">
                <div className="flex items-center gap-2 overflow-x-auto w-full pb-1">
                  <Filter className="size-3.5 text-muted-foreground shrink-0" />
                  <button
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      itemFilters.categoryId === null
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                    onClick={() =>
                      setItemFilters((current) => ({
                        ...current,
                        categoryId: null,
                      }))
                    }
                  >
                    {t("common.all")}
                  </button>
                  <button
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      itemFilters.categoryId === UNCATEGORIZED_CATEGORY_ID
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                    onClick={() =>
                      setItemFilters((current) => ({
                        ...current,
                        categoryId:
                          current.categoryId === UNCATEGORIZED_CATEGORY_ID
                            ? null
                            : UNCATEGORIZED_CATEGORY_ID,
                      }))
                    }
                  >
                    {t("common.other")}
                  </button>
                  {categoryList?.map((cat) => (
                    <button
                      key={cat.id}
                      className={cn(
                        "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5",
                        itemFilters.categoryId === cat.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80",
                      )}
                      onClick={() =>
                        setItemFilters((current) => ({
                          ...current,
                          categoryId:
                            current.categoryId === cat.id ? null : cat.id,
                        }))
                      }
                    >
                      {cat.color && (
                        <span
                          className="size-2 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                      )}
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
              <div ref={setScrollRef} className="min-h-0 flex-1 overflow-y-auto">
                <div
                  className="relative w-full"
                  style={{ height: `${virtualizer.getTotalSize()}px` }}
                >
                  {virtualizer.getVirtualItems().map((virtualItem) => {
                    const item = items[virtualItem.index];
                    return (
                      <div
                        key={item.id}
                        data-index={virtualItem.index}
                        ref={virtualizer.measureElement}
                        className="absolute left-0 w-full"
                        style={{
                          transform: `translateY(${virtualItem.start}px)`,
                        }}
                      >
                        <ContextMenu>
                          <ContextMenuTrigger asChild>
                            <button
                              type="button"
                              onClick={() => setSelectedItemId(item.id)}
                              className="block h-full w-full text-left"
                            >
                              <ItemListItem
                                data={item}
                                className={cn(
                                  "hover:bg-muted/40 border border-transparent",
                                  selectedItemId === item.id
                                    ? "border-primary bg-primary/10"
                                    : "",
                                )}
                              />
                            </button>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem
                              onClick={() => setSelectedItemId(item.id)}
                            >
                              <Eye className="size-4 mr-2" />
                              {t("common.viewDetails")}
                            </ContextMenuItem>
                            <ContextMenuItem
                              onClick={() =>
                                openEdit({
                                  itemId: item.id,
                                  onSuccess: () => utils.items.list.invalidate(),
                                })
                              }
                            >
                              <Edit className="size-4 mr-2" />
                              {t("common.edit")}
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem
                              onClick={() =>
                                alert.delete({
                                  title: t("common.confirmDeleteTitle"),
                                  description: "This action cannot be undone.",
                                  confirmText: t("common.delete"),
                                  onConfirm: async () => {
                                    await deleteMutation.mutateAsync({
                                      id: item.id,
                                    });
                                  },
                                })
                              }
                              variant="destructive"
                            >
                              <Trash2 className="size-4 mr-2" />
                              {t("common.delete")}
                            </ContextMenuItem>
                            {isSuperAdmin && (
                              <>
                                <ContextMenuSeparator />
                                <ContextMenuItem
                                  onClick={() =>
                                    openHardDelete({
                                      kind: "item",
                                      id: item.id,
                                      title: item.sku ?? item.name,
                                    })
                                  }
                                  variant="destructive"
                                >
                                  <ShieldAlert className="size-4 mr-2" />
                                  {t("hardDelete.menu")}
                                </ContextMenuItem>
                              </>
                            )}
                          </ContextMenuContent>
                        </ContextMenu>
                      </div>
                    );
                  })}
                </div>
                {isPending && (
                  <div className="p-4 text-center text-muted-foreground">
                    Loading...
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full w-full overflow-y-auto">{children}</div>
          )}
        </div>
        <ItemDetailsSheet
          itemId={selectedItemId}
          onOpenChange={(open) => {
            if (!open) setSelectedItemId(null);
          }}
        />
        <ItemFilterSheet
          open={isFilterOpen}
          filters={itemFilters}
          categories={categoryList ?? []}
          onOpenChange={setIsFilterOpen}
          onApply={setItemFilters}
        />
      </div>
    </AuthGuard>
  );
}
