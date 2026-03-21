'use client';

import { Box, FileText } from 'lucide-react';

import { ListView } from '@/components/list-view';
import { useI18n } from '@/hooks/use-i18n';

// Optional: If you want to drop axios entirely, use Eden for the mutation.
import { Header } from '@/components/Header';
import { CreateInvoiceDialog } from './create-invoice-dialog';
import { InvoiceCard } from './invoiceCard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InvoiceWithCustomer, useInvoices } from '@/hooks/data/use-invoices';
import { Invoice } from '@prisma/client';

export default function invoicesPage() {
  const { t } = useI18n();

  const { data: invoices, isLoading, isError, refetch } = useInvoices().getAll();

  return (
    <>
      <Header title={'Invoices'} icon={<FileText className="inline" />} rightContent={<CreateInvoiceDialog />} />
      {!isLoading && (
        <Tabs defaultValue="overview" className="w-full px-4 pt-4">
          <TabsList className="w-full">
            <TabsTrigger value="overview">All</TabsTrigger>
            <TabsTrigger value="analytics">Pending</TabsTrigger>
            <TabsTrigger value="settings">PARTIAL</TabsTrigger>
            <TabsTrigger value="reports">Paid</TabsTrigger>
          </TabsList>
        </Tabs>
      )}
      <ListView<InvoiceWithCustomer>
        emptyTitle={t('invoices.empty_title', 'No invoices items Found')}
        emptyIcon={<Box className="size-16 text-muted-foreground" />}
        emptyDescription={t('invoices.empty_description') || 'Create a new invoices item to get started'}
        data={invoices}
        isLoading={isLoading}
        isError={isError}
        itemName="invoices items"
        useTheme={true}
        cardRenderer={(data) => (
          <>
            <InvoiceCard data={data} />
          </>
        )}
        rowHeight={72}
        searchFields={[]}
        onRefetch={refetch}
      />
    </>
  );
}
