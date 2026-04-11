'use client';
import { ListView } from '@/components/list-view';
import { ArrowLeftIcon, Store } from 'lucide-react';
import { SupplierItemCard } from './supplier-card';
import { Button } from '@/components/ui/button';
import { SupplierCard } from '../supplier-card';

type SuppliersItemsPageProps = {
  children?: React.ReactNode;
};

export default function SuppliersItemsPage(props: SuppliersItemsPageProps) {
  return (
    <>
      <header className="flex p-2 items-center">
        <Button variant={'ghost'}>
          <ArrowLeftIcon />
        </Button>
        <SupplierCard
          className="p-0 h-12 hover:bg-transparent"
          data={{ name: 'Supplier 1', description: 'Supplier 1 description' }}
        />
      </header>
      <ListView
        data={[
          {
            id: '1',
            name: 'Supplier 1',
            description: 'Supplier 1 description',
          },
          {
            id: '2',
            name: 'Supplier 2',
            description: 'Supplier 2 description',
          },
        ]}
        emptyDescription="No suppliers found"
        emptyTitle="No suppliers found"
        emptyIcon={<Store />}
        searchFields={[]}
        cardRenderer={(data) => (
          <div className="w-full" key={data.id}>
            <SupplierItemCard data={data} />
          </div>
        )}
      />
    </>
  );
}
