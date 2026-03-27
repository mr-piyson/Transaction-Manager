'use client';
import { ListView } from '@/components/list-view';
import { useContracts } from '@/hooks/data/use-contracts';
import { Contract } from '@prisma/client';
import { ContractCard } from './contractCard';
import { Button } from '@/components/ui/button';
import { LucideFilePenLine, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Header } from '@/components/App-Header';

type ContractsPageProps = {
  children?: React.ReactNode;
};

export default function ContractsPage(props: ContractsPageProps) {
  const { data, error, isLoading } = useContracts();
  const router = useRouter();
  return (
    <>
      <Header
        title="Contracts"
        icon={<LucideFilePenLine />}
        rightContent={
          <Button>
            <Plus />
            New Contract
          </Button>
        }
      />
      <ListView<Contract>
        data={data}
        searchFields={[]}
        cardRenderer={(contract) => (
          <>
            <ContractCard data={contract} />;
          </>
        )}
        rowHeight={72}
        useTheme
      ></ListView>
    </>
  );
}
