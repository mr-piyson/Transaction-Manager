'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  Archive,
  Bell,
  BellDot,
  CheckCheck,
  ExternalLink,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/App-Header';
import { trpc } from '@/lib/trpc/client';
import { Empty } from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

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

const STATUS_ICONS: Record<string, typeof Bell> = {
  approval_request: BellDot,
  invoice_approved: CheckCheck,
  invoice_rejected: Archive,
};

export default function NotificationsPage() {
  const t = useTranslations();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const limit = 25;

  const { data, isLoading } = trpc.notifications.list.useQuery({
    page,
    limit,
    status: statusFilter === 'all' ? undefined : (statusFilter as any) || undefined,
    search: search || undefined,
  });

  const utils = trpc.useUtils();

  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.getUnreadCount.invalidate();
    },
  });

  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      toast.success(t('common.success'));
      utils.notifications.list.invalidate();
      utils.notifications.getUnreadCount.invalidate();
    },
  });

  const archiveMutation = trpc.notifications.archive.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
    },
  });

  const dismissMutation = trpc.notifications.dismiss.useMutation({
    onSuccess: () => {
      toast.success(t('notifications.dismissed'));
      utils.notifications.list.invalidate();
      utils.notifications.getUnreadCount.invalidate();
    },
  });

  const isPending =
    markReadMutation.isPending || markAllReadMutation.isPending || archiveMutation.isPending || dismissMutation.isPending;

  const handleNavigate = (notification: { entityType?: string | null; entityId?: string | null }) => {
    if (notification.entityType && notification.entityId) {
      const path = notification.entityType === 'Invoice'
        ? `/erp/invoices/${notification.entityId}`
        : notification.entityType === 'PurchaseOrder'
          ? `/erp/purchase-orders/${notification.entityId}`
          : null;
      if (path) router.push(path);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title={t('notifications.title')} icon={<Bell className="size-5" />}>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={isPending}
          >
            <CheckCheck className="size-4 mr-1" />
            {t('notifications.markAllRead')}
          </Button>
        </div>
      </Header>

      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <Input
          placeholder={t('common.search')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs h-9"
        />
        <Select
          value={statusFilter || 'all'}
          onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}
        >
          <SelectTrigger className="w-32 h-9">
            <SelectValue placeholder={t('common.filter')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('notifications.all')}</SelectItem>
            <SelectItem value="UNREAD">{t('notifications.unread')}</SelectItem>
            <SelectItem value="READ">{t('common.read')}</SelectItem>
            <SelectItem value="ARCHIVED">{t('notifications.archived')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.data.length ? (
          <div className="flex items-center justify-center h-full">
            <Empty>
              <Bell className="size-8 text-muted-foreground" />
              <p className="text-lg font-medium mt-2">{t('notifications.noNotifications')}</p>
              <p className="text-sm text-muted-foreground">{t('notifications.noNotificationsDesc')}</p>
            </Empty>
          </div>
        ) : (
          <div className="divide-y">
            {data.data.map((notification) => {
              const Icon = STATUS_ICONS[notification.type] || Bell;
              const isUnread = notification.status === 'UNREAD';

              return (
                <div
                  key={notification.id}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 cursor-pointer',
                    isUnread && 'bg-muted/30',
                  )}
                  onClick={() => {
                    if (isUnread) markReadMutation.mutate({ id: notification.id });
                    handleNavigate(notification);
                  }}
                >
                  <div className={cn(
                    'mt-1 flex size-8 shrink-0 items-center justify-center rounded-full',
                    isUnread ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                  )}>
                    <Icon className="size-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={cn(
                          'text-sm',
                          isUnread ? 'font-semibold' : 'font-medium',
                        )}>
                          {notification.title}
                        </p>
                        {notification.body && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.body}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                        {formatTimeAgo(notification.createdAt, t)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      {isUnread && (
                        <span className="text-[10px] font-medium text-primary uppercase">
                          {t('notifications.new')}
                        </span>
                      )}
                      {notification.entityType && notification.entityId && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <ExternalLink className="size-3" />
                          {t('common.viewDetails')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isUnread && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          markReadMutation.mutate({ id: notification.id });
                        }}
                      >
                        <CheckCheck className="size-3.5" />
                      </Button>
                    )}
                    {notification.status !== 'ARCHIVED' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          archiveMutation.mutate({ id: notification.id });
                        }}
                      >
                        <Archive className="size-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissMutation.mutate({ id: notification.id });
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {data?.meta && data.meta.totalPages > 1 && (
        <div className="border-t px-4 py-2">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  isActive={page > 1}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="text-sm text-muted-foreground px-4">
                  {t('common.page')} {page} {t('common.of')} {data.meta.totalPages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
                  isActive={page < data.meta.totalPages}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
