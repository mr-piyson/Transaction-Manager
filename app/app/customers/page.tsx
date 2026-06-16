'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Trash, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Header } from '@/app/app/App-Header';
import { type ContextMenuItemSchema, UniversalContextMenu } from '@/components/context-menu';
import { Customer_List_Item } from '@/components/customers/customer-list-item';
import { ListView } from '@/components/list-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
import { useCustomerForm } from '@/components/dialogs/customerForm';

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  isActive: boolean;
  creditLimit: bigint;
};

export default function CustomersPage() {
  const { data = [], isLoading } = trpc.customers.list.useQuery({});
  const { openCreate, openEdit } = useCustomerForm();
  const utils = trpc.useUtils();
  const deleteMutation = trpc.customers.delete.useMutation({
    onSuccess: () => { utils.customers.list.invalidate(); },
  });

  const contextMenu: ContextMenuItemSchema[] = [
    { id: 'edit', label: 'Edit', onClick: () => {} },
    { id: 'delete', label: 'Delete', icon: Trash, destructive: true, onClick: () => {} },
  ];

  const customers = Array.isArray(data) ? data : data?.data ?? [];

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Customers"
        icon={<Users className="size-5" />}
        rightContent={
          <Button size="sm" className="gap-1.5" onClick={() => openCreate()}>
            <Plus className="size-4" />
            New Customer
          </Button>
        }
      />
      <ListView
        cardRenderer={(data: any) => (
          <UniversalContextMenu items={contextMenu}>
            <Customer_List_Item data={data} />
          </UniversalContextMenu>
        )}
        searchFields={['name', 'phone', 'email']}
        data={customers}
        isLoading={isLoading}
        searchPlaceholder="Search by name, email or phone..."
        emptyTitle="No customers found."
        emptyDescription="Add your first customer to get started."
      />
    </div>
  );
}
