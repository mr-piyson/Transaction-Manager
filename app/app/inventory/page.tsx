'use client';

import { useQuery } from '@tanstack/react-query';
import { Box, Plus, Trash } from 'lucide-react';
import { InventoryItem } from '@prisma/client';

import { ListView } from '@/components/list-view';
import { Button } from '@/components/ui/button';
import { UniversalDialog } from '@/components/dialog';
import { useI18n } from '@/i18n/use-i18n';

// Optional: If you want to drop axios entirely, use Eden for the mutation.
import axios from 'axios';
import { Header } from '@/app/app/App-Header';
import { InventoryItemCard } from './inventoryCard';
import { toast } from 'sonner';
import { alert } from '@/components/Alert-dialog';
import { UniversalContextMenu } from '@/components/context-menu';
import { useRouter } from 'next/navigation';
import { useInventoryItems } from '@/hooks/data/use-inventoryItems';
import { CreateInventoryItemDialog } from './inventoryItem-dialog';

export default function InventoryPage() {
  const { t } = useI18n();
  const router = useRouter();

  const { data: inventory, isLoading, isError, refetch } = useInventoryItems();

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
        rightContent={<CreateInventoryItemDialog />}
      />
      <ListView<InventoryItem>
        emptyTitle={t('inventory.empty_title', 'No inventory items Found')}
        emptyIcon={<Box className="size-16 text-muted-foreground" />}
        emptyDescription={'Create a new inventory item to get started'}
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
              <InventoryItemCard
                data={data}
                onClick={() => router.push(`/app/inventory/${data.id}`)}
              />
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
