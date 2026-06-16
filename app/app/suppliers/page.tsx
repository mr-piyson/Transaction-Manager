'use client';

import { Plus, Trash, Truck } from 'lucide-react';
import { Header } from '@/app/app/App-Header';
import { type ContextMenuItemSchema, UniversalContextMenu } from '@/components/context-menu';
import { ListView } from '@/components/list-view';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
import { useSupplierForm } from '@/components/dialogs/supplierForm';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type SupplierRow = {
  id: string;
  name: string;
  code: string | null;
  phone: string | null;
  email: string | null;
  contactName: string | null;
  isActive: boolean;
  paymentTermsDays: number;
};

export default function SuppliersPage() {
  const { data = [], isLoading } = trpc.suppliers.list.useQuery({});
  const { openCreate, openEdit } = useSupplierForm();
  const utils = trpc.useUtils();
  const deleteMutation = trpc.suppliers.delete.useMutation({
    onSuccess: () => { utils.suppliers.list.invalidate(); },
  });

  const contextMenu: ContextMenuItemSchema[] = [
    {
      id: 'edit',
      label: 'Edit',
      onClick: () => {},
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash,
      destructive: true,
      onClick: () => {},
    },
  ];

  const suppliers = Array.isArray(data) ? data : data?.data ?? [];

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Suppliers"
        icon={<Truck className="size-5" />}
        rightContent={
          <Button size="sm" className="gap-1.5" onClick={() => openCreate()}>
            <Plus className="size-4" />
            New Supplier
          </Button>
        }
      />
      <ListView
        cardRenderer={(s: SupplierRow) => (
          <UniversalContextMenu items={contextMenu}>
            <div className="flex h-18 items-center gap-3 p-3">
              <Avatar className="size-11 rounded-lg shrink-0">
                <AvatarFallback className="rounded-lg"><Truck className="size-5" /></AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{s.name}</p>
                <p className="text-sm text-muted-foreground truncate">{s.phone ?? s.email ?? s.code}</p>
              </div>
            </div>
          </UniversalContextMenu>
        )}
        searchFields={['name', 'email', 'phone', 'code']}
        data={suppliers}
        isLoading={isLoading}
        searchPlaceholder="Search by name, email or phone..."
        emptyTitle="No suppliers found."
        emptyDescription="Add your first supplier to get started."
      />
    </div>
  );
}
