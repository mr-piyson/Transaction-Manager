'use client';

import { Eye, Plus, Trash, Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Header } from '@/app/app/App-Header';
import { alert } from '@/components/Alert-dialog';
import { type ContextMenuItemSchema, UniversalContextMenu } from '@/components/context-menu';
import { ListView } from '@/components/list-view';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
import { useSupplierForm } from '@/components/dialogs/supplierForm';
import { SupplierListItem } from '@/components/suppliers/supplier-list-item';

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
  const router = useRouter();
  const { data, isLoading } = trpc.suppliers.list.useQuery({});
  const { openCreate, openEdit } = useSupplierForm();
  const utils = trpc.useUtils();
  const deleteMutation = trpc.suppliers.delete.useMutation({
    onSuccess: () => {
      utils.suppliers.list.invalidate();
    },
  });

  const suppliers: SupplierRow[] = Array.isArray(data) ? data : (data as any)?.data ?? [];

  const handleDelete = (supplier: SupplierRow) => {
    alert.delete({
      title: `Delete "${supplier.name}"?`,
      description: 'This supplier will be deactivated. You can restore it later.',
      confirmText: 'Delete',
      onConfirm: async () => {
        await deleteMutation.mutateAsync({ id: supplier.id });
      },
    });
  };

  const contextMenu = (supplier: SupplierRow): ContextMenuItemSchema[] => [
    {
      id: 'view',
      label: 'View',
      icon: Eye,
      onClick: () => router.push(`/app/suppliers/${supplier.id}`),
    },
    {
      id: 'edit',
      label: 'Edit',
      onClick: () => openEdit({ id: supplier.id, name: supplier.name, code: supplier.code ?? undefined, phone: supplier.phone ?? undefined, email: supplier.email ?? undefined, contactName: supplier.contactName ?? undefined, paymentTermsDays: supplier.paymentTermsDays }),
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash,
      destructive: true,
      onClick: () => handleDelete(supplier),
    },
  ];

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
      <ListView<SupplierRow>
        cardRenderer={(s) => (
          <UniversalContextMenu items={contextMenu(s)}>
            <SupplierListItem data={s} />
          </UniversalContextMenu>
        )}
        searchFields={['name', 'email', 'phone', 'code']}
        data={suppliers}
        isLoading={isLoading}
        searchPlaceholder="Search by name, email or phone..."
        emptyTitle="No suppliers found."
        emptyDescription="Add your first supplier to get started."
        itemName="suppliers"
      />
    </div>
  );
}
