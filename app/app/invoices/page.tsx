'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { FilePenLine, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Header } from '@/app/app/App-Header';
import { StatusBadge, VirtualTable } from '@/components/virtual-table';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';

type InvoiceRow = {
  id: string;
  serial: string;
  type: string;
  status: string;
  paymentStatus: string;
  date: Date;
  dueDate?: Date | null;
  total: bigint;
  amountDue: bigint;
  customer?: { id: string; name: string } | null;
};

const columns: ColumnDef<InvoiceRow>[] = [
  {
    accessorKey: 'serial',
    header: 'Serial',
    size: 120,
    cell: ({ row }) => (
      <span className="font-mono font-semibold text-primary">{row.original.serial}</span>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Type',
    size: 120,
    cell: ({ row }) => <StatusBadge status={row.original.type} />,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    size: 120,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'paymentStatus',
    header: 'Payment',
    size: 120,
    cell: ({ row }) => <StatusBadge status={row.original.paymentStatus} />,
  },
  {
    accessorFn: (row) => row.customer?.name ?? 'Walk-in',
    id: 'customer',
    header: 'Customer',
    cell: ({ getValue }) => (
      <span className="text-foreground">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: 'date',
    header: 'Date',
    size: 120,
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">
        {new Date(row.original.date).toLocaleDateString()}
      </span>
    ),
  },
  {
    accessorKey: 'total',
    header: 'Total',
    size: 130,
    enableSorting: true,
    cell: ({ row }) => (
      <span className="font-semibold tabular-nums">
        {(Number(row.original.total) / 1000).toFixed(3)} BHD
      </span>
    ),
  },
  {
    accessorKey: 'amountDue',
    header: 'Amount Due',
    size: 130,
    cell: ({ row }) => (
      <span
        className={
          row.original.amountDue > BigInt(0)
            ? 'text-red-500 dark:text-red-400 font-semibold tabular-nums'
            : 'text-muted-foreground tabular-nums'
        }
      >
        {(Number(row.original.amountDue) / 1000).toFixed(3)} BHD
      </span>
    ),
  },
];

export default function InvoicesPage() {
  const router = useRouter();
  const { data = [], isLoading } = trpc.invoices.list.useQuery({});

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Invoices"
        icon={<FilePenLine className="size-5" />}
        rightContent={
          <Button size="sm" className="gap-1.5" onClick={() => router.push('/app/invoices/new')}>
            <Plus className="size-4" />
            New Invoice
          </Button>
        }
      />
      <VirtualTable
        data={data as InvoiceRow[]}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Search by serial or customer..."
        emptyMessage="No invoices found. Create your first invoice to get started."
        onRowClick={(row) => router.push(`/app/invoices/${row.id}`)}
        containerHeight="calc(100vh - 113px)"
      />
    </div>
  );
}
