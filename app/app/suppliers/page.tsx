'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Header } from '@/app/app/App-Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';

export default function SuppliersPage() {
  const router = useRouter();
  const { data = [], isLoading } = trpc.suppliers.list.useQuery({
    search: '',
    includeSystem: false,
  });

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Suppliers"
        icon={<Truck className="size-5" />}
        rightContent={
          <Button size="sm" className="gap-1.5" onClick={() => router.push('/app/suppliers/new')}>
            <Plus className="size-4" />
            New Supplier
          </Button>
        }
      />
    </div>
  );
}
