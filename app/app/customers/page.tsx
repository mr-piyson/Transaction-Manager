'use client';

import { Plus, User2 } from 'lucide-react';
import { Customer } from '@prisma/client';
import { ListView } from '@/components/list-view';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/use-i18n';
import { CustomerCard } from './customerCard';
import { Header } from '@/app/app/App-Header';
import { UniversalContextMenu } from '@/components/context-menu';
import { alert } from '@/components/Alert-dialog';
import { useRouter } from 'next/navigation';
import { CreateCustomerDialog } from './create-customer-dialog';
import { useCustomers, useDeleteCustomer } from '@/hooks/data/use-customers';

export default function CustomersPage() {
  const { t } = useI18n();

  const { data: customers, isLoading, isError, refetch } = useCustomers();
  const deleteMutation = useDeleteCustomer();
  const router = useRouter();

  return (
    <>
      <Header
        icon={<User2 />}
        showBorder={true}
        title="Customers"
        rightContent={
          <CreateCustomerDialog>
            <Button>
              <Plus />
              New
            </Button>
          </CreateCustomerDialog>
        }
      />
      <ListView<Customer>
        emptyTitle={t('customers.empty_title', 'No Customers Found')}
        emptyIcon={<User2 className="size-16 text-muted-foreground" />}
        emptyDescription={'Create a new customer to get started'}
        data={customers}
        isLoading={isLoading}
        isError={isError}
        itemName="customers"
        useTheme={true}
        cardRenderer={(data) => (
          <UniversalContextMenu
            items={[
              {
                id: 'delete',
                label: 'Delete',
                destructive: true,
                onClick: async () => {
                  alert.delete({
                    title: 'Are you sure',
                    onConfirm: async () => {
                      deleteMutation.mutate(String(data.id));
                    },
                  });
                },
              },
            ]}
          >
            <CustomerCard data={data} onClick={() => router.push(`/app/customers/${data.id}`)} />
          </UniversalContextMenu>
        )}
        rowHeight={72}
        searchFields={['name', 'phone']}
        onRefetch={refetch}
      />
    </>
  );
}
