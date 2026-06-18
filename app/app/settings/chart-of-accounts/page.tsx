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
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc/client';
import { Field, SectionCard } from '../_shared';

const ACCOUNT_TYPES = [
  { value: 'ASSET', label: 'Asset' },
  { value: 'LIABILITY', label: 'Liability' },
  { value: 'EQUITY', label: 'Equity' },
  { value: 'REVENUE', label: 'Revenue' },
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'CONTRA_ASSET', label: 'Contra Asset' },
  { value: 'CONTRA_REVENUE', label: 'Contra Revenue' },
] as const;

const NORMAL_BALANCES = [
  { value: 'DEBIT', label: 'Debit' },
  { value: 'CREDIT', label: 'Credit' },
] as const;

export default function ChartOfAccountsPage() {
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
    <div className="max-w-2xl space-y-6">
      <SectionCard
        title="Chart of Accounts"
        description="Manage your organization's ledger accounts."
      >
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No accounts configured yet.
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
                  <span className="text-xs text-muted-foreground capitalize">
                    {acct.type.replace('_', ' ').toLowerCase()}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {acct.normalBalance}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2">
          {showForm ? (
            <div className="space-y-4 rounded-lg border p-4">
              <p className="text-sm font-medium">New Account</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Code">
                  <Input
                    placeholder="e.g. 1000"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                </Field>
                <Field label="Name">
                  <Input
                    placeholder="e.g. Cash"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </Field>
                <Field label="Type">
                  <Select
                    value={form.type}
                    onValueChange={(v) => setForm({ ...form, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Normal Balance">
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
              <Field label="Description">
                <Textarea
                  placeholder="Optional description"
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
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!form.code || !form.name || createAccount.isPending}
                >
                  {createAccount.isPending && (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  )}
                  Create Account
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setShowForm(true)}>
              Add Account
            </Button>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
