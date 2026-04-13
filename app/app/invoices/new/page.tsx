'use client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BoxIcon, ChevronLeft, DollarSign, HandCoinsIcon, Package } from 'lucide-react';
import { PaymentDialog } from './payments-dialog';
import InvoiceForm from './invoiceForm';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SelectDialog } from '@/components/select-dialog';
import { InventoryItemCard } from '../../suppliers/[supplierId]/supplierItems/SupplierItemCard';
import { CreateGroupDialog } from './create-group-dialog';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/client';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, WarehouseIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type InvoiceEditorProps = {
  children?: React.ReactNode;
};

export default function InvoiceEditor(props: InvoiceEditorProps) {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const invoiceId = params?.invoiceId as string;

  const utils = trpc.useUtils();
  const { data: inventoryItems } = trpc.inventory.getInventory.useQuery();
  const { data: invoice, isLoading } = trpc.invoices.getInvoiceById.useQuery({
    id: Number(invoiceId),
    include: {
      customer: true,
      invoiceLines: true,
      payments: true,
    },
  });

  const { data: stockItems } = trpc.stockItems.getStockItems.useQuery();
  const { data: warehouses } = trpc.warehouses.getWarehouses.useQuery();

  const createLineMutation = trpc.invoiceLines.createInvoiceLine.useMutation({
    onSuccess: () => {
      utils.invoices.getInvoiceById.invalidate({ id: Number(invoiceId) });
    },
  });

  const updateInvoiceMutation = trpc.invoices.updateInvoice.useMutation({
    onSuccess: () => {
      utils.invoices.getInvoiceById.invalidate({ id: Number(invoiceId) });
      toast.success('Invoice updated');
    },
  });

  if (isLoading) return <div className="p-4">Loading...</div>;
  if (!invoice) return <div className="p-4">Invoice not found</div>;

  const handleSelectItem = (item: any) => {
    createLineMutation.mutate(
      {
        invoiceId: Number(invoiceId),
        inventoryItemId: item.id,
        quantity: 1,
      },
      {
        onError: (error) => {
          toast.error('Failed to add item');
        },
      },
    );
  };

  const handleSelectMasterItem = (item: any) => {
    createLineMutation.mutate(
      {
        invoiceId: Number(invoiceId),
        stockItemId: item.id,
        quantity: 1,
      },
      {
        onError: (error) => {
          toast.error('Failed to add item');
        },
      },
    );
  };

  const toggleComplete = () => {
    if (!invoice.warehouseId && !invoice.isCompleted) {
      // Check if there are products
      const hasProducts = (invoice as any).invoiceLines?.some(
        (l: any) => l.stockItem?.type === 'PRODUCT',
      );
      if (hasProducts) {
        toast.error('Please select a warehouse before completing');
        return;
      }
    }

    updateInvoiceMutation.mutate({
      id: Number(invoiceId),
      data: { isCompleted: !invoice.isCompleted },
    });
  };

  const amountPaid =
    (invoice as any).payments?.reduce((acc: number, p: any) => acc + p.amount, 0) || 0;
  const balanceDue = (invoice.total || 0) - amountPaid;
  const progressPercent = invoice.total ? (amountPaid / invoice.total) * 100 : 0;

  return (
    <>
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

          <div className="flex flex-col min-w-0">
            <span className="font-semibold leading-tight truncate">
              INV-{String(invoice.id).padStart(5, '0')}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {(invoice as any).customer?.name || 'Walk-in Customer'}
            </span>
          </div>

          <div className="ml-auto shrink-0 flex items-center gap-2">
            {!invoice.isCompleted ? (
              <Select
                value={invoice.warehouseId?.toString() || ''}
                onValueChange={(val) =>
                  updateInvoiceMutation.mutate({
                    id: Number(invoiceId),
                    data: { warehouseId: Number(val) },
                  })
                }
              >
                <SelectTrigger className="h-7 text-[10px] w-32 bg-muted/50 border-dashed">
                  <SelectValue placeholder="Warehouse..." />
                </SelectTrigger>
                <SelectContent>
                  {warehouses?.map((w) => (
                    <SelectItem key={w.id} value={w.id.toString()}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground px-2 py-0.5 bg-muted rounded border border-border/50">
                <WarehouseIcon size={10} />
                {warehouses?.find((w) => w.id === invoice.warehouseId)?.name || 'Default'}
              </div>
            )}

            {invoice.paymentStatus === 'Paid' ? (
              <Badge className="bg-success/15 text-success-foreground border-success/30 text-xs">
                Paid
              </Badge>
            ) : amountPaid > 0 ? (
              <Badge variant="secondary" className="text-xs">
                Partial
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Unpaid
              </Badge>
            )}
          </div>
        </div>

        {/* ── Progress bar ── */}
        <Progress value={progressPercent} className="h-1 w-full" />

        {/* ── Row 2: Financial Summary ── */}
        <div className="grid grid-cols-3 divide-x divide-border bg-muted/40 text-center py-1 mx-2 mt-2 mb-2 rounded-md ">
          <div className="flex flex-col px-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</span>
            <span className="text-sm font-semibold tabular-nums">{invoice.total}</span>
          </div>
          <div className="flex flex-col px-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Paid</span>
            <span className="text-sm font-semibold tabular-nums text-success-foreground">
              {amountPaid}
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
              {balanceDue}
            </span>
          </div>
        </div>

        {/* ── Row 3: Actions ── */}
        <div className=" flex items-center gap-1.5 px-2 pb-2">
          <SelectDialog<any>
            onSelect={handleSelectItem}
            data={inventoryItems as any}
            searchFields={['code', 'name', 'description']}
            cardRenderer={InventoryItemCard}
            rowHeight={72}
          >
            <Button
              size="sm"
              className="h-8 justify-start hover:bg-primary/50 bg-primary/10 text-primary border-2 border-primary/50 gap-1.5 text-xs flex-1 sm:flex-none"
            >
              <BoxIcon size={13} />
              <span>Item</span>
            </Button>
          </SelectDialog>

          <SelectDialog<any>
            onSelect={handleSelectMasterItem}
            data={stockItems as any}
            searchFields={['sku', 'name', 'description']}
            cardRenderer={(props) => (
              <div className="flex items-center gap-4 p-4 border-b border-border/50 hover:bg-accent/50 cursor-pointer transition-colors">
                <div className="bg-primary/10 p-2.5 rounded-xl shrink-0">
                  <Package size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{props.data.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1 h-3.5 font-mono uppercase tracking-tight"
                    >
                      {props.data.sku}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">• {props.data.type}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-black text-foreground">
                    {props.data.stockEntries?.reduce(
                      (acc: number, s: any) => acc + s.quantity,
                      0,
                    ) || 0}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                    In Stock
                  </div>
                </div>
              </div>
            )}
            rowHeight={72}
          >
            <Button
              size="sm"
              className="h-8 justify-start hover:bg-accent bg-accent/30 text-foreground border border-border gap-1.5 text-xs flex-1 sm:flex-none px-3"
            >
              <Package size={13} />
              <span>Catalog</span>
            </Button>
          </SelectDialog>

          <CreateGroupDialog invoiceId={invoiceId}>
            <Button
              size="sm"
              className="h-8 justify-start hover:bg-warning/50  bg-warning/20 text-warning/80 border-2 border-warning/50 gap-1.5 text-xs flex-1 sm:flex-none px-3"
            >
              <Package size={13} />
              Package
            </Button>
          </CreateGroupDialog>

          <Button
            size="sm"
            onClick={toggleComplete}
            disabled={updateInvoiceMutation.isPending}
            className={cn(
              'h-8 gap-1.5 text-xs transition-all ml-auto px-4 font-bold shadow-sm',
              invoice.isCompleted
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-dashed border-border/60',
            )}
          >
            <CheckCircle2 size={13} className={invoice.isCompleted ? 'animate-in zoom-in' : ''} />
            <span>{invoice.isCompleted ? 'Finalized' : 'Draft'}</span>
          </Button>

          <PaymentDialog invoice={invoice as any}>
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs bg-success/10 text-success hover:bg-success/20 border-2 border-success/50 px-4"
              disabled={false}
            >
              <HandCoinsIcon size={13} />
              <span>Pay</span>
            </Button>
          </PaymentDialog>
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        <InvoiceForm invoice={invoice as any} />
      </main>
      <footer></footer>
    </>
  );
}
