'use client';
import { ListView } from '@/components/list-view';
import { useContracts } from '@/hooks/data/use-contracts';
import { Contract } from '@prisma/client';
import { ContractCard } from './contractCard';
import { Button } from '@/components/ui/button';
import { LucideFilePenLine, Plus } from 'lucide-react';
import { Header } from '@/app/app/App-Header';
import { ContractDialog } from './create-contract-dialog';

export default function ContractsPage() {
  const { data, error, isLoading } = useContracts();
  
  return (
    <>
      <Header
        title="Contracts"
        icon={<LucideFilePenLine />}
        rightContent={
          <ContractDialog>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Contract
            </Button>
          </ContractDialog>
        }
      />
      <ListView<Contract>
        data={data}
        searchFields={['title']}
        cardRenderer={(contract) => (
          <ContractCard data={contract} />
        )}
        rowHeight={80}
        useTheme
      ></ListView>
    </>
  );
}
