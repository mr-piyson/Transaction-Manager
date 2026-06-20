'use client';

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
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc/client';
import { CURRENCIES } from '@/lib/utils';
import type { CurrencyCode } from '@/lib/utils';
import { Field, SectionCard, type OrgData } from '../_shared';

export default function FinancialSettingsPage() {
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
        Could not load organization data.
      </p>
    );
  }

  return <FinancialForm org={org} updateOrg={updateOrg} />;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function FinancialForm({
  org,
  updateOrg,
}: {
  org: OrgData;
  updateOrg: ReturnType<typeof trpc.settings.updateOrg.useMutation>;
}) {
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
      <SectionCard title="Currency & Region">
        <Field label="Default Currency">
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
        <Field label="Fiscal Year Start Month">
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
        <Field label="VAT Registered">
          <div className="flex items-center gap-2">
            <Switch
              checked={form.vatRegistered}
              onCheckedChange={(v) => setForm({ ...form, vatRegistered: v })}
            />
            <span className="text-sm text-muted-foreground">
              {form.vatRegistered ? 'Registered' : 'Not registered'}
            </span>
          </div>
        </Field>
      </SectionCard>

      <SectionCard title="Payment Terms">
        <Field label="Default Payment Terms (days)">
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

      <SectionCard title="Terms & Conditions">
        <Field label="Default Terms & Conditions">
          <Textarea
            value={form.defaultTermsText}
            onChange={(e) =>
              setForm({ ...form, defaultTermsText: e.target.value })
            }
            placeholder="e.g. Payment is due within 30 days. Late payments may incur a 2% monthly fee."
            rows={5}
          />
        </Field>
        <Field label="Invoice Footer">
          <Textarea
            value={form.invoiceFooter}
            onChange={(e) =>
              setForm({ ...form, invoiceFooter: e.target.value })
            }
            placeholder="e.g. Thank you for your business!"
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
          Save Changes
        </Button>
      </div>
    </div>
  );
}
