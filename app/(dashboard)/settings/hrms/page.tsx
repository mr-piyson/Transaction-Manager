'use client';

import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc/client';

const HRMS_SETTING_KEYS = [
  'hrms.probationPeriodMonths',
  'hrms.workingDaysPerWeek',
  'hrms.overtimeRateMultiplier',
  'hrms.leaveCarryForwardMaxDays',
  'hrms.attendanceGracePeriodMinutes',
  'hrms.autoApproveLeave',
] as const;

type HrmsSettings = {
  probationPeriodMonths: number;
  workingDaysPerWeek: number;
  overtimeRateMultiplier: number;
  leaveCarryForwardMaxDays: number;
  attendanceGracePeriodMinutes: number;
  autoApproveLeave: boolean;
};

const DEFAULTS: HrmsSettings = {
  probationPeriodMonths: 3,
  workingDaysPerWeek: 5,
  overtimeRateMultiplier: 1.5,
  leaveCarryForwardMaxDays: 15,
  attendanceGracePeriodMinutes: 15,
  autoApproveLeave: false,
};

function toKey(name: string) {
  return `hrms.${name}`;
}

function fromSettings(settings: Record<string, string> | undefined): HrmsSettings {
  const s = settings ?? {};
  return {
    probationPeriodMonths: Number(s[toKey('probationPeriodMonths')] ?? DEFAULTS.probationPeriodMonths),
    workingDaysPerWeek: Number(s[toKey('workingDaysPerWeek')] ?? DEFAULTS.workingDaysPerWeek),
    overtimeRateMultiplier: Number(s[toKey('overtimeRateMultiplier')] ?? DEFAULTS.overtimeRateMultiplier),
    leaveCarryForwardMaxDays: Number(s[toKey('leaveCarryForwardMaxDays')] ?? DEFAULTS.leaveCarryForwardMaxDays),
    attendanceGracePeriodMinutes: Number(s[toKey('attendanceGracePeriodMinutes')] ?? DEFAULTS.attendanceGracePeriodMinutes),
    autoApproveLeave: s[toKey('autoApproveLeave')] === 'true',
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export default function HrmsSettingsPage() {
  const t = useTranslations();
  const { data: rawSettings, isLoading } = trpc.settings.getSettings.useQuery();
  const utils = trpc.useUtils();
  const updateSetting = trpc.settings.updateSetting.useMutation({
    onSuccess: () => utils.settings.getSettings.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const settings = useMemo(() => fromSettings(rawSettings), [rawSettings]);
  const [form, setForm] = useState<HrmsSettings>(DEFAULTS);

  useEffect(() => {
    if (rawSettings) {
      setForm(fromSettings(rawSettings));
    }
  }, [rawSettings]);

  const hasChanges = useMemo(
    () =>
      form.probationPeriodMonths !== settings.probationPeriodMonths ||
      form.workingDaysPerWeek !== settings.workingDaysPerWeek ||
      form.overtimeRateMultiplier !== settings.overtimeRateMultiplier ||
      form.leaveCarryForwardMaxDays !== settings.leaveCarryForwardMaxDays ||
      form.attendanceGracePeriodMinutes !== settings.attendanceGracePeriodMinutes ||
      form.autoApproveLeave !== settings.autoApproveLeave,
    [form, settings],
  );

  const handleSave = useCallback(() => {
    const entries: { key: string; value: string }[] = [
      { key: toKey('probationPeriodMonths'), value: String(form.probationPeriodMonths) },
      { key: toKey('workingDaysPerWeek'), value: String(form.workingDaysPerWeek) },
      { key: toKey('overtimeRateMultiplier'), value: String(form.overtimeRateMultiplier) },
      { key: toKey('leaveCarryForwardMaxDays'), value: String(form.leaveCarryForwardMaxDays) },
      { key: toKey('attendanceGracePeriodMinutes'), value: String(form.attendanceGracePeriodMinutes) },
      { key: toKey('autoApproveLeave'), value: String(form.autoApproveLeave) },
    ];
    Promise.all(entries.map((e) => updateSetting.mutateAsync(e)))
      .then(() => toast.success(t('settings.saved')))
      .catch(() => {});
  }, [form, updateSetting, t]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full space-y-6">
      <SectionCard
        title={t('settings.hrms.employment')}
        description={t('settings.hrms.employmentDesc')}
      >
        <Field label={t('settings.hrms.probationPeriod')}>
          <Input
            type="number"
            min={1}
            max={12}
            value={form.probationPeriodMonths}
            onChange={(e) => setForm((p) => ({ ...p, probationPeriodMonths: Number(e.target.value) }))}
          />
        </Field>
        <Field label={t('settings.hrms.workingDaysPerWeek')}>
          <Input
            type="number"
            min={1}
            max={7}
            value={form.workingDaysPerWeek}
            onChange={(e) => setForm((p) => ({ ...p, workingDaysPerWeek: Number(e.target.value) }))}
          />
        </Field>
        <Field label={t('settings.hrms.overtimeRate')}>
          <Input
            type="number"
            min={1}
            max={5}
            step={0.25}
            value={form.overtimeRateMultiplier}
            onChange={(e) => setForm((p) => ({ ...p, overtimeRateMultiplier: Number(e.target.value) }))}
          />
        </Field>
      </SectionCard>

      <SectionCard
        title={t('settings.hrms.leave')}
        description={t('settings.hrms.leaveDesc')}
      >
        <Field label={t('settings.hrms.carryForwardMax')}>
          <Input
            type="number"
            min={0}
            max={365}
            value={form.leaveCarryForwardMaxDays}
            onChange={(e) => setForm((p) => ({ ...p, leaveCarryForwardMaxDays: Number(e.target.value) }))}
          />
        </Field>
        <Field label={t('settings.hrms.autoApprove')}>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.autoApproveLeave}
              onCheckedChange={(v) => setForm((p) => ({ ...p, autoApproveLeave: v }))}
            />
            <span className="text-sm text-muted-foreground">
              {form.autoApproveLeave ? t('common.enabled') : t('common.disabled')}
            </span>
          </div>
        </Field>
      </SectionCard>

      <SectionCard
        title={t('settings.hrms.attendance')}
        description={t('settings.hrms.attendanceDesc')}
      >
        <Field label={t('settings.hrms.gracePeriod')}>
          <Input
            type="number"
            min={0}
            max={120}
            value={form.attendanceGracePeriodMinutes}
            onChange={(e) => setForm((p) => ({ ...p, attendanceGracePeriodMinutes: Number(e.target.value) }))}
          />
        </Field>
      </SectionCard>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!hasChanges || updateSetting.isPending}>
          {updateSetting.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
          {t('settings.saveSettings')}
        </Button>
      </div>
    </div>
  );
}
