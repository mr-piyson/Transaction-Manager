"use client";

import { CalendarClock, Eye, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import type { ContextMenuItemSchema } from "@/components/context-menu";
import { UniversalContextMenu } from "@/components/context-menu";
import { useHardDeleteForm } from "@/components/dialogs/hardDeleteForm";
import { useSubscriptionForm } from "@/components/dialogs/subscriptionForm";
import { Header } from "@/components/layout/App-Header";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ListView } from "@/components/list-view";
import { SubscriptionListItem } from "@/components/subscriptions/subscription-list-item";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

const subscriptionsSegment = "subscriptions";

const statusFilters = [
  { label: "All", value: "" },
  { label: "Active", value: "ACTIVE" },
  { label: "Paused", value: "PAUSED" },
  { label: "Due soon", value: "dueSoon" },
];

export default function SubscriptionsLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  const t = useTranslations();
  const { openCreate } = useSubscriptionForm();
  const { openDialog: openHardDelete } = useHardDeleteForm();
  const { data: me } = trpc.auth.me.useQuery();
  const isSuperAdmin = me?.platformRole === "SUPER_ADMIN";
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeStatus = searchParams.get("status") ?? "";

  const { data, isPending } = trpc.subscriptions.list.useQuery({
    status:
      activeStatus && activeStatus !== "dueSoon"
        ? (activeStatus as any)
        : undefined,
    dueWithinDays: activeStatus === "dueSoon" ? 30 : undefined,
  });

  const isMobile = useIsMobile();
  const activeItem = pathname.split("/")[3];
  const isListView = pathname === `/erp/${subscriptionsSegment}`;

  const setStatusFilter = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("status", value);
    } else {
      params.delete("status");
    }
    router.push(`/erp/${subscriptionsSegment}?${params.toString()}`);
  };

  const renderCard = useCallback(
    (item: any) => {
      const menuItems: ContextMenuItemSchema[] = [
        {
          id: "view",
          label: t("common.viewDetails"),
          icon: Eye,
          onClick: () => router.push(`/erp/${subscriptionsSegment}/${item.id}`),
        },
        ...(isSuperAdmin
          ? [
              { id: "sep1", type: "separator" as const },
              {
                id: "hardDelete",
                label: t("hardDelete.menu"),
                icon: ShieldAlert,
                destructive: true,
                onClick: () =>
                  openHardDelete({
                    kind: "subscription" as any,
                    id: item.id,
                    title: item.name,
                  }),
              },
            ]
          : []),
      ];

      return (
        <UniversalContextMenu items={menuItems}>
          <Link
            href={`/erp/${subscriptionsSegment}/${item.id}`}
            scroll={false}
            draggable={false}
            className="block w-full h-full"
          >
            <SubscriptionListItem
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
    [activeItem, router, t, isSuperAdmin, openHardDelete],
  );

  const subscriptions = data ?? [];

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        title={t("subscriptions.title")}
        rightContent={<NotificationBell />}
        icon={<CalendarClock className="size-5" />}
      />
      <div className="flex-1 min-h-0 w-full">
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
                {/* Status filter chips */}
                <div className="flex gap-1.5 px-3 py-2 border-b overflow-x-auto shrink-0">
                  {statusFilters.map((f) => (
                    <Button
                      key={f.value}
                      variant={activeStatus === f.value ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs px-2.5 whitespace-nowrap"
                      onClick={() => setStatusFilter(f.value)}
                    >
                      {f.label}
                    </Button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto">
                  <ListView
                    data={subscriptions}
                    isLoading={isPending}
                    className="h-full"
                    search={{ fields: ["name", "vendor"] }}
                    toolbarStart={
                      <Button size="sm" onClick={() => openCreate()}>
                        {t("common.new")}
                      </Button>
                    }
                    rowHeight={80}
                    emptyTitle={t("subscriptions.noSubscriptions")}
                    emptyDescription={t("subscriptions.createSubscription")}
                    emptyIcon={
                      <CalendarClock className="size-20 text-muted-foreground" />
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
      </div>
    </div>
  );
}
