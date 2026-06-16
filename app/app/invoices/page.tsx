'use client';

import { Eye, Plus, Receipt, Trash } from 'lucide-react';
import { Header } from '@/app/app/App-Header';
import { type ContextMenuItemSchema, UniversalContextMenu } from '@/components/context-menu';
import { ListView } from '@/components/list-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
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

export default function InvoicesPage() {
  const { data = [], isLoading } = trpc.invoices.list.useQuery({});
  const utils = trpc.useUtils();
  const deleteMutation = trpc.invoices.delete.useMutation({
    onSuccess: () => { utils.invoices.list.invalidate(); },
  });

  const contextMenu: ContextMenuItemSchema[] = [
    { id: 'view', label: 'View', icon: Eye, onClick: () => {} },
    { id: 'delete', label: 'Delete', icon: Trash, destructive: true, onClick: () => {} },
  ];

  const invoices = Array.isArray(data) ? data : data?.data ?? [];

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Invoices"
        icon={<Receipt className="size-5" />}
        rightContent={
          <Button size="sm" className="gap-1.5" onClick={() => {}}>
            <Plus className="size-4" />
            New Invoice
          </Button>
        }
      />
      <ListView
        cardRenderer={(inv: any) => (
          <UniversalContextMenu items={contextMenu}>
            <div className="flex items-center gap-3 p-3">
              <div className="size-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Receipt className="size-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate">{inv.serial}</p>
                  <Badge variant="outline" className={STATUS_COLORS[inv.status] ?? ''}>{inv.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {inv.customer?.name ?? '—'} · {inv.date ? format(new Date(inv.date), 'dd MMM yyyy') : '—'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{Number(inv.total).toFixed(3)} {inv.currency}</p>
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
