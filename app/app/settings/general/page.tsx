'use client';

import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc/client';
import { Field, SectionCard, type OrgData } from '../_shared';

export default function GeneralSettingsPage() {
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

  return <GeneralForm org={org} updateOrg={updateOrg} />;
}

function GeneralForm({
  org,
  updateOrg,
}: {
  org: OrgData;
  updateOrg: ReturnType<typeof trpc.settings.updateOrg.useMutation>;
}) {
  const t = useTranslations();
  const [form, setForm] = useState({
    name: org.name ?? '',
    phone: org.phone ?? '',
    email: org.email ?? '',
    website: org.website ?? '',
    taxId: org.taxId ?? '',
    crNumber: org.crNumber ?? '',
  });

  const hasChanges =
    form.name !== (org.name ?? '') ||
    form.phone !== (org.phone ?? '') ||
    form.email !== (org.email ?? '') ||
    form.website !== (org.website ?? '') ||
    form.taxId !== (org.taxId ?? '') ||
    form.crNumber !== (org.crNumber ?? '');

  const handleSave = () => {
    updateOrg.mutate(form as Parameters<typeof updateOrg.mutate>[0]);
  };

  return (
    <div className="h-full space-y-6">
      <SectionCard
        title={t('settings.general')}
        description={t('settings.organization')}
      >
        <Field label={t('settings.organizationName')}>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label={t('settings.organizationPhone')}>
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </Field>
        <Field label={t('settings.organizationEmail')}>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
        <Field label={t('customers.website')}>
          <Input
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
          />
        </Field>
      </SectionCard>

      <SectionCard title={t('common.details')}>
        <Field label={t('customers.taxId')}>
          <Input
            value={form.taxId}
            onChange={(e) => setForm({ ...form, taxId: e.target.value })}
          />
        </Field>
        <Field label={t('settings.crNumber')}>
          <Input
            value={form.crNumber}
            onChange={(e) => setForm({ ...form, crNumber: e.target.value })}
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
