'use client';

import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { trpc } from '@/lib/trpc/client';
import { useDateFormat } from '@/hooks/use-date-format';
import { useTranslations } from 'next-intl';

export default function InvoicePrintPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations();
  const { formatDate } = useDateFormat();

  const {
    data: invoice,
    isLoading,
    isError,
  } = trpc.invoices.byId.useQuery({ id: params.id }, { enabled: !!params.id });

  const { data: org } = trpc.organizations.get.useQuery();

  const [printing, setPrinting] = React.useState(false);

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      QUOTE: t('invoices.quote'),
      INVOICE: t('invoices.invoice'),
      CREDIT_NOTE: t('invoices.creditNote'),
      DELIVERY_NOTE: t('invoices.deliveryNote'),
    };
    return labels[type] ?? type;
  };

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">{t('invoices.documentNotFound')}</p>
      </div>
    );
  }

  const lines = invoice.lines ?? [];
  const hasPayments = (invoice.payments?.length ?? 0) > 0;

  const getPaymentStatusLabel = () => {
    if (invoice.status === 'CANCELLED') return t('common.cancelled');
    if (invoice.status === 'DELETED') return t('common.deleted');
    if (Number(invoice.amountPaid) >= Number(invoice.total)) return t('common.paid');
    if (Number(invoice.amountPaid) > 0)
      return `${t('common.partial')} (${Number(invoice.amountPaid).toFixed(3)} ${invoice.currency})`;
    if (invoice.dueDate && new Date(invoice.dueDate) < new Date()) return t('common.overdue');
    return t('common.unpaid');
  };

  return (
    <div className="min-h-screen bg-muted/30 print:bg-white">
      {/* Toolbar — hidden when printing */}
      <div className="sticky top-0 z-50 flex items-center gap-2 border-b bg-background px-4 py-2 print:hidden">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-5" />
        </Button>
        <span className="text-sm text-muted-foreground">|</span>
        <span className="text-sm font-medium truncate flex-1">
          {invoice.serial} — {getTypeLabel(invoice.type)}
        </span>
        <Button onClick={handlePrint} disabled={printing}>
          {printing ? (
            <Loader2 className="size-4 mr-1 animate-spin" />
          ) : (
            <Printer className="size-4 mr-1" />
          )}
          {t('invoices.printPdf')}
        </Button>
      </div>

      {/* Document — always light theme regardless of system theme */}
      <div
        className="mx-auto max-w-[210mm] bg-white shadow-sm print:shadow-none print:mx-0 print:max-w-none"
        style={{
          colorScheme: 'light',
          color: 'var(--foreground)',
          '--background': '#ffffff',
          '--foreground': '#17141d',
          '--muted': '#dddddd',
          '--muted-foreground': '#606060',
          '--border': '#cccccc',
          '--primary': '#2c2742',
          '--primary-foreground': '#fbfbfb',
          '--destructive': '#a82b2b',
        } as React.CSSProperties}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-8 pt-8 pb-4 border-b print:px-6 print:pt-6">
          <div className="flex items-start gap-4">
            {org?.logo && (
              <img src={org.logo} alt={org.name} className="size-16 object-contain rounded" />
            )}
            <div>
              <h1 className="text-2xl font-bold">{org?.name ?? ''}</h1>
              {org?.crNumber && (
                <p className="text-xs text-muted-foreground">
                  {t('customers.crNumber')}: {org.crNumber}
                </p>
              )}
              {org?.taxId && (
                <p className="text-xs text-muted-foreground">
                  {t('customers.taxId')}: {org.taxId}
                </p>
              )}
              {org?.vatRegistered && (
                <p className="text-xs text-muted-foreground">{t('common.vatRegistered')}</p>
              )}
              {org?.phone && <p className="text-xs text-muted-foreground">{org.phone}</p>}
              {org?.email && <p className="text-xs text-muted-foreground">{org.email}</p>}
              {org?.website && <p className="text-xs text-muted-foreground">{org.website}</p>}
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold uppercase tracking-wide">
              {getTypeLabel(invoice.type)}
            </h2>
            <p className="text-sm font-semibold mt-1">{invoice.serial}</p>
            <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
              <p>
                {t('common.date')}:{' '}
                {invoice.date ? formatDate(invoice.date) : '—'}
              </p>
              {invoice.dueDate && (
                <p>
                  {t('invoices.dueDate')}: {formatDate(invoice.dueDate)}
                </p>
              )}
            </div>
            <div className="mt-2">
              <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded border border-current">
                {getPaymentStatusLabel()}
              </span>
            </div>
          </div>
        </div>

        {/* Customer */}
        <div className="px-8 py-4 border-b print:px-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            {t('invoices.billTo')}
          </h3>
          <p className="font-semibold">
            {invoice.customer?.name ?? (invoice.isWalkIn ? t('invoices.walkInCustomer') : '—')}
          </p>
          {invoice.customer?.email && (
            <p className="text-sm text-muted-foreground">{invoice.customer.email}</p>
          )}
          {invoice.customer?.phone && (
            <p className="text-sm text-muted-foreground">{invoice.customer.phone}</p>
          )}
          {invoice.customer?.taxId && (
            <p className="text-sm text-muted-foreground">
              {t('customers.taxId')}: {invoice.customer.taxId}
            </p>
          )}
        </div>

        {/* Description */}
        {invoice.description && (
          <div className="px-8 py-3 border-b text-sm text-muted-foreground print:px-6">
            {invoice.description}
          </div>
        )}

        {/* Line items */}
        <div className="px-8 py-4 print:px-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground uppercase">
                <th className="text-left py-2 pr-2 w-10">#</th>
                <th className="text-left py-2 pr-2">{t('invoices.item')}</th>
                <th className="text-right py-2 px-2">{t('invoices.qty')}</th>
                <th className="text-right py-2 px-2">{t('invoices.unitPrice')}</th>
                <th className="text-right py-2 px-2">{t('common.discount')}</th>
                <th className="text-right py-2 px-2">{t('common.tax')}</th>
                <th className="text-right py-2 pl-2">{t('common.total')}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line: any, idx: number) => (
                <tr key={line.id} className="border-b last:border-0">
                  <td className="py-2 pr-2 text-muted-foreground align-top">{idx + 1}</td>
                  <td className="py-2 pr-2 align-top">
                    <span className="font-medium">{line.item?.name ?? '—'}</span>
                    {line.item?.sku && (
                      <span className="text-xs text-muted-foreground ml-1">({line.item.sku})</span>
                    )}
                    {line.description && (
                      <p className="text-xs text-muted-foreground">{line.description}</p>
                    )}
                  </td>
                  <td className="py-2 px-2 text-right align-top whitespace-nowrap">
                    {Number(line.quantity).toFixed(3)}
                  </td>
                  <td className="py-2 px-2 text-right align-top whitespace-nowrap">
                    {Number(line.unitPrice).toFixed(3)}
                  </td>
                  <td className="py-2 px-2 text-right align-top whitespace-nowrap">
                    {Number(line.discountAmt) > 0 ? Number(line.discountAmt).toFixed(3) : '—'}
                  </td>
                  <td className="py-2 px-2 text-right align-top whitespace-nowrap">
                    {line.taxRateName ? (
                      <span>
                        {Number(line.taxAmt).toFixed(3)}
                        <span className="text-xs text-muted-foreground ml-0.5">
                          ({line.taxRateName})
                        </span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-2 pl-2 text-right align-top whitespace-nowrap font-medium">
                    {Number(line.total).toFixed(3)}
                  </td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-muted-foreground">
                    {t('invoices.noLineItems')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-8 pb-4 print:px-6">
          <div className="ml-auto w-64 space-y-1 text-sm border-t pt-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('invoices.subtotal')}</span>
              <span>{Number(invoice.subtotal).toFixed(3)}</span>
            </div>
            {Number(invoice.discountTotal) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('common.discount')}</span>
                <span className="text-red-600">-{Number(invoice.discountTotal).toFixed(3)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('common.tax')}</span>
              <span>{Number(invoice.taxTotal).toFixed(3)}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-1">
              <span>{t('common.total')}</span>
              <span>
                {Number(invoice.total).toFixed(3)} {invoice.currency}
              </span>
            </div>
            {Number(invoice.amountPaid) > 0 && (
              <div className="flex justify-between text-green-700 font-medium">
                <span>{t('invoices.amountPaid')}</span>
                <span>-{Number(invoice.amountPaid).toFixed(3)}</span>
              </div>
            )}
            {Number(invoice.amountDue) > 0 && (
              <div className="flex justify-between text-red-600 font-medium">
                <span>{t('invoices.amountDue')}</span>
                <span>
                  {Number(invoice.amountDue).toFixed(3)} {invoice.currency}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Credit notes reference */}
        {invoice.creditNotes && invoice.creditNotes.length > 0 && (
          <div className="px-8 pb-4 print:px-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
              {t('invoices.creditNotes')}
            </h3>
            {invoice.creditNotes.map((cn: any) => (
              <p key={cn.id} className="text-sm">
                {cn.serial} — {Number(cn.total).toFixed(3)} ({cn.status})
              </p>
            ))}
          </div>
        )}

        {/* Parent invoice (for credit notes) */}
        {invoice.parentInvoice && (
          <div className="px-8 pb-4 text-sm text-muted-foreground print:px-6">
            {t('invoices.creditNoteFor', { serial: invoice.parentInvoice.serial })}
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div className="px-8 py-3 border-t print:px-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
              {t('invoices.notes')}
            </h3>
            <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* Terms — always on its own last page */}
        {(invoice.termsText || org?.defaultTermsText) && (
          <div className="px-8 py-3 border-t print:px-6 print:break-before-page">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
              {t('invoices.termsAndConditions')}
            </h3>
            <div
              className="text-sm [&_ol]:list-decimal [&_ul]:list-disc [&_ol,&_ul]:pl-5 [&_li]:mb-0.5"
              dangerouslySetInnerHTML={{ __html: invoice.termsText || org?.defaultTermsText || '' }}
            />
          </div>
        )}

        {/* Payments table (only for received documents) */}
        {hasPayments && invoice.status !== 'CANCELLED' && invoice.status !== 'DELETED' && (
          <div className="px-8 py-3 border-t print:px-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
              {t('invoices.paymentHistory')}
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left py-1 pr-2">{t('common.date')}</th>
                  <th className="text-left py-1 pr-2">{t('common.method')}</th>
                  <th className="text-right py-1 pl-2">{t('common.amount')}</th>
                  <th className="text-left py-1 pl-2">{t('common.reference')}</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((p: any) => (
                  <tr key={p.id}>
                    <td className="py-1 pr-2">{formatDate(p.date)}</td>
                    <td className="py-1 pr-2">{p.method}</td>
                    <td className="py-1 pl-2 text-right">{Number(p.amount).toFixed(3)}</td>
                    <td className="py-1 pl-2 text-muted-foreground">{p.reference ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {(org?.invoiceFooter || org?.stampImage) && (
          <div className="border-t mt-4 px-8 py-3 text-xs text-muted-foreground print:px-6">
            <div className="flex items-start justify-between">
              <p className="whitespace-pre-wrap">{org.invoiceFooter}</p>
              {org.stampImage && (
                <img
                  src={org.stampImage}
                  alt={t('invoices.stamp')}
                  className="size-20 object-contain ml-4 shrink-0"
                />
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          @page {
            margin: 15mm 10mm;
            size: A4;
          }
          body {
            background: white !important;
            color: #17141d !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          tr {
            page-break-inside: avoid;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
        }
      `}</style>
    </div>
  );
}
