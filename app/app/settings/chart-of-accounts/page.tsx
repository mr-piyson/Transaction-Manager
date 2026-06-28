'use client';

import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronRight, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { alert } from '@/components/Alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  { value: 'ASSET', labelKey: 'settings.accountTypes.asset' },
  { value: 'LIABILITY', labelKey: 'settings.accountTypes.liability' },
  { value: 'EQUITY', labelKey: 'settings.accountTypes.equity' },
  { value: 'REVENUE', labelKey: 'settings.accountTypes.revenue' },
  { value: 'EXPENSE', labelKey: 'settings.accountTypes.expense' },
  { value: 'CONTRA_ASSET', labelKey: 'settings.accountTypes.contraAsset' },
  { value: 'CONTRA_REVENUE', labelKey: 'settings.accountTypes.contraRevenue' },
] as const;

const NORMAL_BALANCES = [
  { value: 'DEBIT', labelKey: 'settings.normalBalances.debit' },
  { value: 'CREDIT', labelKey: 'settings.normalBalances.credit' },
] as const;

export default function ChartOfAccountsPage() {
  const t = useTranslations();
  const utils = trpc.useUtils();

  const { data: accounts = [], isLoading } = trpc.settings.chartOfAccounts.list.useQuery();

  const createMutation = trpc.settings.chartOfAccounts.create.useMutation({
    onSuccess: () => {
      utils.settings.chartOfAccounts.list.invalidate();
      toast.success(t('common.created'));
      resetCreateForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.settings.chartOfAccounts.update.useMutation({
    onSuccess: () => {
      utils.settings.chartOfAccounts.list.invalidate();
      toast.success(t('common.saved'));
      closeEditDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.settings.chartOfAccounts.delete.useMutation({
    onSuccess: () => {
      utils.settings.chartOfAccounts.list.invalidate();
      toast.success(t('common.deleted'));
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Create form ──────────────────────────────────────────────────────────

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    parentId: '',
  });

  const resetCreateForm = () => {
    setForm({ code: '', name: '', description: '', type: 'ASSET', normalBalance: 'DEBIT', parentId: '' });
    setShowForm(false);
  };

  const handleCreate = () => {
    if (!form.code || !form.name) return;
    createMutation.mutate({
      code: form.code,
      name: form.name,
      description: form.description || undefined,
      type: form.type as any,
      normalBalance: form.normalBalance as any,
      parentId: form.parentId || undefined,
    });
  };

  // ── Edit dialog ──────────────────────────────────────────────────────────

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<{
    id: string;
    code: string;
    name: string;
    description: string;
    type: string;
    normalBalance: string;
    isActive: boolean;
  } | null>(null);

  const openEditDialog = (acct: any) => {
    setEditForm({
      id: acct.id,
      code: acct.code,
      name: acct.name,
      description: acct.description ?? '',
      type: acct.type,
      normalBalance: acct.normalBalance,
      isActive: acct.isActive,
    });
    setEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditForm(null);
  };

  const handleUpdate = () => {
    if (!editForm || !editForm.code || !editForm.name) return;
    updateMutation.mutate({
      id: editForm.id,
      code: editForm.code,
      name: editForm.name,
      description: editForm.description || undefined,
      type: editForm.type as any,
      normalBalance: editForm.normalBalance as any,
      isActive: editForm.isActive,
    });
  };

  const handleDelete = (id: string, name: string) => {
    alert.delete({
      title: t('common.delete'),
      description: `${t('common.confirmDelete')} "${name}"?`,
      confirmText: t('common.delete'),
      onConfirm: async () => { await deleteMutation.mutateAsync({ id }); },
    });
  };

  // ── Helpers ──────────────────────────────────────────────────────────────

  const accountTypeLabel = (type: string) => {
    const found = ACCOUNT_TYPES.find((a) => a.value === type);
    return found ? t(found.labelKey) : type;
  };

  const normalBalanceLabel = (balance: string) => {
    const found = NORMAL_BALANCES.find((b) => b.value === balance);
    return found ? t(found.labelKey) : balance;
  };

  // Top-level accounts (parentId null)
  const topLevel = accounts.filter((a: any) => !a.parentId);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="h-full space-y-6">
      <SectionCard title={t('settings.chartOfAccounts')} description={t('common.description')}>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : topLevel.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{t('common.noResults')}</p>
        ) : (
          <div className="space-y-1">
            {topLevel.map((parent: any) => (
              <AccountNode
                key={parent.id}
                account={parent}
                t={t}
                accountTypeLabel={accountTypeLabel}
                normalBalanceLabel={normalBalanceLabel}
                onEdit={openEditDialog}
                onDelete={handleDelete}
                isPending={deleteMutation.isPending}
              />
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
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((acct) => (
                        <SelectItem key={acct.value} value={acct.value}>{t(acct.labelKey)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={t('common.status')}>
                  <Select value={form.normalBalance} onValueChange={(v) => setForm({ ...form, normalBalance: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NORMAL_BALANCES.map((b) => (
                        <SelectItem key={b.value} value={b.value}>{t(b.labelKey)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={t('common.parent')}>
                  <Select value={form.parentId} onValueChange={(v) => setForm({ ...form, parentId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('common.none')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t('common.none')}</SelectItem>
                      {accounts.map((acct: any) => (
                        <SelectItem key={acct.id} value={acct.id}>
                          {acct.code} - {acct.name}
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
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Field>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={resetCreateForm}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleCreate} disabled={!form.code || !form.name || createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
                  {t('common.create')}
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="size-4 mr-1" />
              {t('common.addItem')}
            </Button>
          )}
        </div>
      </SectionCard>

      {/* ── Edit Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={(v) => { if (!v) closeEditDialog(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('common.edit')}</DialogTitle>
          </DialogHeader>
          {editForm && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label={t('common.code')}>
                  <Input value={editForm.code} onChange={(e) => setEditForm({ ...editForm, code: e.target.value })} />
                </Field>
                <Field label={t('common.name')}>
                  <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                </Field>
                <Field label={t('common.type')}>
                  <Select value={editForm.type} onValueChange={(v) => setEditForm({ ...editForm, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((acct) => (
                        <SelectItem key={acct.value} value={acct.value}>{t(acct.labelKey)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={t('common.status')}>
                  <Select value={editForm.normalBalance} onValueChange={(v) => setEditForm({ ...editForm, normalBalance: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {NORMAL_BALANCES.map((b) => (
                        <SelectItem key={b.value} value={b.value}>{t(b.labelKey)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label={t('common.description')}>
                <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
              </Field>
              <Field label={t('users.status')}>
                <Select value={editForm.isActive ? 'active' : 'inactive'} onValueChange={(v) => setEditForm({ ...editForm, isActive: v === 'active' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('users.active')}</SelectItem>
                    <SelectItem value="inactive">{t('users.inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog} disabled={updateMutation.isPending}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Account Tree Node ────────────────────────────────────────────────────────

function AccountNode({
  account,
  t,
  accountTypeLabel,
  normalBalanceLabel,
  onEdit,
  onDelete,
  isPending,
  depth = 0,
}: {
  account: any;
  t: any;
  accountTypeLabel: (type: string) => string;
  normalBalanceLabel: (balance: string) => string;
  onEdit: (acct: any) => void;
  onDelete: (id: string, name: string) => void;
  isPending: boolean;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = account.children?.length > 0;

  return (
    <div>
      <div
        className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/30 transition-colors"
        style={{ marginLeft: depth * 24 }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {hasChildren ? (
            <button onClick={() => setExpanded(!expanded)} className="shrink-0 text-muted-foreground hover:text-foreground">
              {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
          ) : (
            <span className="size-4 shrink-0" />
          )}
          <span className="font-mono text-xs text-muted-foreground">{account.code}</span>
          <span className="font-medium truncate">{account.name}</span>
          <Badge variant="outline" className="text-[10px]">{accountTypeLabel(account.type)}</Badge>
          {!account.isActive && (
            <Badge variant="secondary" className="text-[10px]">{t('users.inactive')}</Badge>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:inline">{normalBalanceLabel(account.normalBalance)}</span>
          <button
            onClick={() => onEdit(account)}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={t('common.edit')}
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={() => onDelete(account.id, account.name)}
            disabled={isPending}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title={t('common.delete')}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      {hasChildren && expanded && (
        <div className="space-y-1 mt-1">
          {account.children.map((child: any) => (
            <AccountNode
              key={child.id}
              account={child}
              t={t}
              accountTypeLabel={accountTypeLabel}
              normalBalanceLabel={normalBalanceLabel}
              onEdit={onEdit}
              onDelete={onDelete}
              isPending={isPending}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
