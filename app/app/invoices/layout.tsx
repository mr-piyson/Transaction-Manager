'use client';

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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import { useInvoiceForm } from '@/components/dialogs';
import { Header } from '../App-Header';

const title = 'Invoices';

const DOCUMENT_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'INVOICE', label: 'Invoice' },
  { value: 'QUOTE', label: 'Quote' },
  { value: 'CREDIT_NOTE', label: 'Credit Note' },
  { value: 'DELIVERY_NOTE', label: 'Delivery Note' },
] as const;

const PAYMENT_STATUSES = [
  { value: 'all', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'PAID', label: 'Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
] as const;

export default function InvoicesLayout({ children }: { children?: React.ReactNode }) {
  const { openCreate, openEdit } = useInvoiceForm();
  const utils = trpc.useUtils();
  const router = useRouter();
  const [docType, setDocType] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');

  const deleteMutation = trpc.invoices.delete.useMutation({
    onSuccess: () => {
      utils.invoices.list.invalidate();
      toast.success('Invoice deleted');
      if (activeItem) router.push('/app/invoices');
    },
    onError: (e) => toast.error(e.message),
  });

  const { data, isPending } = trpc.invoices.list.useQuery({
    type: docType === 'all' ? undefined : (docType as any),
    paymentStatus: paymentStatus === 'all' ? undefined : (paymentStatus as any),
  });
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const activeItem = pathname.split('/')[3];
  const isListView = pathname === `/app/${title.toLowerCase()}`;
  const isPrintRoute = pathname.endsWith('/print');

  const renderCard = useCallback(
    (item: any) => {
      const isDeletable = ['DRAFT', 'CANCELLED', 'DELETED'].includes(item.status);
      const isCancellable = !['CANCELLED', 'DELETED', 'PAID'].includes(item.status);
      const isSending = item.status === 'DRAFT' || item.status === 'APPROVED';

      const menuItems: ContextMenuItemSchema[] = [
        {
          id: 'view',
          label: 'View details',
          icon: Eye,
          onClick: () => router.push(`/app/invoices/${item.id}`),
        },
        {
          id: 'edit',
          label: 'Edit',
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
                label: 'Send',
                icon: Send,
                onClick: () => router.push(`/app/invoices/${item.id}`),
              } as ContextMenuItemSchema,
            ]
          : []),
        ...(isCancellable
          ? [
              {
                id: 'cancel',
                label: 'Cancel',
                icon: XCircle,
                onClick: () => router.push(`/app/invoices/${item.id}`),
              } as ContextMenuItemSchema,
            ]
          : []),
        { id: 'sep1', type: 'separator' as const },
        {
          id: 'delete',
          label: 'Delete',
          icon: Trash2,
          destructive: true,
          onClick: () =>
            alert.delete({
              title: `Delete invoice ${item.serial}?`,
              description: 'This action cannot be undone.',
              confirmText: 'Delete',
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
            href={`/app/${title.toLowerCase()}/${item.id}`}
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
  const activeLabel = PAYMENT_STATUSES.find((s) => s.value === paymentStatus)?.label ?? 'All';

  const filterBar = (
    <div className="flex flex-col gap-2 border-b px-4 py-2">
      <Tabs value={docType} onValueChange={setDocType} className="min-w-0">
        <TabsList className="h-auto min-h-8 w-full justify-start flex-wrap">
          {DOCUMENT_TYPES.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs px-3 py-1 shrink-0">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Select value={paymentStatus} onValueChange={setPaymentStatus}>
        <SelectTrigger className="w-full h-8 shrink-0">
          <SelectValue placeholder="Payment">{activeLabel}</SelectValue>
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
      <Header title={title} icon={<Receipt className="size-5" />} onCreate={() => openCreate()} createLabel="New Invoice" />
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
                    emptyTitle="No invoices found"
                    emptyDescription="Create your first invoice to see them here."
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
