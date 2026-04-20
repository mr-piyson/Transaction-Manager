'use client';

import React, { useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  ShoppingBag,
  Settings,
  Plus,
  Filter,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  EyeOff,
  Eye,
  ShoppingCart,
  Wrench,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AllCommunityModule, ColDef, ModuleRegistry } from 'ag-grid-community';
import { Header } from '../App-Header';
import { trpc } from '@/lib/trpc/client';
import { CreateItemDialog } from './create-item-dialog';
import { formatAmount } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useTableTheme } from '@/hooks/use-table-theme';
ModuleRegistry.registerModules([AllCommunityModule]);

export default function PurchaseServicesPage() {
  const [activeTab, setActiveTab] = useState('purchase');
  const tableTheme = useTableTheme();

  const { data: products, isLoading: isProductsLoading } = trpc.items.getItems.useQuery({
    group: 'products',
  });
  const { data: services, isLoading: isServicesLoading } = trpc.items.getItems.useQuery({
    group: 'services',
  });

  const purchaseColumnDefs = useMemo<ColDef[]>(
    () => [
      { field: 'name', headerName: 'Item Name', flex: 2, checkboxSelection: true },
      {
        field: 'category',
        flex: 1,
        valueFormatter: (p: any) => {
          return p.data.category?.name || 'Other';
        },
      },
      {
        field: 'purchasePrice',
        flex: 1,
        valueFormatter: (p: any) => {
          return formatAmount(p.data.purchasePrice);
        },

        cellRenderer: (props: any) => {
          const [visible, setVisible] = useState(false);

          const toggleVisibility = () => {
            setVisible((prev) => !prev);
          };

          const value = formatAmount(props.value);

          return (
            <div className="flex items-center justify-between px-2 w-full h-full">
              <span>{visible ? value : '••••••••'}</span>

              <ToggleGroupItem
                value="visible"
                onClick={toggleVisibility}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                {visible ? <EyeOff /> : <Eye />}
              </ToggleGroupItem>
            </div>
          );
        },
      },
      {
        field: 'salesPrice',
        flex: 1,
        valueFormatter: (p: any) => {
          return formatAmount(p.data.salesPrice);
        },
      },
    ],
    [],
  );

  const serviceColumnDefs = useMemo(
    () => [
      { field: 'name', headerName: 'Item Name', flex: 2, checkboxSelection: true },
      {
        field: 'category',
        flex: 1,
        valueFormatter: (p: any) => {
          return p.data.category?.name || 'Other';
        },
      },
      {
        field: 'salesPrice',
        headerName: 'Price',
        flex: 1,
        valueFormatter: (p: any) => {
          return formatAmount(p.data.salesPrice);
        },
      },
    ],
    [],
  );

  return (
    <>
      <Header title="Purchases & Services" icon={<ShoppingBag />} />
      {/* Main Grid Section */}
      <Tabs defaultValue="purchase" className="w-full h-full p-4" onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="purchase">
              <ShoppingCart /> Purchased Items
            </TabsTrigger>
            <TabsTrigger value="services">
              <Wrench /> Service Definitions
            </TabsTrigger>
          </TabsList>
        </div>

        <Card className="flex-1  border-none shadow-md overflow-hidden pt-0 ">
          <TabsContent value="purchase" className="">
            <div className=" w-full h-full">
              {/* actions */}
              <div className="flex  p-2">
                <CreateItemDialog>
                  <Button variant="secondary" size="sm">
                    <Plus className="h-4 w-4" />
                    <div className="w-px h-full bg-card mx-1" />
                    Purchase item
                  </Button>
                </CreateItemDialog>
              </div>
              <AgGridReact
                rowData={products}
                loading={isProductsLoading}
                columnDefs={purchaseColumnDefs}
                animateRows={true}
                theme={tableTheme}
                rowSelection="multiple"
              />
            </div>
          </TabsContent>

          <TabsContent value="services" className=" m-0">
            <div className=" w-full h-112.5">
              <AgGridReact
                rowData={services}
                loading={isServicesLoading}
                columnDefs={serviceColumnDefs as any}
                animateRows={true}
                theme={tableTheme}
              />
            </div>
          </TabsContent>
        </Card>
      </Tabs>
    </>
  );
}
