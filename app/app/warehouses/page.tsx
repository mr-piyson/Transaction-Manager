'use client';

import { Plus, Warehouse } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Header } from '@/app/app/App-Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';

export default function WarehousesPage() {
  const router = useRouter();
  const { data = [], isLoading } = trpc.warehouses.list.useQuery({});

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Warehouses"
        icon={<Warehouse className="size-5" />}
        rightContent={
          <Button size="sm" className="gap-1.5" onClick={() => router.push('/app/warehouses/new')}>
            <Plus className="size-4" />
            New Warehouse
          </Button>
        }
      />
    </div>
  );
}
