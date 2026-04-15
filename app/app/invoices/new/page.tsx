'use client';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  BoxIcon,
  ChevronLeft,
  DollarSign,
  Group,
  HandCoinsIcon,
  Package,
  Save,
} from 'lucide-react';
import InvoiceForm from './invoiceForm';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SelectDialog } from '@/components/select-dialog';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { CreateInvoiceLineDialog } from './invoice-line-dialog';

type InvoiceEditorProps = {
  children?: React.ReactNode;
};

export default function InvoiceEditor(props: InvoiceEditorProps) {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const invoiceId = params?.invoiceId as string;
  const invoice = {
    id: invoiceId,
    total: '$0.00',
    paymentStatus: 'Unpaid',
    customer: {
      name: 'Walk-in Customer',
    },
  };

  const utils = trpc.useUtils();

  const handleSelectItem = () => {};

  const amountPaid = 0;
  const balanceDue = 0;
  const progressPercent = 0;
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
            <Button>
              <Save /> Save
            </Button>
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
          <CreateInvoiceLineDialog />

          <Button
            size="sm"
            className="h-8 justify-start hover:bg-warning/50  bg-warning/20 text-warning/80 border-2 border-warning/50 gap-1.5 text-xs flex-1 sm:flex-none"
          >
            <Group size={13} />
            Group
          </Button>
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        <InvoiceForm />
      </main>
      <footer></footer>
    </>
  );
}
