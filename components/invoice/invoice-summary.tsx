'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel } from '@/components/ui/field';
import { Calculator, FileText } from 'lucide-react';
import { Invoice } from '@prisma/client';

interface InvoiceSummaryProps {
  invoice: Invoice;
  onUpdate: (updates: Partial<Invoice>) => void;
}

export function InvoiceSummary({ invoice, onUpdate }: InvoiceSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Notes */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            Notes
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Summary */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4 text-primary" />
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {invoice?.subtotal && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">{formatCurrency(invoice?.subtotal)}</span>
              </div>
            )}
            {invoice?.discountTotal && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-mono text-green-600">-{formatCurrency(invoice?.discountTotal)}</span>
              </div>
            )}

            {invoice?.taxTotal && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-mono">{formatCurrency(invoice?.taxTotal)}</span>
              </div>
            )}

            <Separator />
            {invoice.total && (
              <div className="flex justify-between items-center pt-1">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-2xl font-bold text-primary font-mono">{formatCurrency(invoice?.total)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
