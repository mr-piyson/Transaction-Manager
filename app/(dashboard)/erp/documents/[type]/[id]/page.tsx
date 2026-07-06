'use client';

import { FileText, Receipt } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { trpc } from '@/lib/trpc/client';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  APPROVED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  SENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  PARTIAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  PAID: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  DISPUTED: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  DELETED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

export default function DocumentDetailPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams<{ type: string; id: string }>();
  const type = params.type;
  const isInvoice = type === 'invoices';

  const STATUS_LABELS: Record<string, string> = {
    DRAFT: t('invoices.draft'),
    SENT: t('invoices.sent'),
    PENDING_APPROVAL: t('invoices.pendingApproval'),
    APPROVED: t('invoices.approved'),
    PARTIAL: t('invoices.partial'),
    PAID: t('invoices.paid'),
    OVERDUE: t('invoices.overdue'),
    CANCELLED: t('invoices.cancelled'),
  };

  const PAYMENT_STATUS_LABELS: Record<string, string> = {
    PENDING: t('common.pending'),
    PARTIAL: t('common.partial'),
    PAID: t('common.paid'),
    OVERDUE: t('common.overdue'),
    CANCELLED: t('common.cancelled'),
  };

  const { data: invoice, isPending } = trpc.invoices.byId.useQuery(
    { id: params.id },
    { enabled: !!params.id },
  );

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center h-full">
        <Empty>
          <EmptyMedia>
            <Receipt className="size-12 text-muted-foreground" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>{t('invoices.documentNotFound')}</EmptyTitle>
            <EmptyDescription>{t('common.noData')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const totalQty = invoice.lines?.reduce(
    (sum: number, l: any) => sum + Number(l.quantity),
    0,
  );

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-lg bg-muted flex items-center justify-center">
            {isInvoice ? (
              <Receipt className="size-6 text-muted-foreground" />
            ) : (
              <FileText className="size-6 text-muted-foreground" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{invoice.serial}</h1>
              <Badge className={STATUS_COLORS[invoice.status] ?? ''}>
                {STATUS_LABELS[invoice.status] ?? invoice.status}
              </Badge>
              {invoice.paymentStatus && isInvoice && (
                <Badge variant="outline">
                  {PAYMENT_STATUS_LABELS[invoice.paymentStatus] ?? invoice.paymentStatus}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {invoice.customer?.name ?? '—'} · {invoice.date ? format(new Date(invoice.date), 'dd MMM yyyy') : '—'}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => router.push(`/erp/documents/${type}`)}>
          {t('common.back')}
        </Button>
      </div>

      <Separator />

      {/* Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{t('invoices.issueDate')}</p>
          <p className="font-medium">
            {invoice.date ? format(new Date(invoice.date), 'dd MMM yyyy') : '—'}
          </p>
        </div>
        {invoice.dueDate && (
          <div>
            <p className="text-sm text-muted-foreground">{t('invoices.dueDate')}</p>
            <p className="font-medium">
              {format(new Date(invoice.dueDate), 'dd MMM yyyy')}
            </p>
          </div>
        )}
        {invoice.customer && (
          <div>
            <p className="text-sm text-muted-foreground">{t('invoices.customer')}</p>
            <p className="font-medium">{invoice.customer.name}</p>
            <p className="text-xs text-muted-foreground">
              {(invoice.customer as any).vatNumber ?? (invoice.customer as any).taxId ?? ''}
            </p>
          </div>
        )}
        {isInvoice && (invoice as any).warehouse && (
          <div>
            <p className="text-sm text-muted-foreground">{t('invoices.warehouse')}</p>
            <p className="font-medium">{(invoice as any).warehouse?.name}</p>
          </div>
        )}
        {invoice.currency && (
          <div>
            <p className="text-sm text-muted-foreground">{t('invoices.currency')}</p>
            <p className="font-medium">{invoice.currency}</p>
          </div>
        )}
        <div>
          <p className="text-sm text-muted-foreground">{t('common.status')}</p>
          <Badge className={STATUS_COLORS[invoice.status] ?? ''}>
            {STATUS_LABELS[invoice.status] ?? invoice.status}
          </Badge>
        </div>
        {(invoice as any).createdBy && (
          <div>
            <p className="text-sm text-muted-foreground">{t('common.createdBy')}</p>
            <p className="font-medium">{(invoice as any).createdBy?.name ?? '—'}</p>
          </div>
        )}
      </div>

      <Separator />

      {/* Line Items */}
      <Card>
        <CardHeader className="px-6 py-4">
          <CardTitle className="text-base">
            {t('invoices.lineItems')}
            <span className="text-muted-foreground font-normal ml-2">
              ({invoice.lines?.length ?? 0} {t('invoices.itemsCount')})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">#</TableHead>
                <TableHead>{t('invoices.item')}</TableHead>
                <TableHead className="text-right">{t('invoices.qty')}</TableHead>
                <TableHead className="text-right">{t('invoices.unitPrice')}</TableHead>
                <TableHead className="text-right">{t('invoices.discount')}</TableHead>
                <TableHead className="text-right">{t('invoices.tax')}</TableHead>
                <TableHead className="text-right pr-6">{t('invoices.total')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lines?.map((line: any, i: number) => (
                <TableRow key={line.id ?? i}>
                  <TableCell className="pl-6 text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>
                    <p className="font-medium">{line.item?.name ?? line.description ?? '—'}</p>
                    {line.item?.sku && (
                      <p className="text-xs text-muted-foreground">{line.item.sku}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(line.quantity).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(line.unitPrice).toFixed(3)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(line.discountAmt).toFixed(3)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(line.taxAmt).toFixed(3)}
                  </TableCell>
                  <TableCell className="text-right pr-6 tabular-nums font-medium">
                    {Number(line.total).toFixed(3)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-72 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('invoices.itemsCount')}</span>
            <span>{invoice.lines?.length ?? 0} items ({Number(totalQty).toFixed(2)} qty)</span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('invoices.subtotal')}</span>
            <span className="tabular-nums">{Number(invoice.subtotal).toFixed(3)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('invoices.discount')}</span>
            <span className="tabular-nums">{Number(invoice.discountTotal).toFixed(3)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('invoices.tax')}</span>
            <span className="tabular-nums">{Number(invoice.taxTotal).toFixed(3)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <span>{t('invoices.total')}</span>
            <span className="tabular-nums">
              {Number(invoice.total).toFixed(3)} {invoice.currency}
            </span>
          </div>
          {isInvoice && Number((invoice as any).amountPaid) > 0 && (
            <>
              <div className="flex justify-between text-sm text-green-600">
                <span>{t('invoices.amountPaid')}</span>
                <span className="tabular-nums">
                  {Number((invoice as any).amountPaid).toFixed(3)} {invoice.currency}
                </span>
              </div>
              <div className="flex justify-between text-sm text-red-600">
                <span>{t('invoices.balanceDue')}</span>
                <span className="tabular-nums">
                  {Number((invoice as any).amountDue).toFixed(3)} {invoice.currency}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <>
          <Separator />
          <div>
            <p className="text-sm text-muted-foreground mb-1">{t('invoices.notes')}</p>
            <p className="whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        </>
      )}
    </div>
  );
}
