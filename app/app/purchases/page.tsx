'use client';

import { ListView } from '@/components/list-view';
import { Header } from '../App-Header';
import {
  ShoppingCart,
  Truck,
  Calendar,
  DollarSign,
  Package,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { Badge } from '@/components/ui/badge';
import { Format } from '@/lib/format';
import { CreatePurchaseDialog } from './create-purchase-dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatAmount } from '@/lib/utils';

export default function PurchasesPage() {
  const { data: purchases, isLoading, refetch } = trpc.purchases.getPurchases.useQuery();
  const receiveMutation = trpc.purchases.receiveOrder.useMutation({
    onSuccess: () => {
      refetch();
      toast.success('Inventory updated successfully');
    },
  });

  const updateStatusMutation = trpc.purchases.updateStatus.useMutation({
    onSuccess: () => {
      refetch();
      toast.success('Payment status updated');
    },
  });

  const handleReceive = (id: number) => {
    // In a real app, I'd show a dialog to pick a warehouse
    // For now, I'll pick the first warehouse or default to 1 (Demo)
    receiveMutation.mutate({ purchaseOrderId: id, warehouseId: 1 });
  };

  const handleMarkPaid = (id: number) => {
    updateStatusMutation.mutate({ id, status: 'Paid' });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Accounts Payable" transparent sticky>
        <CreatePurchaseDialog onSuccess={refetch} />
      </Header>

      <ListView
        data={purchases || []}
        isLoading={isLoading}
        searchFields={['supplier.name']}
        emptyTitle="No Purchase Orders"
        emptyDescription="Keep track of your supplier purchases and inventory restocking here."
        emptyIcon={<ShoppingCart className="size-12 opacity-10" />}
        cardRenderer={(po) => (
          <div className="flex items-center gap-4 px-4 py-4 hover:bg-accent/50 transition-colors border-b border-border/50 group">
            <div
              className={`p-3 rounded-2xl shrink-0 ${po.isReceived ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600'}`}
            >
              <Truck className="size-6" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-base truncate">{po.supplier.name}</span>
                <Badge
                  variant={po.isReceived ? 'default' : 'secondary'}
                  className="text-[10px] h-4 uppercase tracking-tighter"
                >
                  {po.isReceived ? 'Received' : 'Pending'}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3" />
                  {new Date(po.date).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1.5">
                  <Package className="size-3" />
                  {po._count.lines} Items
                </div>
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <DollarSign className="size-3" />
                  {formatAmount(po.total)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {po.status !== 'Paid' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkPaid(po.id);
                  }}
                  disabled={updateStatusMutation.isPending}
                >
                  <DollarSign className="size-3 mr-1.5" />
                  Mark Paid
                </Button>
              )}

              {!po.isReceived ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReceive(po.id);
                  }}
                  disabled={receiveMutation.isPending}
                >
                  {receiveMutation.isPending ? (
                    <Clock className="size-3 animate-spin mr-1.5" />
                  ) : (
                    <CheckCircle2 className="size-3 mr-1.5" />
                  )}
                  Receive Stock
                </Button>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-md border border-green-100">
                  <CheckCircle2 className="size-3" />
                  Stock Added
                </div>
              )}
            </div>
          </div>
        )}
      />
    </div>
  );
}
