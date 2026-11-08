"use client";

import {
  Download,
  Edit,
  Eye,
  Filter,
  Package,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type * as React from "react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { alert } from "@/components/Alert-dialog";
import { AuthGuard } from "@/components/auth-guard";
import type { ContextMenuItemSchema } from "@/components/context-menu";
import { UniversalContextMenu } from "@/components/context-menu";
import { useUnifiedItemForm } from "@/components/dialogs";
import { useHardDeleteForm } from "@/components/dialogs/hardDeleteForm";
import { Header } from "@/components/layout/App-Header";
import { ListView } from "@/components/list-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  DEFAULT_ITEM_FILTERS,
  ItemFilterSheet,
  type ItemFilterValues,
  UNCATEGORIZED_CATEGORY_ID,
} from "./item-filter-sheet";
import { ItemListItem } from "./item-list-item";

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

  const { data: categoryList } = trpc.categories.list.useQuery();
  const { data, isPending } = trpc.items.list.useQuery({
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

  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const isListView = pathname === "/erp/items";
  const isImportRoute = pathname.startsWith("/erp/items/import");
  const isDetailRoute = !isListView && !isImportRoute;
  const activeItemId = isDetailRoute ? (pathname.split("/")[3] ?? null) : null;

  const utils = trpc.useUtils();
  const deleteMutation = trpc.items.delete.useMutation({
    onSuccess: () => {
      utils.items.list.invalidate();
      toast.success(t("common.itemDeleted"));
      if (activeItemId) router.push("/erp/items");
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

  const listSearch = useMemo(
    () => ({
      collapsible: true,
      placeholder: t("items.searchItems"),
      // A single combined field keeps the collapsible search usable even when
      // the list panel is dragged narrow (a multi-field selector would eat the
      // whole input).
      fields: [
        {
          key: "all",
          label: t("common.search"),
          getValue: (item: any) =>
            [item.name, item.sku, item.barcode, item.category?.name]
              .filter(Boolean)
              .join(" "),
        },
      ],
    }),
    [t],
  );

  const renderCard = useCallback(
    (item: any) => {
      const menuItems: ContextMenuItemSchema[] = [
        {
          id: "view",
          label: t("common.viewDetails"),
          icon: Eye,
          onClick: () => router.push(`/erp/items/${item.id}`),
        },
        {
          id: "edit",
          label: t("common.edit"),
          icon: Edit,
          onClick: () =>
            openEdit({
              itemId: item.id,
              onSuccess: () => {
                utils.items.list.invalidate();
                utils.items.byId.invalidate({ id: item.id });
              },
            }),
        },
        { id: "sep1", type: "separator" as const },
        {
          id: "delete",
          label: t("common.delete"),
          icon: Trash2,
          destructive: true,
          disabled: deleteMutation.isPending,
          onClick: () =>
            alert.delete({
              title: t("common.confirmDeleteTitle"),
              description: "This action cannot be undone.",
              confirmText: t("common.delete"),
              onConfirm: async () => {
                await deleteMutation.mutateAsync({ id: item.id });
              },
            }),
        },
        ...(isSuperAdmin
          ? [
              { id: "sep2", type: "separator" as const },
              {
                id: "hardDelete",
                label: t("hardDelete.menu"),
                icon: ShieldAlert,
                destructive: true,
                onClick: () =>
                  openHardDelete({
                    kind: "item",
                    id: item.id,
                    title: item.sku ?? item.name,
                  }),
              },
            ]
          : []),
      ];

      return (
        <UniversalContextMenu items={menuItems}>
          <Link
            href={`/erp/items/${item.id}`}
            scroll={false}
            draggable={false}
            className="block h-full w-full"
          >
            <ItemListItem
              data={item}
              className={cn(
                "hover:bg-muted/40 border border-transparent",
                activeItemId === item.id ? "border-primary bg-primary/10" : "",
              )}
            />
          </Link>
        </UniversalContextMenu>
      );
    },
    [
      activeItemId,
      openEdit,
      deleteMutation,
      utils,
      router,
      isSuperAdmin,
      openHardDelete,
      t,
    ],
  );

  return (
    <AuthGuard permission="item:read" subject="Item">
      <div className="flex h-screen flex-col overflow-hidden">
        <Header
          title={t("layout.items")}
          icon={<Package className="size-5" />}
        />
        <div className="flex-1 min-h-0 w-full">
          {isImportRoute ? (
            <div className="h-full w-full overflow-y-auto">{children}</div>
          ) : (
            <ResizablePanelGroup
              defaultLayout={{ list: 50, detail: 50 }}
              className="h-full"
            >
              {(isListView || !isMobile) && (
                <ResizablePanel
                  id="list"
                  minSize={240}
                  className="h-full min-w-0"
                >
                  <ListView
                    data={items}
                    isLoading={isPending}
                    className="h-full"
                    search={listSearch}
                    rowHeight={72}
                    emptyTitle={t("items.noItems")}
                    emptyDescription={t("items.selectDescription")}
                    emptyIcon={
                      <Package className="size-20 text-muted-foreground" />
                    }
                    cardRenderer={renderCard}
                    toolbarStart={
                      <Button
                        size="sm"
                        className="h-8"
                        onClick={() =>
                          openCreate({
                            onSuccess: () => utils.items.list.invalidate(),
                          })
                        }
                      >
                        {t("common.new")}
                      </Button>
                    }
                    toolbarEnd={
                      <div className="flex shrink-0 items-center gap-1">
                        <Link href="/erp/items/import">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 shrink-0"
                            aria-label={t("items.import.title")}
                            title={t("items.import.title")}
                          >
                            <Download className="size-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="relative h-8 shrink-0"
                          aria-label={
                            activeFilterCount > 0
                              ? `${t("common.filter")} (${activeFilterCount})`
                              : t("common.filter")
                          }
                          title={t("common.filter")}
                          onClick={() => setIsFilterOpen(true)}
                        >
                          <Filter className="size-3.5" />
                          {activeFilterCount > 0 && (
                            <Badge
                              variant="destructive"
                              className="absolute -top-1.5 -right-1.5 h-4 min-w-4 rounded-full px-1 text-[10px]"
                            >
                              {activeFilterCount}
                            </Badge>
                          )}
                        </Button>
                      </div>
                    }
                  />
                </ResizablePanel>
              )}
              {isDetailRoute && (
                <>
                  {!isMobile && <ResizableHandle className="hidden md:flex" />}
                  <ResizablePanel
                    id="detail"
                    minSize={280}
                    className="h-full w-full min-w-0"
                  >
                    {children}
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          )}
        </div>
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
