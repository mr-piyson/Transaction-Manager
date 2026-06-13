'use client';

import { Plus, ScrollText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Header } from '@/app/app/App-Header';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';

export default function ContractsPage() {
  const router = useRouter();
  const { data = [], isLoading } = trpc.contracts.list.useQuery({});

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Contracts"
        icon={<ScrollText className="size-5" />}
        rightContent={
          <Button size="sm" className="gap-1.5" onClick={() => router.push('/app/contracts/new')}>
            <Plus className="size-4" />
            New Contract
          </Button>
        }
      />
    </div>
  );
}
