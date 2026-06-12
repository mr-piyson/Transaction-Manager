'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { ShoppingCart, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Header } from '@/app/app/App-Header';
import { StatusBadge, VirtualTable } from '@/components/virtual-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc/client';

type PORow = {
  id: string;
  serial: string;
  status: string;
  date: Date;
  expectedDate: Date | null;
  total: bigint;
  amountPaid: bigint;
  amountOwed: bigint;
  supplier: { id: string; name: string };
  _count: { lines: number };
};

const columns: ColumnDef<PORow>[] = [
  {
    accessorKey: 'serial',
    header: 'Serial',
    size: 120,
    cell: ({ row }) => (
      <span className="font-mono font-semibold text-primary">{row.original.serial}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    size: 160,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorFn: (row) => row.supplier?.name,
    id: 'supplier',
    header: 'Supplier',
    cell: ({ getValue }) => (
      <span className="text-foreground">{getValue() as string}</span>
    ),
  },
  {
    id: 'lines',
    header: 'Lines',
    size: 80,
    cell: ({ row }) => (
      <Badge variant="outline" className="font-mono">
        {row.original._count.lines}
      </Badge>
    ),
  },
  {
    accessorKey: 'date',
    header: 'Order Date',
    size: 120,
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">
        {new Date(row.original.date).toLocaleDateString()}
      </span>
    ),
  },
  {
    accessorKey: 'expectedDate',
    header: 'Expected',
    size: 120,
    cell: ({ row }) =>
      row.original.expectedDate ? (
        <span className="text-muted-foreground text-xs">
          {new Date(row.original.expectedDate).toLocaleDateString()}
        </span>
      ) : (
        <span className="text-muted-foreground/50">—</span>
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
    accessorKey: 'amountOwed',
    header: 'Owed',
    size: 130,
    cell: ({ row }) => (
      <span
        className={
          row.original.amountOwed > BigInt(0)
            ? 'text-red-500 dark:text-red-400 font-semibold tabular-nums'
            : 'text-muted-foreground tabular-nums'
        }
      >
        {(Number(row.original.amountOwed) / 1000).toFixed(3)} BHD
      </span>
    ),
  },
];

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const { data = [], isLoading } = trpc.purchaseOrders.list.useQuery({});

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Purchase Orders"
        icon={<ShoppingCart className="size-5" />}
        rightContent={
          <Button size="sm" className="gap-1.5" onClick={() => router.push('/app/purchase-orders/new')}>
            <Plus className="size-4" />
            New PO
          </Button>
        }
      />
      <VirtualTable
        data={data as PORow[]}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Search by serial or supplier..."
        emptyMessage="No purchase orders found. Create your first PO to get started."
        onRowClick={(row) => router.push(`/app/purchase-orders/${row.id}`)}
        containerHeight="calc(100vh - 113px)"
      />
    </div>
  );
}
