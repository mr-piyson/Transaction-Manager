"use client";

import { Bell, CheckCheck, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getNotificationEntityPath } from "@/lib/notification-entity-path";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

function formatTimeAgo(date: Date, t: ReturnType<typeof useTranslations>) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t("notifications.justNow" as any);
  if (minutes < 60) return (t as any)("notifications.minutesAgo", { minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return (t as any)("notifications.hoursAgo", { hours });
  const days = Math.floor(hours / 24);
  return (t as any)("notifications.daysAgo", { days });
}

export function NotificationBell() {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const { data: unreadData } = trpc.notifications.getUnreadCount.useQuery(
    undefined,
    {
      refetchInterval: 30000,
    },
  );

  const { data, isLoading } = trpc.notifications.list.useQuery(
    { status: "UNREAD" },
    { enabled: open },
  );
  const notifications = data ?? [];

  const utils = trpc.useUtils();

  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.getUnreadCount.invalidate();
    },
  });

  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.getUnreadCount.invalidate();
    },
  });

  const dismissMutation = trpc.notifications.dismiss.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.getUnreadCount.invalidate();
    },
  });

  const unreadCount = unreadData?.count ?? 0;

  const handleNavigation = (
    entityType: string | null | undefined,
    entityId: string | null | undefined,
  ) => {
    const path = getNotificationEntityPath(entityType, entityId);
    if (path) {
      setOpen(false);
      router.push(path);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative size-9"
            aria-label={t("notifications.title")}
          >
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-96 p-0" sideOffset={8}>
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-semibold">
            {t("notifications.title")}
          </span>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
              >
                <CheckCheck className="size-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => {
                setOpen(false);
                router.push("/notifications");
              }}
            >
              {t("notifications.viewAll")}
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[360px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : !notifications.length ? (
            <div className="flex flex-col items-center justify-center h-24 text-sm text-muted-foreground">
              <Bell className="size-6 mb-1 opacity-50" />
              {t("notifications.noNotifications")}
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const isUnread = notification.status === "UNREAD";

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "group relative flex items-start gap-2.5 px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted/60",
                      isUnread ? "bg-primary/5" : "bg-background",
                    )}
                    onClick={() => {
                      if (isUnread)
                        markReadMutation.mutate({ id: notification.id });
                      handleNavigation(
                        notification.entityType,
                        notification.entityId,
                      );
                    }}
                  >
                    {/* Unread indicator */}
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full transition-colors",
                        isUnread
                          ? "bg-primary"
                          : "bg-transparent group-hover:bg-muted-foreground/30",
                      )}
                    />

                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm truncate",
                          isUnread ? "font-semibold" : "font-medium",
                        )}
                      >
                        {notification.title}
                      </p>
                      {notification.body && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.body}
                        </p>
                      )}
                    </div>

                    {/* Time, swap to delete X on hover */}
                    <div className="shrink-0 pt-0.5">
                      <span className="text-[10px] text-muted-foreground group-hover:hidden">
                        {formatTimeAgo(notification.createdAt, t)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hidden group-hover:inline-flex size-6 -mt-0.5 text-muted-foreground hover:text-destructive"
                        aria-label={t("common.delete")}
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissMutation.mutate({ id: notification.id });
                        }}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
