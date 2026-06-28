'use client';

import { useTranslations } from 'next-intl';
import { Handshake, User2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { ListView } from '@/components/list-view';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useIsMobile } from '@/hooks/use-mobile';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import { useContractForm } from '@/components/dialogs';
import { Header } from '../App-Header';
import { ContractListItem } from '@/components/contracts/contract-list-item';
import { NotificationBell } from '../NotificationBell';

const contractsSegment = 'contracts';

export default function ContractsLayout({ children }: { children?: React.ReactNode }) {
  const t = useTranslations();
  const { openCreate } = useContractForm();
  const { data, isPending } = trpc.contracts.list.useQuery({});
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const activeItem = pathname.split('/')[3];
  const isListView = pathname === `/app/${contractsSegment}`;

  const renderCard = useCallback(
    (item: any) => (
      <Link
        href={`/app/${contractsSegment}/${item.id}`}
        scroll={false}
        draggable={false}
        className="block w-full h-full"
      >
        <ContractListItem
          data={item}
          className={cn(
            'hover:bg-muted/40 border border-transparent',
            activeItem === item.id ? 'border-primary border bg-primary/10' : '',
          )}
        />
      </Link>
    ),
    [activeItem],
  );

  const contracts = Array.isArray(data) ? data : (data?.data ?? []);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        title={t('contracts.title')}
        rightContent={<NotificationBell />}
        icon={<Handshake className="size-5" />}
        onCreate={() => openCreate()}
        createLabel={t('contracts.createContract')}
      />
      <div className="flex-1 min-h-0 w-full">
        <ResizablePanelGroup className="h-full">
          {(isListView || !isMobile) && (
            <ResizablePanel
              minSize={20}
              defaultSize={30}
              className={cn('h-full', !isListView ? 'hidden md:block' : 'block')}
            >
              <aside className="flex h-full flex-col overflow-hidden border-r">
                <div className="flex-1 overflow-y-auto">
                  <ListView
                    data={contracts}
                    isLoading={isPending}
                    className="h-full"
                    useTheme
                    searchFields={['serial'] as any}
                    rowHeight={73}
                    emptyTitle={t('contracts.noContracts')}
                    emptyDescription={t('contracts.createContract')}
                    emptyIcon={<User2 className="size-20 text-muted-foreground" />}
                    cardRenderer={renderCard}
                  />
                </div>
              </aside>
            </ResizablePanel>
          )}

          <ResizableHandle className={cn('hidden md:flex', !isListView && 'hidden md:flex')} />

          {(!isListView || !isMobile) && (
            <ResizablePanel
              defaultSize={70}
              className={cn('h-full w-full', isListView ? 'hidden md:block' : 'flex flex-col')}
            >
              {children}
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
