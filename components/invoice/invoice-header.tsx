'use client';

import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { User, FileText, Hash } from 'lucide-react';
import { Invoice } from '@prisma/client';
import { InvoiceWithDetails } from '@/src/app/api/invoices/[id]/route';

interface InvoiceHeaderProps {
  invoice: InvoiceWithDetails;
}

const getStatusColor = (status?: Invoice['status'] | null): string => {
  // Handle null, undefined, or any unexpected values by defaulting to DRAFT
  const currentStatus = status ?? 'DRAFT';

  switch (currentStatus) {
    case 'PARTIAL':
      return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    case 'PAID':
      return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'CANCELLED':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'APPROVED':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'DRAFT':
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export function InvoiceHeader({ invoice }: InvoiceHeaderProps) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          {/* Invoice Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">
                Invoice Details
              </h2>
              <Badge
                className={getStatusColor(invoice.status)}
                variant="outline"
              >
                {invoice?.status &&
                  invoice?.status.charAt(0).toUpperCase() +
                    invoice?.status.slice(1)}
              </Badge>
            </div>

            <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field>
                <FieldLabel className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" />
                  Invoice Number
                </FieldLabel>
                <Input type="number" value={invoice.id} className="font-mono" />
              </Field>
            </FieldGroup>
          </div>

          {/* Customer Info */}
          <div className="flex-1 lg:max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <User className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-medium text-foreground">Customer</h3>
            </div>

            <FieldGroup className="space-y-3">
              <Field>
                <FieldLabel>Name</FieldLabel>
                <Input value={invoice.customer?.name || ''} />
              </Field>

              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input type="email" value={invoice.customer?.email || ''} />
              </Field>

              <Field>
                <FieldLabel>Address</FieldLabel>
                <Input value={invoice.customer?.address || ''} />
              </Field>
            </FieldGroup>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
