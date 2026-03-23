'use client';

import { useState, useMemo } from 'react';
import { Box, FileText, CheckCircle2, Clock } from 'lucide-react';

import { ListView } from '@/components/list-view';
import { useI18n } from '@/i18n/use-i18n';
import { Header } from '@/components/Header';
import { CreateInvoiceDialog } from './create-invoice-dialog';
import { InvoiceCard } from './invoiceCard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InvoiceWithCustomer, useInvoices } from '@/hooks/data/use-invoices';

export default function InvoicesPage() {
  const { t } = useI18n();
  const {
    data: invoices,
    isLoading,
    isError,
    refetch,
  } = useInvoices().getAll();

  // State for filters
  const [paymentTab, setPaymentTab] = useState('all');
  const [processTab, setProcessTab] = useState('all');

  return (
    <>
      <Header
        title={t('common.invoices', 'Invoices')}
        icon={<FileText className="inline" />}
        rightContent={<CreateInvoiceDialog />}
      />

      {!isLoading && (
        <div className="flex flex-col gap-2 px-4 pt-4">
          {/* Main Filter: Payment Status */}
          <Tabs
            defaultValue="overview"
            onValueChange={setPaymentTab}
            className="w-full"
          >
            <TabsList className="w-full">
              <TabsTrigger
                className="group-data-[variant=default]/tabs-list:data-active:bg-primary!"
                value="all"
              >
                All
              </TabsTrigger>

              <TabsTrigger
                className="group-data-[variant=default]/tabs-list:data-active:bg-destructive-foreground!"
                value="Unpaid"
              >
                Unpaid
              </TabsTrigger>

              <TabsTrigger
                className="group-data-[variant=default]/tabs-list:data-active:bg-warning!"
                value="Partial"
              >
                Partial
              </TabsTrigger>

              <TabsTrigger
                className="group-data-[variant=default]/tabs-list:data-active:bg-success!"
                value="Paid"
              >
                Paid
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Secondary Filter: Work Completion (Mobile Optimized) */}
          <Tabs
            defaultValue="all"
            onValueChange={setProcessTab}
            className="w-full"
          >
            <TabsList className="w-full grid grid-cols-3 bg-muted/50 p-1 h-9">
              <TabsTrigger value="all" className="text-xs">
                Any Work
              </TabsTrigger>
              <TabsTrigger
                value="pending"
                className="text-xs flex items-center gap-1"
              >
                <Clock className="size-3" /> Pending
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="text-xs flex items-center gap-1"
              >
                <CheckCircle2 className="size-3" /> Done
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      <ListView<InvoiceWithCustomer>
        emptyTitle={t('invoices.empty_title', 'No invoices found')}
        emptyIcon={<FileText className="size-16 text-muted-foreground" />}
        emptyDescription={'No invoices to show'}
        data={invoices}
        isLoading={isLoading}
        isError={isError}
        itemName="invoices items"
        useTheme={true}
        cardRenderer={(data) => <InvoiceCard data={data} />}
        rowHeight={72}
        searchFields={[]}
        onRefetch={refetch}
        externalFilter={(item) =>
          paymentTab === 'all' ? true : paymentTab === item.paymentStatus
        }
      />
    </>
  );
}
