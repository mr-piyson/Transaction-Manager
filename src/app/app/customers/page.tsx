'use client';

import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, User2 } from 'lucide-react';
import { Customer } from '@prisma/client';

import { ListView } from '@/components/list-view';
import { Button } from '@/components/ui/button';
import { UniversalDialog } from '@/components/dialog';
import { useI18n } from '@/hooks/use-i18n';
import { CustomerCardRenderer } from './customerCard';

// Optional: If you want to drop axios entirely, use Eden for the mutation.
import axios from 'axios';
import { Header } from '@/components/Header';
import { UniversalContextMenu } from '@/components/context-menu';
import { alert } from '@/components/Alert-dialog';

export default function CustomersPage() {
  const { t } = useI18n();

  const {
    data: customers,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => (await axios.get<Customer[]>('/api/customers')).data,
  });

  return (
    <>
      <Header
        icon={<User2 />}
        showBorder={true}
        title="Customers"
        rightContent={
          <UniversalDialog<Customer>
            title={t('customers.new', 'Create new Customer')}
            fields={[
              { name: 'name', label: 'Name', required: true, type: 'text' },
              { name: 'phone', label: 'Phone', required: true, type: 'text' },
              {
                name: 'address',
                label: 'Address',
                required: true,
                type: 'text',
              },
            ]}
            mutationFn={async (payload) =>
              // Tip: Consider using `eden.api.customers.post(payload)` here if your Eden client supports it!
              await axios.post('/api/customers', payload)
            }
            onSuccess={() => refetch()}
          >
            <Button>
              <Plus className="mr-2 size-4" />
              {t('common.create', 'Create')}
            </Button>
          </UniversalDialog>
        }
      />
      <ListView<Customer>
        emptyTitle={t('customers.empty_title', 'No Customers Found')}
        emptyIcon={<User2 className="size-16 text-muted-foreground" />}
        emptyDescription={t('customers.empty_description') || 'Create a new customer to get started'}
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
                      const res = await axios.delete(`/api/customers/${data.id}`);
                      if (res.status == 200) {
                        refetch();
                      }
                    },
                  });
                },
              },
            ]}
          >
            <CustomerCardRenderer data={data} />;
          </UniversalContextMenu>
        )}
        rowHeight={65}
        searchFields={['name', 'phone']}
        onRefetch={refetch}
      />
    </>
  );
}
