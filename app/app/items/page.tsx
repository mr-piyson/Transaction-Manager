'use client';

import { Package, Plus, Trash } from 'lucide-react';
import { Header } from '@/app/app/App-Header';
import { type ContextMenuItemSchema, UniversalContextMenu } from '@/components/context-menu';
import { ListView } from '@/components/list-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
import { useItemForm } from '@/components/dialogs/itemForm';

interface ItemRow {
  id: string;
  name: string;
  sku: string | null;
  description?: string | null;
  isActive: boolean;
  type: string;
  unit: string | null;
}

export default function ItemsPage() {
  const { data = [], isLoading } = trpc.items.list.useQuery({});
  const { openCreate, openEdit } = useItemForm();
  const utils = trpc.useUtils();
  const deleteMutation = trpc.items.delete.useMutation({
    onSuccess: () => { utils.items.list.invalidate(); },
  });

  const contextMenu: ContextMenuItemSchema[] = [
    { id: 'edit', label: 'Edit', onClick: () => {} },
    { id: 'delete', label: 'Delete', icon: Trash, destructive: true, onClick: () => {} },
  ];

  const items = Array.isArray(data) ? data : data?.data ?? [];

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Items"
        icon={<Package className="size-5" />}
        rightContent={
          <Button size="sm" className="gap-1.5" onClick={() => openCreate()}>
            <Plus className="size-4" />
            New Item
          </Button>
        }
      />
      <ListView
        cardRenderer={(item: ItemRow) => (
          <UniversalContextMenu items={contextMenu}>
            <div className="flex h-18 items-center gap-3 p-3">
              <div className="size-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Package className="size-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate">{item.name}</p>
                  <Badge variant="outline" className="text-xs">{item.type}</Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">{item.sku ?? '—'}</p>
              </div>
            </div>
          </UniversalContextMenu>
        )}
        searchFields={['name', 'sku', 'description'] as any}
        data={items}
        isLoading={isLoading}
        searchPlaceholder="Search by name, SKU or description..."
        emptyTitle="No items found."
        emptyDescription="Add your first item to get started."
      />
    </div>
  );
}
