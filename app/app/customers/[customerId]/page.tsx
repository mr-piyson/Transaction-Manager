'use client';

import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { formatAmount } from '@/lib/utils';
import { Mail, Phone, MapPin, ExternalLink, User2, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { useTableTheme } from '@/hooks/use-table-theme';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useParams } from 'next/navigation';
import { ListView } from '@/components/list-view';
import { Invoice } from '@prisma/client';
import { Button } from '@/components/ui/button';

export default function ResponsiveCustomerPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const { data: customer, isLoading } = trpc.customers.getCustomerById.useQuery({ id: customerId });
  const tableTheme = useTableTheme();

  // Column Definitions for AG-Grid
  const columnDefs = useMemo(
    () => [
      { field: 'invoiceNumber', headerName: 'Number', flex: 1, minWidth: 120 },
      {
        field: 'invoiceDate',
        headerName: 'Date',
        valueFormatter: (p: any) => new Date(p.value).toLocaleDateString(),
      },
      {
        field: 'total',
        headerName: 'Total Amount',
        // Using your custom formatter logic for BD precision
        valueFormatter: (p: any) => formatAmount(p.value, 'BHD'),
        cellClass: 'font-mono font-bold',
      },
      {
        field: 'status',
        headerName: 'Status',
        cellRenderer: (p: any) => (
          <span
            className={`px-2 py-1 rounded text-xs font-bold ${
              p.value === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {p.value}
          </span>
        ),
      },
      {
        headerName: 'Actions',
        cellRenderer: () => (
          <button className="p-1 hover:text-primary">
            <ExternalLink size={16} />
          </button>
        ),
        width: 100,
        suppressMenu: true,
        sortable: false,
      },
    ],
    [],
  );

  if (isLoading)
    return <div className="p-8 animate-pulse text-muted-foreground">Loading Records...</div>;
  if (!customer) return <div className="p-8">Customer instance not found.</div>;

  return (
    <div className=" h-full gap-4 flex flex-col ">
      <div className="bg-card border rounded-xl p-6 shadow-sm overflow-hidden">
        {/* Header Section: Avatar and Name */}
        <div className="flex flex-row items-start sm:items-center gap-5 pb-6 mb-6 border-b">
          <Avatar className="size-16 md:size-20 rounded-lg shrink-0 border bg-muted">
            <AvatarFallback>
              <User2 className="size-8 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>

          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {customer.name}
            </h1>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
              Customer Profile
            </p>
          </div>
        </div>

        {/* Info Section: Contact Links */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
            Contact Information
          </h3>
          <div className="flex flex-row gap-x-8 gap-y-4 flex-wrap">
            <ContactLink
              icon={<Mail className="size-4" />}
              label="Email Address"
              value={customer.email}
            />
            <ContactLink
              icon={<Phone className="size-4" />}
              label="Phone Number"
              value={customer.phone}
            />
            <ContactLink
              icon={<MapPin className="size-4" />}
              label="Address"
              value={customer.address}
            />
          </div>
        </div>
      </div>

      <div className=" order-2 lg:order-1">
        <Tabs
          defaultValue="invoices"
          className="bg-card w-full border rounded-xl  overflow-hidden shadow-sm"
        >
          <TabsList className=" w-full  flex  justify-start border-0!  bg-muted/50 p-1 border-b">
            <TabsTrigger
              value="invoices"
              className="flex-1  text-sm font-medium  data-selected:shadow-sm rounded-md transition-all"
            >
              Invoices
            </TabsTrigger>
          </TabsList>
          <TabsContent value="invoices">
            <div className="flex flex-row px-4 gap-2">
              <Button size={'sm'} variant={'secondary'}>
                <Plus className="mr-2 h-4 w-4" />
                Invoice
              </Button>
            </div>
            <ListView<Invoice>
              data={[]}
              searchFields={[]}
              cardRenderer={function (data: Record<string, any>): React.ReactNode {
                return (
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{data.name}</p>
                      <p className="text-xs text-muted-foreground">{data.email}</p>
                    </div>
                  </div>
                );
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// DRY Component for Sidebar Links
function ContactLink({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 group">
      <div className="text-muted-foreground group-hover:text-primary transition-colors">
        {React.cloneElement(icon as React.ReactElement)}
      </div>
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase">{label}</p>
        <p className="text-sm font-medium leading-tight">{value}</p>
      </div>
    </div>
  );
}
