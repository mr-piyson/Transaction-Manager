'use client';

import { Handshake, Plus, Trash } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Header } from '@/app/app/App-Header';
import { type ContextMenuItemSchema, UniversalContextMenu } from '@/components/context-menu';
import { ListView } from '@/components/list-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
import { format, isAfter } from 'date-fns';

interface ContractRow {
  id: string;
  title: string;
  serial: string;
  contractValue: number;
  currency: string;
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
  customer: { id: string; name: string } | null;
}

export default function ContractsPage() {
  const router = useRouter();
  const { data = [], isLoading } = trpc.contracts.list.useQuery({});
  const utils = trpc.useUtils();
  const deleteMutation = trpc.contracts.delete.useMutation({
    onSuccess: () => { utils.contracts.list.invalidate(); },
  });

  const contextMenu: ContextMenuItemSchema[] = [
    { id: 'edit', label: 'Edit', onClick: () => {} },
    { id: 'delete', label: 'Delete', icon: Trash, destructive: true, onClick: () => {} },
  ];

  const contracts = Array.isArray(data) ? data : data?.data ?? [];

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Contracts"
        icon={<Handshake className="size-5" />}
        rightContent={
          <Button size="sm" className="gap-1.5" onClick={() => router.push('/app/contracts/new')}>
            <Plus className="size-4" />
            New Contract
          </Button>
        }
      />
      <ListView
        cardRenderer={(c: any) => {
          const expired = c.endDate && !isAfter(new Date(c.endDate), new Date());
          return (
            <UniversalContextMenu items={contextMenu}>
              <div className="flex items-center gap-3 p-3">
                <div className="size-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Handshake className="size-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{c.customer?.name ?? c.serial}</p>
                    {expired && <Badge variant="destructive" className="text-xs">Expired</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {c.serial} · {c.startDate ? format(new Date(c.startDate), 'dd MMM yyyy') : '—'}
                    {c.endDate ? ` → ${format(new Date(c.endDate), 'dd MMM yyyy')}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{Number(c.contractValue).toFixed(3)} {c.currency}</p>
                </div>
              </div>
            </UniversalContextMenu>
          );
        }}
        searchFields={['serial'] as any}
        data={contracts}
        isLoading={isLoading}
        searchPlaceholder="Search by serial or customer..."
        emptyTitle="No contracts found."
        emptyDescription="Add your first contract to get started."
      />
    </div>
  );
}
