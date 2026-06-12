'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Package, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Header } from '@/app/app/App-Header';
import { StatusBadge, VirtualTable } from '@/components/virtual-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

const columns: ColumnDef<ItemRow>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <span className="font-semibold text-foreground">{row.original.name}</span>
    ),
  },
  {
    accessorKey: 'sku',
    header: 'SKU',
    size: 120,
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">{row.original.sku}</span>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Type',
    size: 110,
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={
          row.original.type === 'PRODUCT'
            ? 'text-blue-600 border-blue-300 dark:text-blue-400 dark:border-blue-700 bg-blue-50 dark:bg-blue-950'
            : 'text-purple-600 border-purple-300 dark:text-purple-400 dark:border-purple-700 bg-purple-50 dark:bg-purple-950'
        }
      >
        {row.original.type.toLowerCase()}
      </Badge>
    ),
  },
  {
    accessorFn: (row) => row.category?.name ?? 'Uncategorized',
    id: 'category',
    header: 'Category',
    size: 140,
    cell: ({ getValue }) => (
      <span className="text-muted-foreground text-sm">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: 'salesPrice',
    header: 'Sales Price',
    size: 130,
    enableSorting: true,
    cell: ({ row }) => (
      <span className="font-semibold tabular-nums">
        {(Number(row.original.salesPrice) / 1000).toFixed(3)} BHD
      </span>
    ),
  },
  {
    id: 'stock',
    header: 'Stock',
    size: 100,
    cell: ({ row }) => {
      if (row.original.type === 'SERVICE') {
        return <span className="text-muted-foreground/50 text-xs">—</span>;
      }
      const total = row.original.stock.reduce((s, x) => s + x.quantity, 0);
      const isLow = total < row.original.minStock;
      return (
        <span className={isLow ? 'text-red-500 dark:text-red-400 font-semibold' : 'font-mono'}>
          {total} {row.original.unit ?? 'units'}
        </span>
      );
    },
  },
  {
    accessorKey: 'isSaleable',
    header: 'Saleable',
    size: 100,
    cell: ({ row }) => (
      <StatusBadge status={row.original.isSaleable ? 'ACTIVE' : 'DRAFT'} />
    ),
  },
];

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
      <VirtualTable
        data={data as ItemRow[]}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Search by name, SKU..."
        emptyMessage="No items found. Create your first item in the catalogue."
        onRowClick={(row) => router.push(`/app/items/${row.id}`)}
        containerHeight="calc(100vh - 113px)"
      />
    </div>
  );
}
