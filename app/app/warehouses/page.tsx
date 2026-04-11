'use client';
import { ListView } from '@/components/list-view';
import { Header } from '../App-Header';
import { Plus, Warehouse } from 'lucide-react';
import { WarehuseCard } from './warehuse-card';

type WarehousePageProps = {
  children?: React.ReactNode;
};

export default function WarehousePage(props: WarehousePageProps) {
  return (
    <>
      <Header title="Warehouses" transparent sticky />
      <ListView
        data={[
          {
            name: 'Warehouse 1',
            description: 'Warehouse 1 description',
          },
          {
            name: 'Warehouse 2',
            description: 'Warehouse 2 description',
          },
        ]}
        cardRenderer={(data) => <WarehuseCard data={data} />}
        useTheme
        emptyIcon={<Warehouse />}
        emptyTitle="No Warehouses"
        emptyDescription="No warehouses found"
        searchFields={[]}
        rowHeight={72}
      />
    </>
  );
}
