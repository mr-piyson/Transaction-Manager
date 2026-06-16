'use client';

import { Eye, Plus, ShoppingCart, Trash } from 'lucide-react';
import { Header } from '@/app/app/App-Header';
import { type ContextMenuItemSchema, UniversalContextMenu } from '@/components/context-menu';
import { ListView } from '@/components/list-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  APPROVED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ORDERED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  PARTIAL_RECEIVED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  RECEIVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  INVOICED: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  CLOSED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

interface PurchaseOrderRow {
  id: string;
  serial: string;
  status: string;
  date: Date;
  expectedDate: Date | null;
  total: number;
  amountOwed: number;
  currency: string;
  supplier: { id: string; name: string } | null;
  warehouse: { id: string; name: string } | null;
}

export default function PurchaseOrdersPage() {
  const { data = [], isLoading } = trpc.purchaseOrders.list.useQuery({});
  const utils = trpc.useUtils();
  const deleteMutation = trpc.purchaseOrders.delete.useMutation({
    onSuccess: () => { utils.purchaseOrders.list.invalidate(); },
  });

  const contextMenu: ContextMenuItemSchema[] = [
    { id: 'view', label: 'View', icon: Eye, onClick: () => {} },
    { id: 'delete', label: 'Delete', icon: Trash, destructive: true, onClick: () => {} },
  ];

  const orders = Array.isArray(data) ? data : data?.data ?? [];

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Purchase Orders"
        icon={<ShoppingCart className="size-5" />}
        rightContent={
          <Button size="sm" className="gap-1.5" onClick={() => {}}>
            <Plus className="size-4" />
            New PO
          </Button>
        }
      />
      <ListView
        cardRenderer={(po: any) => (
          <UniversalContextMenu items={contextMenu}>
            <div className="flex items-center gap-3 p-3">
              <div className="size-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <ShoppingCart className="size-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate">{po.serial}</p>
                  <Badge variant="outline" className={STATUS_COLORS[po.status] ?? ''}>{po.status.replace('_', ' ')}</Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {po.supplier?.name ?? '—'} · {po.date ? format(new Date(po.date), 'dd MMM yyyy') : '—'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{Number(po.total).toFixed(3)} {po.currency}</p>
                {Number(po.amountOwed) > 0 && <p className="text-xs text-muted-foreground">{Number(po.amountOwed).toFixed(3)} owed</p>}
              </div>
            </div>
          </UniversalContextMenu>
        )}
        searchFields={['serial'] as any}
        data={orders}
        isLoading={isLoading}
        searchPlaceholder="Search by serial or supplier..."
        emptyTitle="No purchase orders found."
        emptyDescription="Create your first purchase order to get started."
      />
    </div>
  );
}
