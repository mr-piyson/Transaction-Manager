'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { ScrollText, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Header } from '@/app/app/App-Header';
import { StatusBadge, VirtualTable } from '@/components/virtual-table';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';

type ContractRow = {
  id: string;
  title: string;
  contractValue: bigint;
  currency: string;
  startDate: Date;
  endDate: Date;
  renewalDate: Date | null;
  isActive: boolean;
  customer: { id: string; name: string };
};

const columns: ColumnDef<ContractRow>[] = [
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => (
      <span className="font-semibold text-foreground">{row.original.title}</span>
    ),
  },
  {
    accessorFn: (row) => row.customer?.name,
    id: 'customer',
    header: 'Customer',
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: 'contractValue',
    header: 'Value',
    size: 140,
    enableSorting: true,
    cell: ({ row }) => (
      <span className="font-semibold tabular-nums">
        {(Number(row.original.contractValue) / 1000).toFixed(3)} {row.original.currency}
      </span>
    ),
  },
  {
    accessorKey: 'startDate',
    header: 'Start Date',
    size: 120,
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">
        {new Date(row.original.startDate).toLocaleDateString()}
      </span>
    ),
  },
  {
    accessorKey: 'endDate',
    header: 'End Date',
    size: 120,
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">
        {new Date(row.original.endDate).toLocaleDateString()}
      </span>
    ),
  },
  {
    accessorKey: 'renewalDate',
    header: 'Renewal',
    size: 120,
    cell: ({ row }) => {
      if (!row.original.renewalDate) return <span className="text-muted-foreground/50">—</span>;
      const daysLeft = Math.ceil(
        (new Date(row.original.renewalDate).getTime() - Date.now()) / 86400000,
      );
      return (
        <span
          className={
            daysLeft <= 30
              ? 'text-amber-600 dark:text-amber-400 font-medium text-xs'
              : 'text-muted-foreground text-xs'
          }
        >
          {new Date(row.original.renewalDate).toLocaleDateString()}
          {daysLeft <= 30 && ` (${daysLeft}d)`}
        </span>
      );
    },
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

export default function ContractsPage() {
  const router = useRouter();
  const { data = [], isLoading } = trpc.contracts.list.useQuery({});

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Contracts"
        icon={<ScrollText className="size-5" />}
        rightContent={
          <Button size="sm" className="gap-1.5" onClick={() => router.push('/app/contracts/new')}>
            <Plus className="size-4" />
            New Contract
          </Button>
        }
      />
      <VirtualTable
        data={data as ContractRow[]}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Search by title or customer..."
        emptyMessage="No contracts found. Create your first contract to get started."
        onRowClick={(row) => router.push(`/app/contracts/${row.id}`)}
        containerHeight="calc(100vh - 113px)"
      />
    </div>
  );
}
