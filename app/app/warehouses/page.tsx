'use client';

import { Plus, Trash, Warehouse } from 'lucide-react';
import { Header } from '@/app/app/App-Header';
import { type ContextMenuItemSchema, UniversalContextMenu } from '@/components/context-menu';
import { ListView } from '@/components/list-view';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc/client';
import { useWarehouseForm } from '@/components/dialogs/warehouseForm';

type WarehouseRow = {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  isDefault: boolean;
  _count: { stock: number };
};

export default function WarehousesPage() {
  const { data = [], isLoading } = trpc.warehouses.list.useQuery({});
  const { openCreate, openEdit } = useWarehouseForm();
  const utils = trpc.useUtils();
  const deleteMutation = trpc.warehouses.delete.useMutation({
    onSuccess: () => { utils.warehouses.list.invalidate(); },
  });

  const contextMenu: ContextMenuItemSchema[] = [
    { id: 'edit', label: 'Edit', onClick: () => {} },
    { id: 'delete', label: 'Delete', icon: Trash, destructive: true, onClick: () => {} },
  ];

  const warehouses = Array.isArray(data) ? data : data?.data ?? [];

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Warehouses"
        icon={<Warehouse className="size-5" />}
        rightContent={
          <Button size="sm" className="gap-1.5" onClick={() => openCreate()}>
            <Plus className="size-4" />
            New Warehouse
          </Button>
        }
      />
      <ListView
        cardRenderer={(w: WarehouseRow) => (
          <UniversalContextMenu items={contextMenu}>
            <div className="flex h-18 items-center gap-3 p-3">
              <div className="size-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Warehouse className="size-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate">{w.name}</p>
                  {w.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                </div>
                <p className="text-sm text-muted-foreground truncate">{w.code ?? '—'} · {w._count.stock} items</p>
              </div>
            </div>
          </UniversalContextMenu>
        )}
        searchFields={['name', 'code']}
        data={warehouses}
        isLoading={isLoading}
        searchPlaceholder="Search by name or code..."
        emptyTitle="No warehouses found."
        emptyDescription="Add your first warehouse to get started."
      />
    </div>
  );
}
