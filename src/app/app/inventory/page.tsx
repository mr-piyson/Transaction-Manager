'use client';

import { useQuery } from '@tanstack/react-query';
import { Box, Trash } from 'lucide-react';
import { InventoryItem } from '@prisma/client';

import { ListView } from '@/components/list-view';
import { Button } from '@/components/ui/button';
import { UniversalDialog } from '@/components/dialog';
import { useI18n } from '@/hooks/use-i18n';

// Optional: If you want to drop axios entirely, use Eden for the mutation.
import axios from 'axios';
import { Header } from '@/components/Header';
import { InventoryCard } from './inventoryCard';
import { toast } from 'sonner';
import { queryClient } from '../layout';
import { alert } from '@/components/Alert-dialog';
import { UniversalContextMenu } from '@/components/context-menu';
import { useRouter } from 'next/navigation';

export default function InventoryPage() {
  const { t } = useI18n();
  const router = useRouter();

  const {
    data: inventory,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const data = (await axios.get('/api/inventory')).data;
      return data;
    },
  });

  const handleDelete = (data: InventoryItem) => {
    alert.delete({
      title: 'Delete item?',
      description: data.name,
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => {
        const res = await axios.delete(`/api/inventory/${data.id}`);
        if (res.status == 200) {
          toast.success('Item deleted');
          refetch();
        }
      },
    });
  };

  return (
    <>
      <Header
        showBorder={true}
        title={t('common.inventory')}
        icon={<Box />}
        rightContent={
          <UniversalDialog<InventoryItem>
            title={'Create new Inventory item'}
            fields={[
              {
                label: 'Name',
                name: 'name',
                type: 'text',
                required: true,
                width: 'full',
              },
              {
                label: 'Description',
                name: 'description',
                type: 'textarea',
                required: true,
                width: 'full',
              },
              {
                label: 'Purchase Price',
                name: 'purchasePrice',
                type: 'number',
                required: true,
              },
              {
                label: 'Sales Price',
                name: 'salesPrice',
                type: 'number',
                required: true,
              },
              {
                label: 'Bar/QR Code',
                name: 'code',
                type: 'text',
                required: false,
              },
            ]}
            mutationFn={async function (variables: Partial<any>): Promise<any> {
              return await axios.post('/api/inventory', variables);
            }}
            onSuccess={() => refetch()}
          >
            <Button>Create</Button>
          </UniversalDialog>
        }
      />
      <ListView<InventoryItem>
        emptyTitle={t('inventory.empty_title', 'No inventory items Found')}
        emptyIcon={<Box className="size-16 text-muted-foreground" />}
        emptyDescription={t('inventory.empty_description') || 'Create a new inventory item to get started'}
        data={inventory}
        isLoading={isLoading}
        isError={isError}
        itemName="inventory items"
        useTheme={true}
        cardRenderer={(data) => (
          <div key={data.id}>
            <UniversalContextMenu
              items={[
                {
                  id: 'delete',
                  label: 'Delete',
                  icon: Trash,
                  destructive: true,
                  onClick: () => {
                    handleDelete(data);
                  },
                },
              ]}
            >
              <InventoryCard data={data} onClick={() => router.push(`/app/inventory/${data.id}`)} />
            </UniversalContextMenu>
          </div>
        )}
        rowHeight={72}
        searchFields={['name', 'code', 'description']}
        onRefetch={refetch}
      />
    </>
  );
}
