'use client';

import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
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
import { trpc } from '@/lib/trpc/client';
import { CURRENCIES } from '@/lib/utils';
import type { CurrencyCode } from '@/lib/utils';
import { Field, SectionCard, type OrgData } from '../_shared';

export default function FinancialSettingsPage() {
  const t = useTranslations();
  const { data: rawOrg, isLoading } = trpc.settings.getOrg.useQuery();
  const utils = trpc.useUtils();
  const updateOrg = trpc.settings.updateOrg.useMutation({
    onSuccess: () => utils.settings.getOrg.invalidate(),
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
  const [form, setForm] = useState({
    currency: org.currency ?? 'BHD',
    paymentTermsDays: org.paymentTermsDays ?? 30,
    vatRegistered: org.vatRegistered ?? false,
    defaultTermsText: org.defaultTermsText ?? '',
    invoiceFooter: org.invoiceFooter ?? '',
    fiscalYearStartMonth: org.fiscalYearStartMonth ?? 1,
  });

  const hasChanges =
    form.currency !== (org.currency ?? 'BHD') ||
    form.paymentTermsDays !== (org.paymentTermsDays ?? 30) ||
    form.vatRegistered !== (org.vatRegistered ?? false) ||
    form.defaultTermsText !== (org.defaultTermsText ?? '') ||
    form.invoiceFooter !== (org.invoiceFooter ?? '') ||
    form.fiscalYearStartMonth !== (org.fiscalYearStartMonth ?? 1);

  const handleSave = () => {
    updateOrg.mutate(form as Parameters<typeof updateOrg.mutate>[0]);
  };

  return (
    <div className="h-full space-y-6">
      <SectionCard title={t('settings.currency')}>
        <Field label={t('settings.currency')}>
          <Select
            value={form.currency}
            onValueChange={(v) => setForm({ ...form, currency: v })}
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
              setForm({ ...form, fiscalYearStartMonth: Number(v) })
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
              onCheckedChange={(v) => setForm({ ...form, vatRegistered: v })}
            />
            <span className="text-sm text-muted-foreground">
              {form.vatRegistered ? t('common.active') : t('common.inactive')}
            </span>
          </div>
        </Field>
      </SectionCard>

      <SectionCard title={t('settings.defaultPaymentTerms')}>
        <Field label={t('settings.defaultPaymentTerms')}>
          <Input
            type="number"
            min={0}
            value={form.paymentTermsDays}
            onChange={(e) =>
              setForm({ ...form, paymentTermsDays: Number(e.target.value) })
            }
          />
        </Field>
      </SectionCard>

      <SectionCard title={t('invoices.termsAndConditions')}>
        <Field label={t('invoices.termsAndConditions')}>
          <RichtextEditor
            value={form.defaultTermsText}
            onChange={(html) => setForm({ ...form, defaultTermsText: html })}
            placeholder={t('settings.paymentTermsPlaceholder')}
            minHeight="150px"
          />
        </Field>
        <Field label={t('invoices.invoice')}>
          <Textarea
            value={form.invoiceFooter}
            onChange={(e) =>
              setForm({ ...form, invoiceFooter: e.target.value })
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
