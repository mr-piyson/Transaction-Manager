'use client';
import { ListView } from '@/components/list-view';
import { Header } from '../App-Header';
import { Plus, Warehouse } from 'lucide-react';
import { WarehuseCard } from './warehuse-card';
import { trpc } from '@/lib/trpc/client';
import { CreateWarehouseDialog } from './create-warehouse-dialog';

type WarehousePageProps = {
  children?: React.ReactNode;
};

export default function WarehousePage(props: WarehousePageProps) {
  const { data: warehouses, isLoading } = trpc.warehouses.getWarehouses.useQuery();

  return (
    <>
      <Header title="Storage Locations" transparent sticky>
        <CreateWarehouseDialog />
      </Header>
      <ListView
        data={warehouses || []}
        isLoading={isLoading}
        cardRenderer={(data) => <WarehuseCard data={data} />}
        useTheme
        emptyIcon={<Warehouse />}
        emptyTitle="No Warehouses"
        emptyDescription="Define storage locations to start managing your stock."
        searchFields={['name', 'address']}
        rowHeight={72}
      />
    </>
  );
}
