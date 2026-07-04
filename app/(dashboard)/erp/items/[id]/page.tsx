'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Spinner } from '@/components/ui/spinner';
import { ItemPageContent } from '@/components/items/item-page-content';

export default function ItemDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const { data: item, isLoading, isError } = trpc.items.byId.useQuery(
    { id: params.id },
    { enabled: !!params.id },
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <Spinner className="size-8 text-primary" />
        <p className="text-sm text-muted-foreground">Loading item details...</p>
      </div>
    );
  }

  return (
    <ItemPageContent
      item={item}
      defaultMode={searchParams.get('edit') === 'true' ? 'edit' : undefined}
    />
  );
}
