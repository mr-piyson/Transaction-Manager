import { Card } from '@/components/ui/card';
import InvoiceItemCard from './InvoiceItem';
import InvoiceItemCardGroup from './InvoiceItemGroup';
import { Button } from '@/components/ui/button';
import { InvoiceWithDetails } from '@/app/api/invoices/[id]/route';
import { FileText } from 'lucide-react';

type InvoiceFormProps = {
  invoice: InvoiceWithDetails;
};

export default function InvoiceForm({ invoice }: InvoiceFormProps) {
  const lines = invoice.invoiceLines || [];

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <FileText size={24} className="text-muted-foreground" />
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
    <div className="flex flex-col gap-4">
      <InvoiceItemCardGroup
        title="Invoice Items"
        totalQty={lines.reduce((acc, l) => acc + l.quantity, 0)}
      >
        {lines.map((line) => (
          <InvoiceItemCard key={line.id} line={line as any} />
        ))}
      </InvoiceItemCardGroup>
    </div>
  );
}
