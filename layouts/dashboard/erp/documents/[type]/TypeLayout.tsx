"use client";

import {
  ChevronDown,
  Edit,
  Eye,
  File,
  FileText,
  Receipt,
  ShieldAlert,
  Trash2,
  User2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { parseAsString, useQueryState } from "nuqs";
import { useCallback } from "react";
import { toast } from "sonner";
import { alert } from "@/components/Alert-dialog";
import type { ContextMenuItemSchema } from "@/components/context-menu";
import { UniversalContextMenu } from "@/components/context-menu";
import { useInvoiceForm } from "@/components/dialogs";
import { useHardDeleteForm } from "@/components/dialogs/hardDeleteForm";
import { AuthGuard } from "@/components/auth-guard";
import { DocumentFilterTrigger } from "@/components/erp/document-filter-bar";
import { InvoiceListItem } from "@/components/invoices/invoice-list-item";
import { Header } from "@/components/layout/App-Header";
import { ListView } from "@/components/list-view";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const DOCUMENT_CONFIG: Record<
  string,
  { icon: typeof Receipt; trpcType: "INVOICE" | "QUOTE" }
> = {
  invoices: { icon: Receipt, trpcType: "INVOICE" },
  quotations: { icon: FileText, trpcType: "QUOTE" },
};

export default function DocumentsLayout({
  children,
  documentType,
}: {
  children?: React.ReactNode;
  documentType: "invoices" | "quotations";
}) {
  const t = useTranslations();
  const type = documentType;
  const config = DOCUMENT_CONFIG[type];
  const { openCreate, openEdit } = useInvoiceForm();
  const { openDialog: openHardDelete } = useHardDeleteForm();
  const { formatDateForInput } = useDateFormat();
  const { data: me } = trpc.auth.me.useQuery();
  const isSuperAdmin = me?.platformRole === "SUPER_ADMIN";
  const ability = useAppAbility();
  const isMobile = useIsMobile();

  const [statusFilter] = useQueryState("status", parseAsString.withDefault(""));
  const [paymentStatusFilter] = useQueryState(
    "paymentStatus",
    parseAsString.withDefault("all"),
  );

  const { data, isPending } = trpc.invoices.list.useQuery({
    type: config.trpcType,
    status: (statusFilter || undefined) as any,
    paymentStatus:
      paymentStatusFilter === "all" ? undefined : (paymentStatusFilter as any),
  });

  const router = useRouter();
  const pathname = usePathname();
  const activeItem = pathname.split("/")[4];
  const isListRoute = pathname === `/erp/documents/${type}`;
  const isPrintRoute = pathname.endsWith("/print");

  const utils = trpc.useUtils();
  const deleteMutation = trpc.invoices.delete.useMutation({
    onSuccess: () => {
      utils.invoices.list.invalidate();
      toast.success(t("invoices.invoiceDeleted"));
      if (activeItem) router.push(`/erp/documents/${type}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const documents = (data ?? []).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const handleEditItem = async (item: any) => {
    try {
      const full = await utils.invoices.byId.fetch({ id: item.id });
      openEdit(
        {
          id: full.id,
          version: full.version ?? 0,
          type: full.type as any,
          date: full.date ? formatDateForInput(full.date) : undefined,
          dueDate: full.dueDate ? formatDateForInput(full.dueDate) : undefined,
          customerId: full.customerId ?? undefined,
          warehouseId: full.warehouseId ?? undefined,
          departmentId: full.departmentId ?? undefined,
          currency: full.currency as any,
          exchangeRate: Number(full.exchangeRate) || 1,
          description: full.description ?? undefined,
          notes: full.notes ?? undefined,
          termsText: full.termsText ?? undefined,
          internalNotes: full.internalNotes ?? undefined,
          isWalkIn: full.isWalkIn ?? false,
          parentInvoiceId: full.parentInvoiceId ?? undefined,
          lines: full.lines.map((l: any) => ({
            itemId: l.itemId ?? undefined,
            description: l.description ?? undefined,
            quantity: Number(l.quantity),
            unitPrice: Number(l.unitPrice),
            discountAmt: Number(l.discountAmt),
            purchasePrice: Number(l.purchasePrice ?? 0),
            taxRateId: l.taxRateId ?? undefined,
            taxRateSnapshot: Number(l.taxRateSnapshot ?? 0),
            taxRateName: l.taxRateName ?? undefined,
            sortOrder: l.sortOrder ?? 0,
            departmentId: l.departmentId ?? undefined,
          })),
        },
        { onSuccess: () => utils.invoices.list.invalidate() },
      );
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const renderCard = useCallback(
    (item: any) => {
      const isDeletable = ["DRAFT", "CANCELLED", "DELETED"].includes(
        item.status,
      );

      const canEdit = ability?.can("invoice:update", "Invoice");
      const canDelete = ability?.can("invoice:delete", "Invoice");

      const menuItems: ContextMenuItemSchema[] = [
        {
          id: "view",
          label: t("common.viewDetails"),
          icon: Eye,
          onClick: () => router.push(`/erp/documents/${type}/${item.id}`),
        },
        ...(canEdit
          ? [
              {
                id: "edit",
                label: t("common.edit"),
                icon: Edit,
                onClick: () => handleEditItem(item),
                disabled: item.status !== "DRAFT",
              },
            ]
          : []),
        ...(canDelete
          ? [
              { id: "sep1", type: "separator" as const },
              {
                id: "delete",
                label: t("common.delete"),
                icon: Trash2,
                onClick: () =>
                  alert.delete({
                    title: t("common.confirmDeleteTitle"),
                    description: "This action cannot be undone.",
                    confirmText: t("common.delete"),
                    onConfirm: async () => {
                      await deleteMutation.mutateAsync({ id: item.id });
                    },
                  }),
                disabled: !isDeletable,
              },
            ]
          : []),
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
                    kind: "invoice",
                    id: item.id,
                    title: item.serial,
                  }),
              },
            ]
          : []),
      ];

      return (
        <UniversalContextMenu items={menuItems}>
          <Link
            href={`/erp/documents/${type}/${item.id}`}
            scroll={false}
            draggable={false}
            className="block w-full h-full"
          >
            <InvoiceListItem
              data={item}
              className={cn(
                "hover:bg-muted/40 border border-transparent",
                activeItem === item.id ? "border-primary bg-primary/10" : "",
              )}
            />
          </Link>
        </UniversalContextMenu>
      );
    },
    [
      activeItem,
      type,
      ability,
      deleteMutation,
      router,
      isSuperAdmin,
      openHardDelete,
      handleEditItem,
      t,
    ],
  );

  const Icon = config.icon;
  const headerTitle =
    type === "invoices" ? t("layout.invoices") : t("layout.quotations");
  const createDocument = (documentType = config.trpcType) =>
    openCreate({ defaults: { type: documentType } });

  return (
    <AuthGuard permission="invoice:read" subject="Invoice">
      <div
        className={cn(
          "flex h-screen flex-col overflow-hidden",
          isPrintRoute && "print-layout",
        )}
      >
        {!isPrintRoute && (
          <Header title={headerTitle} icon={<Icon className="size-5" />} />
        )}
        <div
          className={cn("flex-1 min-h-0 w-full", isPrintRoute && "overflow-auto")}
        >
          {isPrintRoute ? (
            children
          ) : (
            <ResizablePanelGroup className="h-full">
              {(isListRoute || !isMobile) && (
                <ResizablePanel
                  minSize={20}
                  defaultSize={30}
                  className={cn(
                    "h-full",
                    !isListRoute ? "hidden md:block" : "block",
                  )}
                >
                  <aside className="flex h-full flex-col overflow-hidden border-r">
                    <div className="flex-1 overflow-y-auto">
                      <ListView
                        data={documents}
                        isLoading={isPending}
                        className="h-full"
                        search={{
                          collapsible: true,
                          fields: [
                            {
                              key: "serial",
                              label: t("common.serial"),
                              getValue: (item) => item.serial,
                            },
                            {
                              key: "customer",
                              label: t("common.customer"),
                              getValue: (item) => item.customer?.name,
                            },
                            {
                              key: "status",
                              label: t("common.status"),
                              getValue: (item) => item.status,
                            },
                          ],
                        }}
                        rowHeight={72}
                        emptyTitle={t("invoices.noInvoices")}
                        emptyDescription={t("invoices.selectDescription")}
                        emptyIcon={
                          <File className="size-20 text-muted-foreground" />
                        }
                        cardRenderer={renderCard}
                        toolbarEnd={
                          <DocumentFilterTrigger
                            type={type as "invoices" | "quotations"}
                          />
                        }
                        toolbarStart={
                          <ButtonGroup>
                            <Button size="sm" onClick={() => createDocument()}>
                              {t("common.new")}
                            </Button>
                          </ButtonGroup>
                        }
                      />
                    </div>
                  </aside>
                </ResizablePanel>
              )}

              <ResizableHandle
                className={cn("hidden md:flex", !isListRoute && "hidden md:flex")}
              />

              {(!isListRoute || !isMobile) && (
                <ResizablePanel
                  defaultSize={70}
                  className={cn(
                    "h-full w-full",
                    isListRoute ? "hidden md:block" : "flex flex-col",
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
