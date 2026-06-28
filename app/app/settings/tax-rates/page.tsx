'use client';

import { useTranslations } from 'next-intl';
import { Loader2, Pencil, Plus, Trash } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { alert } from '@/components/Alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { trpc } from '@/lib/trpc/client';
import { SectionCard } from '../_shared';

export default function TaxRatesPage() {
  const t = useTranslations();
  const { data: rawTaxRates = [], isLoading } =
    trpc.settings.taxRates.list.useQuery();
  const utils = trpc.useUtils();

  const createTaxRate = trpc.settings.taxRates.create.useMutation({
    onSuccess: () => {
      utils.settings.taxRates.list.invalidate();
      toast.success(t('common.itemCreated'));
    },
    onError: (e) => toast.error(e.message),
  });

  const updateTaxRate = trpc.settings.taxRates.update.useMutation({
    onSuccess: () => {
      utils.settings.taxRates.list.invalidate();
      toast.success(t('common.itemUpdated'));
      closeEditDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteTaxRate = trpc.settings.taxRates.delete.useMutation({
    onSuccess: () => {
      utils.settings.taxRates.list.invalidate();
      toast.success(t('common.itemDeleted'));
    },
    onError: (e) => toast.error(e.message),
  });

  const [newTaxName, setNewTaxName] = useState('');
  const [newTaxRate, setNewTaxRate] = useState('');

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTaxId, setEditingTaxId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    rate: '',
    isActive: true,
    isDefault: false,
  });

  const taxRates = (
    rawTaxRates as unknown as {
      id: string;
      name: string;
      rate: number;
      isDefault: boolean;
      isActive: boolean;
    }[]
  ).map((tax) => ({
    ...tax,
    rate: Number(tax.rate),
  }));

  const handleAdd = () => {
    if (!newTaxName || !newTaxRate) return;
    createTaxRate.mutate(
      { name: newTaxName, rate: Number(newTaxRate) },
      {
        onSuccess: () => {
          setNewTaxName('');
          setNewTaxRate('');
        },
      },
    );
  };

  const openEditDialog = (tax: (typeof taxRates)[number]) => {
    setEditingTaxId(tax.id);
    setEditForm({
      name: tax.name,
      rate: String(tax.rate),
      isActive: tax.isActive,
      isDefault: tax.isDefault,
    });
    setEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditingTaxId(null);
    setEditForm({ name: '', rate: '', isActive: true, isDefault: false });
  };

  const handleEditSave = () => {
    if (!editingTaxId || !editForm.name || !editForm.rate) return;
    updateTaxRate.mutate({
      id: editingTaxId,
      name: editForm.name,
      rate: Number(editForm.rate),
      isActive: editForm.isActive,
      isDefault: editForm.isDefault,
    });
  };

  const handleToggleActive = (tax: (typeof taxRates)[number]) => {
    updateTaxRate.mutate({ id: tax.id, isActive: !tax.isActive });
  };

  const handleToggleDefault = (tax: (typeof taxRates)[number]) => {
    updateTaxRate.mutate({ id: tax.id, isDefault: !tax.isDefault });
  };

  const handleDelete = (id: string, name: string) => {
    alert.delete({
      title: t('common.confirmDelete'),
      description: `"${name}"`,
      confirmText: t('common.delete'),
      onConfirm: async () => {
        await deleteTaxRate.mutateAsync({ id });
      },
    });
  };

  const isEditPending = updateTaxRate.isPending;

  return (
    <div className="h-full space-y-6">
      <SectionCard
        title={t('settings.defaultTaxRate')}
        description={t('common.description')}
      >
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : taxRates.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t('common.noResults')}
          </p>
        ) : (
          <div className="space-y-2">
            {taxRates.map((tax) => (
              <div
                key={tax.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">{tax.name}</span>
                  <Badge variant="outline">{tax.rate}%</Badge>
                  {tax.isDefault && (
                    <Badge variant="secondary" className="text-xs">
                      {t('common.default')}
                    </Badge>
                  )}
                  {!tax.isActive && (
                    <Badge variant="destructive" className="text-xs">
                      {t('common.inactive')}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={tax.isDefault}
                      onCheckedChange={() => handleToggleDefault(tax)}
                      disabled={updateTaxRate.isPending}
                    />
                    <span className="text-xs text-muted-foreground">
                      {t('common.default')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={tax.isActive}
                      onCheckedChange={() => handleToggleActive(tax)}
                      disabled={updateTaxRate.isPending}
                    />
                    <span className="text-xs text-muted-foreground">
                      {t('common.active')}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(tax)}
                    disabled={updateTaxRate.isPending}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(tax.id, tax.name)}
                    disabled={tax.isDefault || deleteTaxRate.isPending}
                  >
                    <Trash className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Separator />

        <div className="space-y-3">
          <p className="text-sm font-medium">{t('common.addItem')}</p>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder={t('common.name')}
                value={newTaxName}
                onChange={(e) => setNewTaxName(e.target.value)}
              />
            </div>
            <div className="w-24">
              <Input
                placeholder={t('common.percentage')}
                type="number"
                min={0}
                max={100}
                value={newTaxRate}
                onChange={(e) => setNewTaxRate(e.target.value)}
              />
            </div>
            <Button
              onClick={handleAdd}
              disabled={!newTaxName || !newTaxRate || createTaxRate.isPending}
            >
              <Plus className="size-4 mr-1" />
              {t('common.addItem')}
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(v) => {
          if (!isEditPending) {
            if (!v) closeEditDialog();
            else setEditDialogOpen(v);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t('common.edit')} {t('settings.defaultTaxRate')}
            </DialogTitle>
            <DialogDescription>{t('common.description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Field>
              <Label htmlFor="edit-name">{t('common.name')}</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
              />
            </Field>

            <Field>
              <Label htmlFor="edit-rate">{t('common.percentage')}</Label>
              <Input
                id="edit-rate"
                type="number"
                min={0}
                max={100}
                value={editForm.rate}
                onChange={(e) =>
                  setEditForm({ ...editForm, rate: e.target.value })
                }
              />
            </Field>

            <div className="flex items-center justify-between">
              <Label htmlFor="edit-active">{t('common.active')}</Label>
              <Switch
                id="edit-active"
                checked={editForm.isActive}
                onCheckedChange={(v) =>
                  setEditForm({ ...editForm, isActive: v })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="edit-default">{t('common.default')}</Label>
              <Switch
                id="edit-default"
                checked={editForm.isDefault}
                onCheckedChange={(v) =>
                  setEditForm({ ...editForm, isDefault: v })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeEditDialog}
              disabled={isEditPending}
            >
              {t('common.cancel')}
            </Button>
            <Button onClick={handleEditSave} disabled={isEditPending}>
              {isEditPending && (
                <Loader2 className="size-4 mr-2 animate-spin" />
              )}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
