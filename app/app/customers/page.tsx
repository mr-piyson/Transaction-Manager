'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Trash, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/app/app/App-Header';
import { type ContextMenuItemSchema, UniversalContextMenu } from '@/components/context-menu';
import { Customer_List_Item } from '@/components/customers/customer-list-item';
import { CustomerFormDialog } from '@/components/dialogs/customerForm';
import { ListView } from '@/components/list-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';

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
  const router = useRouter();
  const { data = [], isLoading } = trpc.customers.list.useQuery({});

  const contextMenu: ContextMenuItemSchema[] = [
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash,
      destructive: true,
      onClick: () => {},
    },
  ];

  return (
    <div className="flex flex-col h-screen">
      <Header title="Customers" icon={<Users className="size-5" />} />
      <ListView
        cardRenderer={(data) => (
          <UniversalContextMenu items={contextMenu}>
            <Customer_List_Item data={data} />
          </UniversalContextMenu>
        )}
        searchFields={[]}
        data={data as CustomerRow[]}
        isLoading={isLoading}
        searchPlaceholder="Search by name, email or phone..."
        emptyTitle="No customers found."
        emptyDescription="Add your first customer to get started."
      />
    </div>
  );
}
