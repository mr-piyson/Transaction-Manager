'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc/client';

function formatTimeAgo(date: Date, t: ReturnType<typeof useTranslations>) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t('notifications.justNow' as any);
  if (minutes < 60) return (t as any)('notifications.minutesAgo', { minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return (t as any)('notifications.hoursAgo', { hours });
  const days = Math.floor(hours / 24);
  return (t as any)('notifications.daysAgo', { days });
}

export function NotificationBell() {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const { data: unreadData } = trpc.notifications.getUnreadCount.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const { data, isLoading } = trpc.notifications.list.useQuery(
    { page: 1, limit: 10, status: 'UNREAD' },
    { enabled: open },
  );

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

  const unreadCount = unreadData?.count ?? 0;

  const handleNavigation = (entityType: string | null | undefined, entityId: string | null | undefined) => {
    if (!entityType || !entityId) return;
    const path = entityType === 'Invoice'
      ? `/erp/invoices/${entityId}`
      : entityType === 'PurchaseOrder'
        ? `/erp/purchase-orders/${entityId}`
        : null;
    if (path) {
      setOpen(false);
      router.push(path);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-9" aria-label={t('notifications.title')}>
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-semibold">{t('notifications.title')}</span>
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
                router.push('/notifications');
              }}
            >
              {t('notifications.viewAll')}
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[360px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : !data?.data.length ? (
            <div className="flex flex-col items-center justify-center h-24 text-sm text-muted-foreground">
              <Bell className="size-6 mb-1 opacity-50" />
              {t('notifications.noNotifications')}
            </div>
          ) : (
            <div className="divide-y">
              {data.data.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'flex items-start gap-2 px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted/50',
                    'bg-muted/20',
                  )}
                  onClick={() => {
                    markReadMutation.mutate({ id: notification.id });
                    handleNavigation(notification.entityType, notification.entityId);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{notification.title}</p>
                    {notification.body && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {notification.body}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                    {formatTimeAgo(notification.createdAt, t)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
