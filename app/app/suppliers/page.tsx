'use client';
import { ListView } from '@/components/list-view';
import { Header } from '../App-Header';
import { SupplierCard } from './supplier-card';
import { Store } from 'lucide-react';

type SuppliersPageProps = {
  children?: React.ReactNode;
};

export default function SuppliersPage(props: SuppliersPageProps) {
  return (
    <>
      <Header title="Suppliers" />
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
            <SupplierCard data={data} />
          </div>
        )}
      />
    </>
  );
}
