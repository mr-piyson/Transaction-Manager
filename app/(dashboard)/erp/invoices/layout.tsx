'use client';

import { useTranslations } from 'next-intl';
import { Edit, Eye, Receipt, Send, Trash2, User2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { alert } from '@/components/Alert-dialog';
import { UniversalContextMenu } from '@/components/context-menu';
import type { ContextMenuItemSchema } from '@/components/context-menu';
import { InvoiceListItem } from '@/components/invoices/invoice-list-item';
import { ListView } from '@/components/list-view';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useIsMobile } from '@/hooks/use-mobile';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import { useInvoiceForm } from '@/components/dialogs';
import { Header } from '@/components/layout/App-Header';

const invoicesSegment = 'invoices';

export default function InvoicesLayout({ children }: { children?: React.ReactNode }) {
  const t = useTranslations();
  const { openCreate, openEdit } = useInvoiceForm();

  const PAYMENT_STATUSES = [
    { value: 'all', label: t('common.all') },
    { value: 'PENDING', label: t('common.pending') },
    { value: 'PARTIAL', label: t('common.partial') },
    { value: 'PAID', label: t('common.paid') },
    { value: 'OVERDUE', label: t('common.overdue') },
  ] as const;
  const utils = trpc.useUtils();
  const router = useRouter();
  const [paymentStatus, setPaymentStatus] = useState('all');

  const deleteMutation = trpc.invoices.delete.useMutation({
    onSuccess: () => {
      utils.invoices.list.invalidate();
      toast.success(t('invoices.invoiceDeleted'));
      if (activeItem) router.push(`/erp/${invoicesSegment}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const { data, isPending } = trpc.invoices.list.useQuery({
    type: 'INVOICE',
    paymentStatus: paymentStatus === 'all' ? undefined : (paymentStatus as any),
  });
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const activeItem = pathname.split('/')[3];
  const isListView = pathname === `/erp/${invoicesSegment}`;
  const isPrintRoute = pathname.endsWith('/print');

  const renderCard = useCallback(
    (item: any) => {
      const isDeletable = ['DRAFT', 'CANCELLED', 'DELETED'].includes(item.status);
      const isCancellable = !['CANCELLED', 'DELETED', 'PAID'].includes(item.status);
      const isSending = item.status === 'DRAFT' || item.status === 'APPROVED';

      const menuItems: ContextMenuItemSchema[] = [
        {
          id: 'view',
          label: t('common.viewDetails'),
          icon: Eye,
          onClick: () => router.push(`/erp/${invoicesSegment}/${item.id}`),
        },
        {
          id: 'edit',
          label: t('common.edit'),
          icon: Edit,
          onClick: () =>
            openEdit(
              { id: item.id, type: item.type, lines: [] },
              { onSuccess: () => utils.invoices.byId.invalidate({ id: item.id }) },
            ),
          disabled: !['DRAFT', 'APPROVED'].includes(item.status),
        },
        ...(isSending
          ? [
              {
                id: 'send',
                label: t('common.send'),
                icon: Send,
                onClick: () => router.push(`/erp/${invoicesSegment}/${item.id}`),
              } as ContextMenuItemSchema,
            ]
          : []),
        ...(isCancellable
          ? [
              {
                id: 'cancel',
                label: t('common.cancel'),
                icon: XCircle,
                onClick: () => router.push(`/erp/${invoicesSegment}/${item.id}`),
              } as ContextMenuItemSchema,
            ]
          : []),
        { id: 'sep1', type: 'separator' as const },
        {
          id: 'delete',
          label: t('common.delete'),
          icon: Trash2,
          destructive: true,
          onClick: () =>
            alert.delete({
              title: t('common.confirmDelete', { serial: item.serial }),
              description: t('common.thisActionCannotBeUndone'),
              confirmText: t('common.delete'),
              onConfirm: async () => {
                await deleteMutation.mutateAsync({ id: item.id });
              },
            }),
          disabled: !isDeletable,
        },
      ];

      return (
        <UniversalContextMenu items={menuItems}>
          <Link
            href={`/erp/${invoicesSegment}/${item.id}`}
            scroll={false}
            draggable={false}
            className="block w-full h-full"
          >
            <InvoiceListItem
              data={item}
              className={cn(
                'hover:bg-muted/40 border border-transparent',
                activeItem === item.id ? 'border-primary border bg-primary/10' : '',
              )}
            />
          </Link>
        </UniversalContextMenu>
      );
    },
    [activeItem, openEdit, deleteMutation, utils, router],
  );

  if (isPrintRoute) return <>{children}</>;

  const invoices = Array.isArray(data) ? data : (data?.data ?? []);
  const activeLabel =
    PAYMENT_STATUSES.find((s) => s.value === paymentStatus)?.label ?? t('common.all');

  const filterBar = (
    <div className="flex flex-col gap-2 border-b px-4 py-2">
      <Select value={paymentStatus} onValueChange={setPaymentStatus}>
        <SelectTrigger className="w-full h-8 shrink-0">
          <SelectValue placeholder={t('common.payment')}>{activeLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {PAYMENT_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        title={t('layout.invoices')}
        icon={<Receipt className="size-5" />}
        onCreate={() => openCreate()}
        createLabel={t('invoices.newInvoice')}
      />
      <div className="flex-1 min-h-0 w-full">
        <ResizablePanelGroup className="h-full">
          {(isListView || !isMobile) && (
            <ResizablePanel
              minSize={20}
              defaultSize={30}
              className={cn('h-full', !isListView ? 'hidden md:block' : 'block')}
            >
              <aside className="flex h-full flex-col overflow-hidden border-r">
                {filterBar}
                <div className="flex-1 overflow-y-auto">
                  <ListView
                    data={invoices}
                    isLoading={isPending}
                    className="h-full"
                    useTheme
                    searchFields={['serial'] as any}
                    rowHeight={73}
                    emptyTitle={t('invoices.noInvoices')}
                    emptyDescription={t('invoices.createInvoice')}
                    emptyIcon={<User2 className="size-20 text-muted-foreground" />}
                    cardRenderer={renderCard}
                  />
                </div>
              </aside>
            </ResizablePanel>
          )}

          <ResizableHandle className={cn('hidden md:flex', !isListView && 'hidden md:flex')} />

          {(!isListView || !isMobile) && (
            <ResizablePanel
              defaultSize={70}
              className={cn('h-full w-full', isListView ? 'hidden md:block' : 'flex flex-col')}
            >
              {children}
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
