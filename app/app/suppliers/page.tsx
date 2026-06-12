'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Truck, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Header } from '@/app/app/App-Header';
import { StatusBadge, VirtualTable } from '@/components/virtual-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc/client';

type SupplierRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  contactName: string | null;
  isSystem: boolean;
  isActive: boolean;
  _count: { purchaseOrders: number; supplierItems: number };
};

const columns: ColumnDef<SupplierRow>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="font-semibold text-foreground">{row.original.name}</span>
        {row.original.isSystem && (
          <Badge variant="secondary" className="text-[10px] py-0">system</Badge>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'contactName',
    header: 'Contact',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">{row.original.contactName ?? '—'}</span>
    ),
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">{row.original.email ?? '—'}</span>
    ),
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    size: 140,
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm font-mono">{row.original.phone ?? '—'}</span>
    ),
  },
  {
    id: 'purchaseOrders',
    header: 'POs',
    size: 80,
    cell: ({ row }) => (
      <Badge variant="outline" className="font-mono">
        {row.original._count.purchaseOrders}
      </Badge>
    ),
  },
  {
    id: 'items',
    header: 'Items',
    size: 80,
    cell: ({ row }) => (
      <Badge variant="outline" className="font-mono">
        {row.original._count.supplierItems}
      </Badge>
    ),
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    size: 100,
    cell: ({ row }) => (
      <StatusBadge status={row.original.isActive ? 'ACTIVE' : 'CANCELLED'} />
    ),
  },
];

export default function SuppliersPage() {
  const router = useRouter();
  const { data = [], isLoading } = trpc.suppliers.list.useQuery({ search: '', includeSystem: false });

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
      <VirtualTable
        data={data as SupplierRow[]}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Search by name or contact..."
        emptyMessage="No suppliers found. Add your first supplier to get started."
        onRowClick={(row) => router.push(`/app/suppliers/${row.id}`)}
        containerHeight="calc(100vh - 113px)"
      />
    </div>
  );
}
