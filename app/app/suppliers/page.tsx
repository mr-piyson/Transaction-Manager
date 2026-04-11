'use client';
import { ListView } from '@/components/list-view';
import { Header } from '../App-Header';
import { SupplierCard } from './supplier-card';
import { Store, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { CreateSupplierDialog } from './create-supplier-dialog';
import { useRouter } from 'next/navigation';

export default function SuppliersPage() {
  const router = useRouter();
  const { data: suppliers, isLoading } = trpc.suppliers.getSuppliers.useQuery();

  return (
    <>
      <Header title="Suppliers">
        <CreateSupplierDialog />
      </Header>
      <ListView
        data={suppliers || []}
        isLoading={isLoading}
        searchFields={['name', 'phone', 'contactName']}
        emptyDescription="No suppliers registered yet."
        emptyTitle="Start by adding your first supplier"
        emptyIcon={<Store className="size-12 opacity-20" />}
        cardRenderer={(data) => (
          <div className="w-full" key={data.id}>
            <SupplierCard 
              data={data} 
              onClick={(d) => router.push(`/app/suppliers/${d.id}`)}
              className="border-b border-border/50 hover:bg-accent/50 cursor-pointer"
            />
          </div>
        )}
      />
    </>
  );
}
