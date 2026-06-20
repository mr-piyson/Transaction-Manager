'use client';

import { Eye, Plus, Receipt, Trash } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Header } from '@/app/app/App-Header';
import { type ContextMenuItemSchema, UniversalContextMenu } from '@/components/context-menu';
import { ListView } from '@/components/list-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  SENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  PAID: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

interface InvoiceRow {
  id: string;
  serial: string;
  status: string;
  date: Date;
  dueDate: Date | null;
  total: number;
  currency: string;
  customer: { id: string; name: string } | null;
}

const DOCUMENT_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'INVOICE', label: 'Invoice' },
  { value: 'QUOTE', label: 'Quote' },
  { value: 'CREDIT_NOTE', label: 'Credit Note' },
  { value: 'PROFORMA', label: 'Proforma' },
  { value: 'DELIVERY_NOTE', label: 'Delivery Note' },
] as const;

const PAYMENT_STATUSES = [
  { value: 'all', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'PAID', label: 'Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
] as const;

export default function InvoicesPage() {
  const router = useRouter();
  const [docType, setDocType] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');

  const { data = [], isLoading } = trpc.invoices.list.useQuery({
    type: docType === 'all' ? undefined : (docType as any),
    paymentStatus: paymentStatus === 'all' ? undefined : (paymentStatus as any),
  });
  const utils = trpc.useUtils();
  const deleteMutation = trpc.invoices.delete.useMutation({
    onSuccess: () => {
      utils.invoices.list.invalidate();
    },
  });

  const contextMenu = (inv: any): ContextMenuItemSchema[] => [
    {
      id: 'view',
      label: 'View',
      icon: Eye,
      onClick: () => router.push(`/app/invoices/${inv.id}`),
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash,
      destructive: true,
      onClick: () => {
        if (window.confirm(`Delete ${inv.serial}?`)) {
          deleteMutation.mutate({ id: inv.id });
        }
      },
    },
  ];

  const invoices = Array.isArray(data) ? data : (data?.data ?? []);
  const activeLabel =
    PAYMENT_STATUSES.find((s) => s.value === paymentStatus)?.label ?? 'All';

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Invoices"
        icon={<Receipt className="size-5" />}
        rightContent={
          <Button size="sm" className="gap-1.5" onClick={() => router.push('/app/invoices/new')}>
            <Plus className="size-4" />
            New Invoice
          </Button>
        }
      />
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 border-b px-4 py-2 sm:py-1.5">
        <Tabs value={docType} onValueChange={setDocType} className="min-w-0 flex-1">
          <TabsList className="h-auto min-h-8 w-full justify-start flex-wrap">
            {DOCUMENT_TYPES.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="text-xs px-3 py-1 shrink-0"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Select value={paymentStatus} onValueChange={setPaymentStatus}>
          <SelectTrigger className="w-full sm:w-36 h-8 shrink-0">
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
      <ListView
        cardRenderer={(inv: any) => (
          <UniversalContextMenu items={contextMenu(inv)}>
            <div className="flex items-center gap-3 p-3">
              <div className="size-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Receipt className="size-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate">{inv.serial}</p>
                  <Badge variant="outline" className={STATUS_COLORS[inv.status] ?? ''}>
                    {inv.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {inv.customer?.name ?? '—'} ·{' '}
                  {inv.date ? format(new Date(inv.date), 'dd MMM yyyy') : '—'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">
                  {Number(inv.total).toFixed(3)} {inv.currency}
                </p>
              </div>
            </div>
          </UniversalContextMenu>
        )}
        searchFields={['serial'] as any}
        data={invoices}
        isLoading={isLoading}
        searchPlaceholder="Search by serial or customer..."
        emptyTitle="No invoices found."
        emptyDescription="Create your first invoice to get started."
      />
    </div>
  );
}
