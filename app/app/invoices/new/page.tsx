'use client';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  BoxIcon,
  ChevronLeft,
  DollarSign,
  Group,
  HandCoinsIcon,
  MapPinIcon,
  Package,
  Plus,
  Save,
  User,
} from 'lucide-react';
import InvoiceForm from './invoiceForm';
import { cn, formatAmount } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { InvoiceLineDialog, ItemSelectionDialog } from './invoice-line-dialog';
import { useState } from 'react';
import { toast } from 'sonner';
import { SelectionDialog } from '@/components/select-dialog-v2';
import { Customer_List_Item } from '../../customers/customer-item-list';
import { ButtonGroup } from '@/components/ui/button-group';
import { CreateCustomerDialog } from '../../customers/create-customer-dialog';
import { SelectDialog } from '@/components/select-dialog';

export default function InvoiceEditor() {
  const router = useRouter();
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [lines, setLines] = useState<any[]>([]);

  const { data: customers } = trpc.customers.getCustomers.useQuery();
  const { data: items } = trpc.items.getItems.useQuery({ group: 'all' });

  const createInvoice = trpc.invoices.createFullInvoice.useMutation({
    onSuccess: (data) => {
      toast.success('Invoice created successfully');
      router.push(`/app/invoices/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSave = (isCompleted: boolean = false) => {
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }
    if (lines.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    createInvoice.mutate({
      customerId: selectedCustomer.id,
      lines: lines.map((l) => ({
        id: l.id,
        parentId: l.parentId,
        isGroup: l.isGroup,
        itemId: l.itemId,
        description: l.description,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        purchasePrice: Number(l.purchasePrice || 0),
      })),
      isCompleted,
    });
  };

  const total = lines.reduce((acc, l) => acc + (l.total || 0), 0);
  const amountPaid = 0;
  const balanceDue = total;
  const progressPercent = 0;

  const handleSelectItem = (item: any) => {
    const newLine = {
      id: Math.random().toString(36).substr(2, 9),
      itemId: item.id,
      inventoryItemId: item.id,
      description: item.name,
      quantity: 1,
      unitPrice: Number(item.salesPrice) / 1000,
      purchasePrice: Number(item.purchasePrice) / 1000,
      total: Number(item.salesPrice) / 1000,
      itemRef: item,
    };
    setLines((prev) => [...prev, newLine]);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header
        className={cn(
          'w-full z-50 transition-all duration-300 print:hidden',
          'sticky top-0',
          'bg-background/95 backdrop-blur-md supports-backdrop-filter:bg-background/60',
          'border-b border-border',
        )}
      >
        {/* ── Row 1: Back + Invoice ID + Status ── */}
        <div className="flex items-center gap-2 px-2 pt-2 pb-1">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground h-8 w-8"
            onClick={() => router.push(`/app/invoices`)}
          >
            <ArrowLeft size={16} />
          </Button>

          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-semibold leading-tight truncate">New Invoice</span>
            <span className="text-xs text-muted-foreground truncate">Draft</span>
          </div>

          <div className="flex items-center gap-2 pr-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => handleSave(false)}
              disabled={createInvoice.isPending}
            >
              <Save size={14} className="text-muted-foreground" />
              Save Draft
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs shadow-md shadow-primary/20"
              onClick={() => handleSave(true)}
              disabled={createInvoice.isPending}
            >
              <DollarSign size={14} />
              Complete
            </Button>
          </div>
        </div>

        {/* ── Progress bar ── */}
        <Progress value={progressPercent} className="h-1 w-full" />

        {/* ── Row 2: Customer Selection ── */}
        <div className="flex flex-row px-2 py-2 border-b border-border/50 overflow-hidden">
          <ButtonGroup className="w-full">
            <SelectDialog<any>
              title="Select Customer"
              data={customers}
              onSelect={setSelectedCustomer}
              searchFields={['name', 'phone', 'address']}
              cardRenderer={Customer_List_Item}
              rowHeight={72}
              itemName="Customers"
            >
              <Button
                variant="outline"
                className={cn(
                  'flex-1 justify-start text-left font-normal h-12',
                  !selectedCustomer && 'text-muted-foreground',
                )}
              >
                <User className="mr-2 size-6 text-muted-foreground shrink-0" />

                <div className="flex flex-col items-start overflow-hidden">
                  {selectedCustomer ? (
                    <>
                      <span className="font-medium truncate">{selectedCustomer.name}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {selectedCustomer.phone || 'No phone'}
                      </span>
                    </>
                  ) : (
                    <span>Select a customer</span>
                  )}
                </div>
                {selectedCustomer && (
                  <span className="flex items-center justify-end gap-1 flex-1 text-xs text-muted-foreground truncate">
                    <MapPinIcon size={12} /> {selectedCustomer.address || 'No address'}
                  </span>
                )}
              </Button>
            </SelectDialog>
            <CreateCustomerDialog
              onSuccess={(data) => {
                setSelectedCustomer(data);
              }}
            >
              <Button variant="outline" className="w-10 h-12">
                <Plus />
              </Button>
            </CreateCustomerDialog>
          </ButtonGroup>
        </div>

        {/* ── Row 3: Financial Summary ── */}
        <div className="grid grid-cols-3 divide-x divide-border bg-muted/40 text-center py-1 mx-2 mt-2 mb-2 rounded-md ">
          <div className="flex flex-col px-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</span>
            <span className="text-sm font-semibold tabular-nums">{formatAmount(total)}</span>
          </div>
          <div className="flex flex-col px-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Paid</span>
            <span className="text-sm font-semibold tabular-nums text-success-foreground">
              {formatAmount(amountPaid)}
            </span>
          </div>
          <div className="flex flex-col px-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Due</span>
            <span
              className={cn(
                'text-sm font-semibold tabular-nums',
                balanceDue > 0 ? 'text-destructive' : 'text-success-foreground',
              )}
            >
              {formatAmount(balanceDue)}
            </span>
          </div>
        </div>

        {/* ── Row 4: Actions ── */}
        <div className=" flex items-center gap-1.5 px-2 pb-2">
          <ButtonGroup className="w-full">
            <InvoiceLineDialog
              onSuccess={(newLine) => {
                setLines((prev) => [...prev, newLine]);
              }}
            >
              <Button
                variant="secondary"
                size={'sm'}
                className="h-8 border border-secondary gap-1.5 text-xs  "
              >
                <BoxIcon size={13} />
                Item
              </Button>
            </InvoiceLineDialog>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs  "
              onClick={() => {
                const newGroup = {
                  id: Math.random().toString(36).substr(2, 9),
                  isGroup: true,
                  description: 'New Group',
                  total: 0,
                };
                setLines((prev) => [...prev, newGroup]);
              }}
            >
              <Group size={13} />
              Group
            </Button>
          </ButtonGroup>
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        <InvoiceForm lines={lines} setLines={setLines} items={items || []} />
      </main>
    </div>
  );
}
