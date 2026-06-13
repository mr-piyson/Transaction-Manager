'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Package, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Header } from '@/app/app/App-Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';

type ItemRow = {
  id: string;
  name: string;
  sku: string;
  type: 'PRODUCT' | 'SERVICE';
  unit: string | null;
  purchasePrice: bigint;
  salesPrice: bigint;
  minStock: number;
  isSaleable: boolean;
  category: { id: string; name: string } | null;
  taxRate: { id: string; name: string; rate: number } | null;
  stock: { quantity: number; warehouse: { id: string; name: string } }[];
};

export default function ItemsPage() {
  const router = useRouter();
  const { data = [], isLoading } = trpc.items.list.useQuery({});

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Items"
        icon={<Package className="size-5" />}
        rightContent={
          <Button size="sm" className="gap-1.5" onClick={() => router.push('/app/items/new')}>
            <Plus className="size-4" />
            New Item
          </Button>
        }
      />
    </div>
  );
}
