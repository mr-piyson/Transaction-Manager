'use client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BoxIcon, ChevronLeft, DollarSign, HandCoinsIcon, Package } from 'lucide-react';
import { PaymentDialog } from './payments-dialog';
import InvoiceForm from './invoiceForm';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SelectDialog } from '@/components/select-dialog';
import { InventoryItemCard } from '../../../suppliers/[supplierId]/supplierItems/SupplierItemCard';
import { CreateGroupDialog } from './create-group-dialog';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/client';
import { useParams, useRouter } from 'next/navigation';

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
  const createLineMutation = trpc.invoiceLines.createInvoiceLine.useMutation({
    onSuccess: () => {
      utils.invoices.getInvoiceById.invalidate({ id: Number(invoiceId) });
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

          <div className="ml-auto shrink-0">
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

          <CreateGroupDialog invoiceId={invoiceId}>
            <Button
              size="sm"
              className="h-8 justify-start hover:bg-warning/50  bg-warning/20 text-warning/80 border-2 border-warning/50 gap-1.5 text-xs flex-1 sm:flex-none"
            >
              <Package size={13} />
              Package
            </Button>
          </CreateGroupDialog>

          <PaymentDialog invoice={invoice as any}>
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs bg-success/10 text-success hover:bg-success/20 ml-auto border-2 border-success/50"
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
