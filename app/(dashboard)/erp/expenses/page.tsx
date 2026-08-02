'use client';

import { Search, Wallet } from 'lucide-react';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { alert } from '@/components/Alert-dialog';
import { useExpenseForm, useHardDeleteForm } from '@/components/dialogs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Empty } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDateFormat } from '@/hooks/use-date-format';
import { trpc } from '@/lib/trpc/client';
import { formatCurrency } from '@/lib/utils';

export default function ExpensesPage() {
  const t = useTranslations();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { openCreate, openEdit } = useExpenseForm();
  const { openDialog: openHardDelete } = useHardDeleteForm();
  const { formatDate } = useDateFormat();
  const { data: me } = trpc.auth.me.useQuery();
  const isSuperAdmin = me?.platformRole === 'SUPER_ADMIN';

  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [categoryId, setCategoryId] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [history, setHistory] = React.useState<string[]>([]);

  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const { data: categories } = trpc.expenses.categories.list.useQuery();

  const { data, isLoading, isFetching, refetch } = trpc.expenses.list.useQuery(
    {
      search: debouncedSearch || undefined,
      categoryId: categoryId || undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      limit: 25,
      cursor,
    },
    { placeholderData: (prev) => prev },
  );

  const deleteMutation = trpc.expenses.delete.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate();
      toast.success(t('expenses.expenseDeleted'));
    },
    onError: (e) => toast.error(e.message),
  });

  const handleNext = () => {
    if (data?.nextCursor) {
      setHistory((h) => [...h, cursor ?? '']);
      setCursor(data.nextCursor);
    }
  };

  const handlePrev = () => {
    const prev = history[history.length - 1];
    if (prev === undefined) return;
    setHistory((h) => h.slice(0, -1));
    setCursor(prev === '' ? undefined : prev);
  };

  type ExpenseRow = NonNullable<typeof data>['items'][number];

  const handleEdit = (row: ExpenseRow) => {
    openEdit(
      {
        id: row.id,
        description: row.description,
        amount: Number(row.amount),
        method: row.method,
        date: row.date,
        reference: row.reference ?? undefined,
        notes: row.notes ?? undefined,
        categoryId: row.categoryId,
        purchaseOrderId: row.purchaseOrderId,
      },
      { onSuccess: () => utils.expenses.byId.invalidate({ id: row.id }) },
    );
  };

  const handleDelete = (row: ExpenseRow) => {
    alert.delete({
      title: t('common.confirmDelete'),
      description: row.description,
      confirmText: t('common.delete'),
      onConfirm: async () => {
        await deleteMutation.mutateAsync({ id: row.id });
      },
    });
  };

  const handleHardDelete = (row: ExpenseRow) => {
    openHardDelete(
      { kind: 'expense', id: row.id, title: row.description },
      { onSuccess: () => refetch() },
    );
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="flex h-14 items-center gap-2 px-4 border-b bg-background/95 backdrop-blur-md sticky top-0 z-50 shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Wallet className="size-5 text-muted-foreground shrink-0" />
          <h1 className="text-xl font-semibold truncate">{t('expenses.title')}</h1>
        </div>
        <Button onClick={() => openCreate()}>
          <Wallet className="size-4" />
          {t('expenses.newExpense')}
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder={t('expenses.searchPlaceholder')}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCursor(undefined);
                    setHistory([]);
                  }}
                  className="pl-10"
                />
              </div>
              <div>
                <Label htmlFor="filter-category" className="text-xs text-muted-foreground">
                  {t('expenses.category')}
                </Label>
                <NativeSelect
                  id="filter-category"
                  className="mt-1 w-full"
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setCursor(undefined);
                    setHistory([]);
                  }}
                >
                  <NativeSelectOption value="">{t('expenses.noCategory')}</NativeSelectOption>
                  {(categories ?? []).map((c) => (
                    <NativeSelectOption key={c.id} value={c.id}>
                      {c.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div>
                <Label htmlFor="filter-from" className="text-xs text-muted-foreground">
                  {t('common.from')}
                </Label>
                <Input
                  id="filter-from"
                  type="date"
                  className="mt-1"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setCursor(undefined);
                    setHistory([]);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="filter-to" className="text-xs text-muted-foreground">
                  {t('common.to')}
                </Label>
                <Input
                  id="filter-to"
                  type="date"
                  className="mt-1"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setCursor(undefined);
                    setHistory([]);
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setDebouncedSearch('');
                    setCategoryId('');
                    setDateFrom('');
                    setDateTo('');
                    setCursor(undefined);
                    setHistory([]);
                  }}
                >
                  {t('common.clear')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Spinner className="size-6 text-primary" />
              </div>
            ) : !data || data.items.length === 0 ? (
              <Empty>
                <Wallet className="size-6 text-muted-foreground" />
                <p className="text-lg font-semibold">{t('expenses.noExpenses')}</p>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('expenses.date')}</TableHead>
                    <TableHead>{t('expenses.description')}</TableHead>
                    <TableHead>{t('expenses.category')}</TableHead>
                    <TableHead>{t('expenses.method')}</TableHead>
                    <TableHead>{t('expenses.purchaseOrder')}</TableHead>
                    <TableHead className="text-right">{t('expenses.amount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.items ?? []).map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/erp/expenses/${row.id}`)}
                    >
                      <TableCell className="whitespace-nowrap">{formatDate(row.date)}</TableCell>
                      <TableCell className="max-w-64">
                        <p className="truncate font-medium">{row.description}</p>
                        {row.reference && (
                          <p className="truncate text-xs text-muted-foreground">{row.reference}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.category ? (
                          <Badge variant="secondary">{row.category.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">{t('expenses.noCategory')}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{row.method}</span>
                      </TableCell>
                      <TableCell>
                        {row.purchaseOrder ? (
                          <Badge variant="outline">{row.purchaseOrder.serial}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap">
                        {formatCurrency(Number(row.amount))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {data ? `${data.items.length} ${t('expenses.title').toLowerCase()}` : ' '}
            {isFetching && <Spinner className="ml-2 inline size-3" />}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={history.length === 0}
              onClick={handlePrev}
            >
              {t('common.previous')}
            </Button>
            <Button variant="outline" size="sm" disabled={!data?.nextCursor} onClick={handleNext}>
              {t('common.next')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
