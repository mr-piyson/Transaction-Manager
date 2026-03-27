import { Card } from '@/components/ui/card';
import InvoiceItemCard from './InvoiceItem';
import InvoiceItemCardGroup from './InvoiceItemGroup';
import { Button } from '@/components/ui/button';
import { InvoiceWithDetails } from '@/app/api/invoices/[id]/route';

type InvoiceFormProps = {
  invoice: InvoiceWithDetails;
};

export default function InvoiceForm({ invoice }: InvoiceFormProps) {
  const lines = invoice.invoiceLines || [];

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground w-8 h-8"
          >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        </div>
        <h3 className="text-lg font-medium">No items yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">
          Start adding items to this invoice using the 'Add Item' button above.
        </p>
      </div>
    );
  }

  // Group lines by some criteria if needed, or just show them in a default group
  return (
    <div className="flex flex-col gap-4 p-2">
      <InvoiceItemCardGroup title="Invoice Items" totalQty={lines.reduce((acc, l) => acc + l.quantity, 0)}>
        {lines.map((line) => (
          <InvoiceItemCard key={line.id} line={line as any} />
        ))}
      </InvoiceItemCardGroup>
    </div>
  );
}
