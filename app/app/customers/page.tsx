'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Users, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Header } from '@/app/app/App-Header';
import { StatusBadge, VirtualTable } from '@/components/virtual-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc/client';
import { CustomerFormDialog } from '@/components/dialogs/customerForm';

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  isActive: boolean;
  creditLimit: bigint;
  _count: { invoices: number };
};

const columns: ColumnDef<CustomerRow>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <span className="font-semibold text-foreground">{row.original.name}</span>,
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
    accessorKey: 'city',
    header: 'City',
    size: 130,
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">{row.original.city ?? '—'}</span>
    ),
  },
  {
    id: 'invoices',
    header: 'Invoices',
    size: 100,
    cell: ({ row }) => (
      <Badge variant="outline" className="font-mono">
        {row.original._count.invoices}
      </Badge>
    ),
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    size: 100,
    cell: ({ row }) => <StatusBadge status={row.original.isActive ? 'ACTIVE' : 'CANCELLED'} />,
  },
];

export default function CustomersPage() {
  const router = useRouter();
  const { data = [], isLoading } = trpc.customers.list.useQuery({});

  return (
    <div className="flex flex-col h-screen">
      <Header title="Customers" icon={<Users className="size-5" />} />
      <VirtualTable
        data={data as CustomerRow[]}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Search by name, email or phone..."
        emptyMessage="No customers found. Add your first customer to get started."
        onRowClick={(row) => router.push(`/app/customers/${row.id}`)}
        containerHeight="calc(100vh - 113px)"
      />
    </div>
  );
}
