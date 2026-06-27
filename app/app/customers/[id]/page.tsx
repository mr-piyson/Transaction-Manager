'use client';

import { ArrowLeft, Edit, Loader2, Trash, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { alert } from '@/components/Alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { useCustomerForm } from '@/components/dialogs';
import { trpc } from '@/lib/trpc/client';
import { format } from 'date-fns';

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { openEdit } = useCustomerForm();
  const t = useTranslations();

  const { data: customer, isLoading, isError, error, refetch } = trpc.customers.byId.useQuery(
    { id: params.id },
    { enabled: !!params.id },
  );

  const { data: creditData } = trpc.customers.creditBalance.useQuery(
    { id: params.id },
    { enabled: !!params.id },
  );

  const deleteMutation = trpc.customers.delete.useMutation({
    onSuccess: () => {
      utils.customers.list.invalidate();
      toast.success(t('customers.customerDeleted'));
      router.push('/app/customers');
    },
    onError: (e) => toast.error(e.message),
  });

  const isPending = deleteMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  if (isError || !customer) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users className="size-6" />
            </EmptyMedia>
            <EmptyTitle>{isError ? t('common.failedToLoad') : t('common.notFound')}</EmptyTitle>
            <EmptyDescription>
              {error?.message ?? t('customers.doesNotExist')}
            </EmptyDescription>
          </EmptyHeader>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/app/customers')}>
              <ArrowLeft className="size-4 mr-1" /> {t('common.back')}
            </Button>
            {isError && <Button onClick={() => refetch()}>{t('common.retry')}</Button>}
          </div>
        </Empty>
      </div>
    );
  }

  const handleEdit = () => {
    openEdit(
      {
        id: customer.id,
        name: customer.name,
        phone: customer.phone ?? undefined,
        email: customer.email ?? undefined,
        taxId: customer.taxId ?? undefined,
        notes: customer.notes ?? undefined,
        creditLimit: Number(customer.creditLimit),
      },
      { onSuccess: () => utils.customers.byId.invalidate({ id: customer.id }) },
    );
  };

  const handleDelete = () => {
    alert.delete({
      title: t('common.confirmDelete'),
      description: t('customers.deactivateRestoreConfirm'),
      confirmText: t('common.delete'),
      onConfirm: async () => {
        await deleteMutation.mutateAsync({ id: customer.id });
      },
    });
  };

  const outstandingBalance = Number(creditData?.outstandingBalance ?? 0);
  const creditLimit = Number(customer.creditLimit);
  const creditUtilization = creditLimit > 0 ? (outstandingBalance / creditLimit) * 100 : 0;

  return (
    <div className="flex flex-col h-screen">
      <header className="flex h-14 items-center gap-2 px-2 border-b bg-background/95 backdrop-blur-md sticky top-0 z-50 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.push('/app/customers')}>
          <ArrowLeft className="size-5" />
        </Button>
        <span className="text-muted-foreground">|</span>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Users className="size-5 text-muted-foreground shrink-0" />
          <h1 className="text-xl font-semibold truncate">{customer.name}</h1>
          {!customer.isActive && (
            <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
              {t('common.inactive')}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleEdit}>
            <Edit className="size-4" />
            {t('common.edit')}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash className="size-4" />}
            {t('common.delete')}
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">{t('customers.contact')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{customer.phone ?? '—'}</p>
              <p className="text-xs text-muted-foreground">{customer.email ?? '—'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">{t('customers.codeAndTax')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{customer.code ?? '—'}</p>
              <p className="text-xs text-muted-foreground">
                {t('common.tax')}: {customer.taxId ?? '—'} · {t('customers.crNumber')}: {customer.crNumber ?? '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">{t('customers.creditTerms')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{t('customers.creditTermsDays', { days: customer.creditTermsDays })}</p>
              <p className="text-xs text-muted-foreground">
                {t('customers.limit')}: {Number(customer.creditLimit).toFixed(3)} {customer.currencyCode ?? ''}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">{t('customers.priceList')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{customer.priceList?.name ?? '—'}</p>
              <p className="text-xs text-muted-foreground">
                {t('common.currency')}: {customer.currencyCode ?? t('customers.orgDefault')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Credit utilization */}
        {creditData && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{t('customers.creditBalance')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div>
                  <p className="text-2xl font-bold">
                    {outstandingBalance.toFixed(3)} {customer.currencyCode ?? ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('customers.outstandingInvoices', { count: creditData.openInvoiceCount })}
                  </p>
                </div>
                {creditLimit > 0 && (
                  <div className="flex-1 max-w-xs">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{t('customers.creditUtilization')}</span>
                      <span className={creditUtilization > 80 ? 'text-destructive font-medium' : creditUtilization > 50 ? 'text-yellow-600 font-medium' : ''}>
                        {creditUtilization.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          creditUtilization > 80 ? 'bg-destructive' : creditUtilization > 50 ? 'bg-yellow-500' : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(creditUtilization, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('customers.limit')}: {creditLimit.toFixed(3)} {customer.currencyCode ?? ''}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Related records */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card
            className="cursor-pointer hover:bg-muted/40 transition-colors"
            onClick={() => router.push(`/app/invoices?customerId=${customer.id}`)}
          >
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">{t('layout.invoices')}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <span className="text-2xl font-bold">{customer._count?.invoices ?? 0}</span>
              <span className="text-sm text-muted-foreground">{t('customers.activeInvoices')}</span>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:bg-muted/40 transition-colors"
            onClick={() => router.push(`/app/contracts?customerId=${customer.id}`)}
          >
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">{t('layout.contracts')}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <span className="text-2xl font-bold">{customer._count?.contracts ?? 0}</span>
              <span className="text-sm text-muted-foreground">{t('customers.activeContracts')}</span>
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        {customer.notes && (
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">{t('common.notes')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Meta info */}
        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pb-2">
          <span>{t('customers.created')} {customer.createdAt ? format(new Date(customer.createdAt), 'dd MMM yyyy HH:mm') : '—'}</span>
          <span>{t('customers.updated')} {customer.updatedAt ? format(new Date(customer.updatedAt), 'dd MMM yyyy HH:mm') : '—'}</span>
        </div>
      </div>


    </div>
  );
}
