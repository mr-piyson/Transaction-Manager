'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Warehouse, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Header } from '@/app/app/App-Header';
import { VirtualTable } from '@/components/virtual-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc/client';

type WarehouseRow = {
  id: string;
  name: string;
  address: string | null;
  isDefault: boolean;
  _count: { stock: number };
};

const columns: ColumnDef<WarehouseRow>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="font-semibold text-foreground">{row.original.name}</span>
        {row.original.isDefault && (
          <Badge className="text-[10px] py-0 bg-primary/15 text-primary border-primary/30">
            default
          </Badge>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'address',
    header: 'Address',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">{row.original.address ?? '—'}</span>
    ),
  },
  {
    id: 'stock',
    header: 'SKUs In Stock',
    size: 130,
    cell: ({ row }) => (
      <Badge variant="outline" className="font-mono">
        {row.original._count.stock}
      </Badge>
    ),
  },
];

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
      <VirtualTable
        data={data as WarehouseRow[]}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Search warehouses..."
        emptyMessage="No warehouses found. Create your first warehouse to start tracking stock."
        onRowClick={(row) => router.push(`/app/warehouses/${row.id}`)}
        containerHeight="calc(100vh - 113px)"
      />
    </div>
  );
}
