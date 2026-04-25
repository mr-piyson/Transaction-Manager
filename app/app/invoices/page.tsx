'use client';

import { useMemo, useState } from 'react';
import { FileText, CheckCircle2, Clock, Plus, List, Table2, Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

import { ListView } from '@/components/list-view';
import { useI18n } from '@/i18n/use-i18n';
import { Header } from '@/app/app/App-Header';
import { InvoiceCard } from './invoiceCard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc/client';
import { useSession } from '@/auth/auth-client';
import { AgGridReact } from 'ag-grid-react';
import { useTableTheme } from '@/hooks/use-table-theme';
import { AllCommunityModule, ColDef, ModuleRegistry } from 'ag-grid-community';
import { Invoice } from '@prisma/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty } from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

ModuleRegistry.registerModules([AllCommunityModule]);

export default function InvoicesPage() {
  const title = 'Invoices';
  const Icon = FileText;
  const router = useRouter();
  const cursorMap = new Map<number, string | null>();
  const utils = trpc.useUtils();
  const user = useSession();
  const tableTheme = useTableTheme();
  const { t } = useI18n();
  const { data: list, isLoading, isError, refetch } = trpc.invoices.list.useQuery({});
  const [searchTerm, setSearchTerm] = useState('');

  const clearSearch = () => {
    setSearchTerm('');
  };

  // State for filters
  const [paymentTab, setPaymentTab] = useState('all');

  function onRefetch() {
    refetch();
  }

  const columnDefs = useMemo<ColDef<Invoice>[]>(
    () => [
      {
        field: 'serial',
        headerName: 'Invoice Serial',
      },
      {
        field: 'total',
        headerName: 'Total',
      },
      {
        field: 'createdAt',
        headerName: 'Created At',
      },
    ],
    [],
  );

  if (isError) {
    return (
      <Card className="m-8">
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            <h2 className="text-lg font-semibold mb-2">Error Loading Data</h2>
            <p className="mb-4"></p>
            {onRefetch && (
              <Button variant={'destructive'} onClick={onRefetch}>
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Loading */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center space-y-4 py-10 text-center">
          {/* Icon placeholder */}
          <div className="rounded-full bg-muted p-4">
            <div className="h-6 w-6 animate-pulse rounded-full bg-muted-foreground/30" />
          </div>

          {/* Text */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Invoices</h3>
            <p className="text-sm text-muted-foreground">Invoices</p>
          </div>

          {/* Skeleton list */}
          <div className="w-full max-w-md space-y-2 pt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Action section */}
          <div className="p-4 flex flex-col gap-2">
            <div className="flex flex-row justify-between">
              <div>
                <Button size={'sm'}>
                  <Plus />
                  New
                </Button>
              </div>
              <div>
                <Tabs defaultValue={'2'}>
                  <TabsList>
                    <TabsTrigger value={'1'}>
                      <List />
                      List
                    </TabsTrigger>
                    <TabsTrigger value={'2'}>
                      <Table2 />
                      Table
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
            <div className="flex relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={'Search ...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={clearSearch}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          <AgGridReact
            noRowsOverlayComponent={() => {
              return (
                <Card className="m-8">
                  <CardContent className="p-6">
                    <div className="text-center text-destructive">
                      <h2 className="text-lg font-semibold mb-2">Error Loading Data</h2>
                      <p className="mb-4"></p>
                      {onRefetch && (
                        <Button variant={'destructive'} onClick={onRefetch}>
                          Try Again
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            }}
            loading={isLoading}
            loadingOverlayComponent={() => {
              return (
                <Empty>
                  <Icon className="size-32 opacity-45" />
                  <h3 className="text-lg font-semibold mb-2">Loading ...</h3>
                  <Spinner className="size-10 opacity-25" />
                </Empty>
              );
            }}
            rowData={list as any}
            columnDefs={columnDefs}
            theme={tableTheme}
          />
        </>
      )}
    </>
  );
}
