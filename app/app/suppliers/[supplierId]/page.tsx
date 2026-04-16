'use client';
import { ListView } from '@/components/list-view';
import { Store, Loader2, Package } from 'lucide-react';
import { SupplierItemCard } from './supplierItems/SupplierItemCard';
import { trpc } from '@/lib/trpc/client';
import { useParams } from 'next/navigation';
import { CreateInventoryItemDialog } from './supplierItems/create-supplierItem-dialog';
import { Header } from '../../App-Header';

export default function SuppliersItemsPage() {
  const params = useParams();
  const supplierId = params?.supplierId as string;

  const { data: supplier, isLoading: loadingSupplier } = trpc.suppliers.getSupplierById.useQuery({
    id: supplierId,
  });

  const {
    data: items,
    isLoading: loadingItems,
    refetch,
  } = trpc.inventory.getInventoryBySupplier.useQuery({
    supplierId: supplierId,
  });

  if (loadingSupplier)
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!supplier)
    return <div className="p-8 text-center text-muted-foreground">Supplier not found</div>;

  return (
    <>
      <Header title={supplier.name} icon={<Store />}>
        <CreateInventoryItemDialog onSuccess={() => refetch()} />
      </Header>

      <ListView
        data={items || []}
        isLoading={loadingItems}
        emptyDescription="This supplier doesn't have any items registered yet."
        emptyTitle="Add items from this supplier"
        emptyIcon={<Package className="size-16 opacity-20" />}
        searchFields={['name', 'code']}
        cardRenderer={(data) => (
          <div className="w-full" key={data.id}>
            <SupplierItemCard data={data} />
          </div>
        )}
      />
    </>
  );
}
