'use client';
import { ListView } from '@/components/list-view';
import { useContracts } from '@/hooks/data/use-contracts';
import { Contract } from '@prisma/client';
import { ContractCard } from './contractCard';
import { Button } from '@/components/ui/button';
import { ChevronLeft, LucideFilePenLine, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

type ContractsPageProps = {
  children?: React.ReactNode;
};

export default function ContractsPage(props: ContractsPageProps) {
  const { data, error, isLoading } = useContracts().getAll();
  const router = useRouter();
  return (
    <>
      <header
        className={cn(
          'w-full z-50 transition-all duration-300 print:hidden',
          'sticky top-0',
          'bg-transparent',
          'bg-background/95 backdrop-blur-md supports-backdrop-filter:bg-background/60',
          'border-b border-border',
        )}
      >
        <div className="mx-auto px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Left Section */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center gap-2 truncate">
                <div className="hidden sm:block bg-primary w-1 h-6 rounded-full" />
                <span className="text-muted-foreground">
                  <LucideFilePenLine />
                </span>
                <h1 className="text-xl sm:text-2xl font-semibold capitalize truncate">Contracts</h1>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2">
              <Button>
                <Plus />
                New Contract
              </Button>
            </div>
          </div>
        </div>
      </header>
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
