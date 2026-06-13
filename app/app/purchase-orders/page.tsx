'use client';

import { Plus, ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Header } from '@/app/app/App-Header';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const { data = [], isLoading } = trpc.purchaseOrders.list.useQuery({});

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Purchase Orders"
        icon={<ShoppingCart className="size-5" />}
        rightContent={
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => router.push('/app/purchase-orders/new')}
          >
            <Plus className="size-4" />
            New PO
          </Button>
        }
      />
    </div>
  );
}
