"use client";

import { ShoppingCart, User2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { toast } from "sonner";
import { alert } from "@/components/Alert-dialog";
import { AuthGuard } from "@/components/auth-guard";
import { UniversalContextMenu } from "@/components/context-menu";
import { usePOForm } from "@/components/dialogs";
import { useHardDeleteForm } from "@/components/dialogs/hardDeleteForm";
import { Header } from "@/components/layout/App-Header";
import { ListView } from "@/components/list-view";
import { buildPOActions } from "@/components/purchase-orders/po-actions";
import { POListItem } from "@/components/purchase-orders/po-list-item";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useAppAbility } from "@/hooks/use-app-ability";
import { useDateFormat } from "@/hooks/use-date-format";
import { useIsMobile } from "@/hooks/use-mobile";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

const route = "purchase-orders";

export default function POLayout({ children }: { children?: React.ReactNode }) {
  const t = useTranslations();
  const { openCreate, openEdit } = usePOForm();
  const { openDialog: openHardDelete } = useHardDeleteForm();
  const { data: me } = trpc.auth.me.useQuery();
  const isSuperAdmin = me?.platformRole === "SUPER_ADMIN";
  const utils = trpc.useUtils();
  const router = useRouter();
  const { data, isPending } = trpc.purchaseOrders.list.useQuery({});
  const isMobile = useIsMobile();
  const ability = useAppAbility();
  const pathname = usePathname();
  const activeItem = pathname.split("/")[3];
  const isListView = pathname === `/erp/${route}`;
  const isPrintPage = pathname.endsWith("/print");

  const deleteMutation = trpc.purchaseOrders.delete.useMutation({
    onSuccess: () => {
      utils.purchaseOrders.list.invalidate();
      toast.success(t("purchaseOrders.poDeleted"));
      if (activeItem) router.push("/erp/purchase-orders");
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelMutation = trpc.purchaseOrders.cancel.useMutation({
    onSuccess: () => {
      utils.purchaseOrders.list.invalidate();
      toast.success(t("purchaseOrders.poCancelled"));
      if (activeItem) router.push("/erp/purchase-orders");
    },
    onError: (e) => toast.error(e.message),
  });

  const { formatDateForInput } = useDateFormat();

  // The list query omits the editable fields (lines, notes, ids), so edit
  // needs the full record before the dialog can be pre-filled.
  const handleEdit = useCallback(
    async (item: any) => {
      const po = await utils.purchaseOrders.byId.fetch({ id: item.id });
      openEdit(
        {
          id: po.id,
          version: po.version ?? 0,
          supplierId: po.supplierId,
          warehouseId: po.warehouseId,
          date: po.date ? formatDateForInput(po.date) : undefined,
          currency: po.currency as any,
          notes: po.notes ?? undefined,
          internalNotes: po.internalNotes ?? undefined,
          lines: po.lines.map((l: any) => ({
            mode: l.itemId ? "item" : "manual",
            itemId: l.itemId ?? undefined,
            description: l.description ?? undefined,
            quantity: Number(l.quantity),
            unitCost: Number(l.unitCost),
            taxRateId: l.taxRateId ?? undefined,
            taxRateSnapshot:
              l.taxRateSnapshot != null ? Number(l.taxRateSnapshot) : undefined,
            taxRateName: l.taxRateName ?? undefined,
          })),
        },
        {
          onSuccess: () =>
            utils.purchaseOrders.byId.invalidate({ id: item.id }),
        },
      );
    },
    [openEdit, utils, formatDateForInput],
  );

  const renderCard = useCallback(
    (item: any) => {
      const menuItems = buildPOActions({
        po: { id: item.id, serial: item.serial, status: item.status },
        t,
        ability,
        isSuperAdmin,
        handlers: {
          edit: () => handleEdit(item),
          submit: () => router.push(`/erp/${route}/${item.id}`),
          approve: () => router.push(`/erp/${route}/${item.id}`),
          reject: () => router.push(`/erp/${route}/${item.id}`),
          order: () => router.push(`/erp/${route}/${item.id}`),
          receive: () => router.push(`/erp/${route}/${item.id}`),
          cancel: () =>
            alert.delete({
              title: t("common.cancel"),
              description: t("common.thisActionCannotBeUndone"),
              confirmText: t("common.cancel"),
              onConfirm: async () => {
                await cancelMutation.mutateAsync({
                  id: item.id,
                  version: item.version,
                });
              },
            }),
          delete: () =>
            alert.delete({
              title: t("common.delete"),
              description: t("common.thisActionCannotBeUndone"),
              confirmText: t("common.delete"),
              onConfirm: async () => {
                await deleteMutation.mutateAsync({ id: item.id });
              },
            }),
          print: () => router.push(`/erp/${route}/${item.id}/print`),
          recordExpense: () => router.push(`/erp/${route}/${item.id}`),
          hardDelete: () =>
            openHardDelete({
              kind: "po",
              id: item.id,
              title: item.serial,
            }),
        },
      });

      return (
        <UniversalContextMenu items={menuItems}>
          <Link
            href={`/erp/${route}/${item.id}`}
            scroll={false}
            draggable={false}
            className="block w-full h-full"
          >
            <POListItem
              data={item}
              className={cn(
                "hover:bg-muted/40 border border-transparent",
                activeItem === item.id
                  ? "border-primary border bg-primary/10"
                  : "",
              )}
            />
          </Link>
        </UniversalContextMenu>
      );
    },
    [
      activeItem,
      ability,
      cancelMutation,
      deleteMutation,
      handleEdit,
      openEdit,
      router,
      utils,
      isSuperAdmin,
      openHardDelete,
      t,
    ],
  );

  const orders = (data ?? []).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <AuthGuard permission="po:read" subject="PurchaseOrder">
      <div
        className={cn(
          "flex h-screen flex-col overflow-hidden",
          isPrintPage && "print-layout",
        )}
      >
        {!isPrintPage && (
          <Header
            title={t("layout.purchaseOrders")}
            icon={<ShoppingCart className="size-5" />}
          />
        )}
        <div
          className={cn("flex-1 min-h-0 w-full", isPrintPage && "overflow-auto")}
        >
          {isPrintPage ? (
            children
          ) : (
            <ResizablePanelGroup className="h-full">
              {(isListView || !isMobile) && (
                <ResizablePanel
                  minSize={20}
                  defaultSize={30}
                  className={cn(
                    "h-full",
                    !isListView ? "hidden md:block" : "block",
                  )}
                >
                  <aside className="flex h-full flex-col overflow-hidden border-r">
                    <div className="flex-1 overflow-y-auto">
                      <ListView
                        data={orders}
                        isLoading={isPending}
                        className="h-full"
                        search={{
                          fields: [
                            {
                              key: "serial",
                              label: t("purchaseOrders.poNumber"),
                              getValue: (item) => item.serial,
                            },
                            {
                              key: "supplier",
                              label: t("purchaseOrders.supplier"),
                              getValue: (item) => item.supplier?.name,
                            },
                            {
                              key: "status",
                              label: t("purchaseOrders.status"),
                              getValue: (item) => item.status,
                            },
                          ],
                        }}
                        toolbarStart={
                          <Button size="sm" onClick={() => openCreate()}>
                            {t("common.new")}
                          </Button>
                        }
                        rowHeight={73}
                        emptyTitle={t("purchaseOrders.noPOs")}
                        emptyDescription={t("purchaseOrders.createPO")}
                        emptyIcon={
                          <User2 className="size-20 text-muted-foreground" />
                        }
                        cardRenderer={renderCard}
                      />
                    </div>
                  </aside>
                </ResizablePanel>
              )}

              <ResizableHandle
                className={cn("hidden md:flex", !isListView && "hidden md:flex")}
              />

              {(!isListView || !isMobile) && (
                <ResizablePanel
                  defaultSize={70}
                  className={cn(
                    "h-full w-full",
                    isListView ? "hidden md:block" : "flex flex-col",
                  )}
                >
                  {children}
                </ResizablePanel>
              )}
            </ResizablePanelGroup>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
