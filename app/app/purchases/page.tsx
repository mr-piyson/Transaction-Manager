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
  Plus,
} from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatAmount } from '@/lib/utils';
import Link from 'next/link';

import { ReceivePurchaseDialog } from './receive-purchase-dialog';

export default function PurchasesPage() {
  const { data: purchases, isLoading, refetch } = trpc.purchases.getPurchases.useQuery();
  
  const updateStatusMutation = trpc.purchases.updateStatus.useMutation({
    onSuccess: () => {
      refetch();
      toast.success('Payment status updated');
    },
  });

  const handleMarkPaid = (id: string) => {
    // Usually we would update status to PAID
    updateStatusMutation.mutate({ id, status: 'RECEIVED' }); // Adjust if you have a PAID status in enum
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Accounts Payable" transparent sticky>
        <Link href="/app/purchases/new">
          <Button className="bg-primary">
            <Plus /> Add Purchase
          </Button>
        </Link>
      </Header>

      <ListView
        data={purchases || []}
        isLoading={isLoading}
        searchFields={[]}
        emptyTitle="No Purchase Orders"
        emptyDescription="Keep track of your supplier purchases and inventory restocking here."
        emptyIcon={<ShoppingCart className="size-12 opacity-10" />}
        cardRenderer={(po) => (
          <div className="flex items-center gap-4 px-4 py-4 hover:bg-accent/50 transition-colors border-b border-border/50 group">
            <div
              className={`p-3 rounded-2xl shrink-0 ${po.isReceived ? 'bg-green-500/10 text-success' : 'bg-amber-500/10 text-amber-600'}`}
            >
              <Truck className="size-6" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-base truncate">{po.supplier.name}</span>
                <Badge
                  variant={po.isReceived ? 'default' : 'secondary'}
                  className="text-xs h-4 uppercase tracking-tighter"
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
              {po.status !== 'RECEIVED' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-success/10 bg-success/5 text-success hover:bg-success/10 hover:text-success"
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
                <ReceivePurchaseDialog 
                  purchaseId={po.id} 
                  onSuccess={refetch} 
                />
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-success font-medium px-2 py-1 rounded-md border-2 border-success/20">
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
