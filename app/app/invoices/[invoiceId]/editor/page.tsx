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
type InvoiceEditorProps = {
  children?: React.ReactNode;
};

export default function InvoiceEditor(props: InvoiceEditorProps) {
  const { data } = useInventoryItems().getAll;
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
          <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground h-8 w-8">
            <ArrowLeft size={16} />
          </Button>

          <div className="flex flex-col min-w-0">
            <span className="font-semibold leading-tight truncate">
              INV-{String(1).padStart(5, '0')}
            </span>
            <span className="text-xs text-muted-foreground truncate">{'Muntadher'}</span>
          </div>

          <div className="ml-auto shrink-0">
            {true ? (
              <Badge className="bg-success/15 text-success-foreground border-success/30 text-xs">
                Paid
              </Badge>
            ) : 100 > 0 ? (
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
        <Progress value={100} className="bg- w-full px-2 py-2" />

        {/* ── Row 2: Financial Summary ── */}
        <div className="grid grid-cols-3 divide-x divide-border bg-muted/40 text-center py-1 mx-2 mb-2 rounded-md ">
          <div className="flex flex-col px-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</span>
            <span className="text-sm font-semibold tabular-nums">{200}</span>
          </div>
          <div className="flex flex-col px-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Paid</span>
            <span className="text-sm font-semibold tabular-nums text-success-foreground">
              {200}
            </span>
          </div>
          <div className="flex flex-col px-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Due</span>
            <span
              className={cn(
                'text-sm font-semibold tabular-nums',
                100 > 0 ? 'text-destructive' : 'text-success-foreground',
              )}
            >
              {200}
            </span>
          </div>
        </div>

        {/* ── Row 3: Actions ── */}
        <div className="flex items-center gap-1.5 px-2 pb-2">
          <SelectDialog<InventoryItem>
            onSelect={() => {
              toast.success('fdgdfg');
            }}
            data={data}
            searchFields={['code', 'description']}
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
              className="h-8 gap-1.5 text-xs bg-success-foreground/50 hover:bg-success-foreground/30 ml-auto"
              disabled={false}
            >
              <HandCoinsIcon size={13} />
              <span>Pay</span>
            </Button>
          </PaymentDialog>
        </div>
      </header>
      <main className="flex-1 ">
        <InvoiceForm />
      </main>
      <footer></footer>
    </>
  );
}
