'use client';

import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import {
  ArrowRightLeft,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Pencil,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RichtextEditor } from '@/components/richtext-editor';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc/client';
import { CURRENCIES } from '@/lib/utils';
import type { CurrencyCode } from '@/lib/utils';
import { Field, SectionCard, type OrgData } from '../_shared';
import { useExchangeRateForm } from '@/components/dialogs';

export default function FinancialSettingsPage() {
  const t = useTranslations();
  const { data: rawOrg, isLoading } = trpc.settings.getOrg.useQuery();
  const utils = trpc.useUtils();
  const updateOrg = trpc.settings.updateOrg.useMutation({
    onSuccess: () => utils.settings.getOrg.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const org = rawOrg as OrgData | null | undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!org) {
    return (
      <p className="text-muted-foreground text-sm">
        {t('errors.generic')}
      </p>
    );
  }

  return <FinancialForm org={org} updateOrg={updateOrg} />;
}

function FinancialForm({
  org,
  updateOrg,
}: {
  org: OrgData;
  updateOrg: ReturnType<typeof trpc.settings.updateOrg.useMutation>;
}) {
  const t = useTranslations();
  const MONTHS = Array.from({ length: 12 }, (_, i) => t(`common.monthNamesFull.${i}`));
  const [form, setForm] = useState(() => ({
    currency: org.currency ?? 'BHD',
    paymentTermsDays: org.paymentTermsDays ?? 30,
    vatRegistered: org.vatRegistered ?? false,
    defaultTermsText: org.defaultTermsText ?? '',
    invoiceFooter: org.invoiceFooter ?? '',
    fiscalYearStartMonth: org.fiscalYearStartMonth ?? 1,
  }));

  const hasChanges = useMemo(
    () =>
      form.currency !== (org.currency ?? 'BHD') ||
      form.paymentTermsDays !== (org.paymentTermsDays ?? 30) ||
      form.vatRegistered !== (org.vatRegistered ?? false) ||
      form.defaultTermsText !== (org.defaultTermsText ?? '') ||
      form.invoiceFooter !== (org.invoiceFooter ?? '') ||
      form.fiscalYearStartMonth !== (org.fiscalYearStartMonth ?? 1),
    [form, org],
  );

  const handleSave = useCallback(() => {
    updateOrg.mutate(form as Parameters<typeof updateOrg.mutate>[0]);
  }, [form, updateOrg]);

  return (
    <div className="h-full space-y-6">
      <SectionCard title={t('settings.currency')}>
        <Field label={t('settings.currency')}>
          <Select
            value={form.currency}
            onValueChange={(v) => setForm((prev) => ({ ...prev, currency: v }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
                <SelectItem key={code} value={code}>
                  {CURRENCIES[code].label} ({CURRENCIES[code].symbol})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t('common.date')}>
          <Select
            value={String(form.fiscalYearStartMonth)}
            onValueChange={(v) =>
              setForm((prev) => ({ ...prev, fiscalYearStartMonth: Number(v) }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t('common.active')}>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.vatRegistered}
              onCheckedChange={(v) => setForm((prev) => ({ ...prev, vatRegistered: v }))}
            />
            <span className="text-sm text-muted-foreground">
              {form.vatRegistered ? t('common.active') : t('common.inactive')}
            </span>
          </div>
        </Field>
      </SectionCard>

      <ExchangeRateSection baseCurrency={form.currency as CurrencyCode} />

      <SectionCard title={t('settings.defaultPaymentTerms')}>
        <Field label={t('settings.defaultPaymentTerms')}>
          <Input
            type="number"
            min={0}
            value={form.paymentTermsDays}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, paymentTermsDays: Number(e.target.value) }))
            }
          />
        </Field>
      </SectionCard>

      <SectionCard title={t('invoices.termsAndConditions')}>
        <Field label={t('invoices.termsAndConditions')}>
          <RichtextEditor
            value={form.defaultTermsText}
            onChange={(html) => setForm((prev) => ({ ...prev, defaultTermsText: html }))}
            placeholder={t('settings.paymentTermsPlaceholder')}
            minHeight="150px"
          />
        </Field>
        <Field label={t('invoices.invoice')}>
          <Textarea
            value={form.invoiceFooter}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, invoiceFooter: e.target.value }))
            }
            placeholder={t('settings.termsPlaceholder')}
            rows={3}
          />
        </Field>
      </SectionCard>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || updateOrg.isPending}
        >
          {updateOrg.isPending && (
            <Loader2 className="size-4 mr-2 animate-spin" />
          )}
          {t('settings.saveSettings')}
        </Button>
      </div>
    </div>
  );
}

function ExchangeRateSection({ baseCurrency }: { baseCurrency: CurrencyCode }) {
  const utils = trpc.useUtils();
  const { openCreate, openEdit } = useExchangeRateForm();

  // Sync settings
  const { data: syncSettings, isLoading: syncSettingsLoading } =
    trpc.exchangeRates.getSyncSettings.useQuery();
  const updateSyncSettings = trpc.exchangeRates.updateSyncSettings.useMutation({
    onSuccess: () => {
      utils.exchangeRates.getSyncSettings.invalidate();
      toast.success('Sync settings updated');
    },
    onError: (e) => toast.error(e.message),
  });

  // Sync now
  const syncNow = trpc.exchangeRates.syncNow.useMutation({
    onSuccess: (data) => {
      utils.exchangeRates.list.invalidate();
      utils.exchangeRates.getSyncSettings.invalidate();
      toast.success(`Synced ${data.ratesUpdated} exchange rates`);
    },
    onError: (e) => toast.error(e.message),
  });

  // Exchange rates list
  const { data: rates, isLoading: ratesLoading } = trpc.exchangeRates.list.useQuery();

  const handleSyncEnabledChange = useCallback(
    (enabled: boolean) => {
      updateSyncSettings.mutate({
        enabled,
        frequency: syncSettings?.frequency ?? 'daily',
      });
    },
    [updateSyncSettings, syncSettings]
  );

  const handleFrequencyChange = useCallback(
    (frequency: string) => {
      updateSyncSettings.mutate({
        enabled: syncSettings?.enabled ?? false,
        frequency: frequency as 'daily' | 'weekly' | 'monthly',
      });
    },
    [updateSyncSettings, syncSettings]
  );

  const handleDeleteRate = useCallback(
    async (id: string) => {
      if (!confirm('Are you sure you want to delete this exchange rate?')) return;
      try {
        await utils.client.exchangeRates.delete.mutate({ id });
        utils.exchangeRates.list.invalidate();
        toast.success('Exchange rate deleted');
      } catch (error) {
        toast.error('Failed to delete exchange rate');
      }
    },
    [utils]
  );

  const baseCurrencyInfo = CURRENCIES[baseCurrency];

  return (
    <SectionCard
      title="Exchange Rates"
      description={`Manage exchange rates for ${baseCurrencyInfo.label} (${baseCurrencyInfo.symbol})`}
    >
      {/* Sync Configuration */}
      <div className="rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Auto-Sync</p>
            <p className="text-xs text-muted-foreground">
              Automatically fetch latest rates from ECB (European Central Bank)
            </p>
          </div>
          <div className="flex items-center gap-3">
            {syncSettingsLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Switch
                  checked={syncSettings?.enabled ?? false}
                  onCheckedChange={handleSyncEnabledChange}
                  disabled={updateSyncSettings.isPending}
                />
                {syncSettings?.enabled && (
                  <Select
                    value={syncSettings?.frequency ?? 'daily'}
                    onValueChange={handleFrequencyChange}
                    disabled={updateSyncSettings.isPending}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </>
            )}
          </div>
        </div>

        {syncSettings?.lastSyncedAt && (
          <p className="text-xs text-muted-foreground">
            Last synced: {format(new Date(syncSettings.lastSyncedAt), 'PPpp')}
          </p>
        )}

        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncNow.mutate()}
            disabled={syncNow.isPending}
          >
            {syncNow.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-4" />
            )}
            Sync Now
          </Button>
        </div>
      </div>

      {/* Exchange Rates Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Current Rates</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openCreate()}
          >
            <Plus className="mr-2 size-4" />
            Add Rate
          </Button>
        </div>

        {ratesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !rates || rates.length === 0 ? (
          <div className="rounded-lg border p-8 text-center">
            <ArrowRightLeft className="mx-auto size-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No exchange rates configured yet.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Enable auto-sync or add rates manually.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((rate) => {
                  const fromInfo = CURRENCIES[rate.fromCurrency];
                  const toInfo = CURRENCIES[rate.toCurrency];
                  return (
                    <TableRow key={rate.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{rate.fromCurrency}</span>
                          <span className="text-xs text-muted-foreground">
                            {fromInfo?.label}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{rate.toCurrency}</span>
                          <span className="text-xs text-muted-foreground">
                            {toInfo?.label}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {rate.rate.toFixed(6)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            rate.source === 'manual' ? 'secondary' : 'outline'
                          }
                        >
                          {rate.source ?? 'unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(rate.effectiveDate), 'PP')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEdit(rate)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          {rate.source === 'manual' && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDeleteRate(rate.id)}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
