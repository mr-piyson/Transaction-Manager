'use client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BoxIcon, ChevronLeft, DollarSign, HandCoinsIcon, Package } from 'lucide-react';
import { PaymentDialog } from './payments-dialog';
import InvoiceForm from './invoiceForm';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SelectDialog } from '@/components/select-dialog';
import { InventoryItemCard } from '../../../inventory/inventoryCard';
import { InventoryItem } from '@prisma/client';
import { toast } from 'sonner';
import { useInventoryItems } from '@/hooks/data/use-inventoryItems';
import { useParams, useRouter } from 'next/navigation';
import { useGetInvoiceWithDetails } from '@/hooks/data/use-invoices';
import { useCreateInvoiceLine } from '@/hooks/data/use-invoiceLines';

type InvoiceEditorProps = {
  children?: React.ReactNode;
};

export default function InvoiceEditor(props: InvoiceEditorProps) {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const invoiceId = params?.invoiceId as string;

  const { data: inventoryItems } = useInventoryItems();
  const { data: invoice, isLoading } = useGetInvoiceWithDetails(invoiceId);
  const { mutate: createLine } = useCreateInvoiceLine();

  if (isLoading) return <div className="p-4">Loading...</div>;
  if (!invoice) return <div className="p-4">Invoice not found</div>;

  const handleSelectItem = (item: InventoryItem) => {
    createLine(
      {
        invoiceId: Number(invoiceId),
        inventoryItemId: item.id,
        quantity: 1,
      },
      {
        onSuccess: () => {
          toast.success('Item added to invoice');
        },
        onError: (error) => {
          toast.error('Failed to add item: ' + error.message);
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
        <div className="flex items-center gap-1.5 px-2 pb-2">
          <SelectDialog<InventoryItem>
            onSelect={handleSelectItem}
            data={inventoryItems}
            searchFields={['code', 'name', 'description']}
            cardRenderer={InventoryItemCard}
            rowHeight={72}
          >
            <Button size="sm" className="h-8 gap-1.5 text-xs flex-1 sm:flex-none">
              <BoxIcon size={13} />
              <span>Add Item</span>
            </Button>
          </SelectDialog>

          <Button variant="secondary" size="sm" className="h-8 gap-1.5 text-xs flex-1 sm:flex-none">
            <Package size={13} />
            <span className="hidden xs:inline">Add </span>Package
          </Button>

          <PaymentDialog>
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs bg-success/10 text-success-foreground hover:bg-success/20 ml-auto border border-success/20"
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
