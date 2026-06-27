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
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc/client';
import { Field, SectionCard } from '../_shared';

export default function ChartOfAccountsPage() {
  const t = useTranslations();
  const ACCOUNT_TYPES = [
    { value: 'ASSET', label: t('settings.accountTypes.asset') },
    { value: 'LIABILITY', label: t('settings.accountTypes.liability') },
    { value: 'EQUITY', label: t('settings.accountTypes.equity') },
    { value: 'REVENUE', label: t('settings.accountTypes.revenue') },
    { value: 'EXPENSE', label: t('settings.accountTypes.expense') },
    { value: 'CONTRA_ASSET', label: t('settings.accountTypes.contraAsset') },
    { value: 'CONTRA_REVENUE', label: t('settings.accountTypes.contraRevenue') },
  ] as const;

  const NORMAL_BALANCES = [
    { value: 'DEBIT', label: t('settings.normalBalances.debit') },
    { value: 'CREDIT', label: t('settings.normalBalances.credit') },
  ] as const;

  const accountTypeLabel = (type: string) => {
    const found = ACCOUNT_TYPES.find((a) => a.value === type);
    return found ? found.label : type;
  };
  const normalBalanceLabel = (balance: string) => {
    const found = NORMAL_BALANCES.find((b) => b.value === balance);
    return found ? found.label : balance;
  };

  const { data: accounts = [], isLoading } =
    trpc.settings.chartOfAccounts.list.useQuery();
  const utils = trpc.useUtils();
  const createAccount = trpc.settings.chartOfAccounts.create.useMutation({
    onSuccess: () => utils.settings.chartOfAccounts.list.invalidate(),
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    type: 'ASSET',
    normalBalance: 'DEBIT',
  });

  const handleCreate = () => {
    if (!form.code || !form.name) return;
    createAccount.mutate(
      {
        code: form.code,
        name: form.name,
        description: form.description || undefined,
        type: form.type as 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' | 'CONTRA_ASSET' | 'CONTRA_REVENUE',
        normalBalance: form.normalBalance as 'DEBIT' | 'CREDIT',
      },
      {
        onSuccess: () => {
          setForm({ code: '', name: '', description: '', type: 'ASSET', normalBalance: 'DEBIT' });
          setShowForm(false);
        },
      },
    );
  };

  return (
    <div className="h-full space-y-6">
      <SectionCard
        title={t('settings.general')}
        description={t('common.description')}
      >
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t('common.noResults')}
          </p>
        ) : (
          <div className="space-y-1">
            {accounts.map((acct: { id: string; code: string; name: string; type: string; normalBalance: string; isActive: boolean }) => (
              <div
                key={acct.id}
                className="flex items-center justify-between rounded-lg border p-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground">
                    {acct.code}
                  </span>
                  <span className="font-medium">{acct.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {accountTypeLabel(acct.type)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {normalBalanceLabel(acct.normalBalance)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2">
          {showForm ? (
            <div className="space-y-4 rounded-lg border p-4">
              <p className="text-sm font-medium">{t('common.addItem')}</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label={t('common.code')}>
                  <Input
                    placeholder={t('settings.codePlaceholder')}
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                </Field>
                <Field label={t('common.name')}>
                  <Input
                    placeholder={t('settings.namePlaceholder')}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </Field>
                <Field label={t('common.type')}>
                  <Select
                    value={form.type}
                    onValueChange={(v) => setForm({ ...form, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((acctType) => (
                        <SelectItem key={acctType.value} value={acctType.value}>
                          {acctType.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={t('common.status')}>
                  <Select
                    value={form.normalBalance}
                    onValueChange={(v) => setForm({ ...form, normalBalance: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NORMAL_BALANCES.map((b) => (
                        <SelectItem key={b.value} value={b.value}>
                          {b.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label={t('common.description')}>
                <Textarea
                  placeholder={t('common.optionalNotes')}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </Field>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!form.code || !form.name || createAccount.isPending}
                >
                  {createAccount.isPending && (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  )}
                  {t('common.create')}
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setShowForm(true)}>
              {t('common.addItem')}
            </Button>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
