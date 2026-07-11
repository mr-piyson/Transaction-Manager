'use client';

import { useTranslations } from 'next-intl';
import { Loader2, Pencil, Plus, Trash } from 'lucide-react';
import { useCallback, useState } from 'react';
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

type Unit = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  isDefault: boolean;
};

export default function UnitsPage() {
  const t = useTranslations();
  const { data: unitsData = [], isLoading } = trpc.units.list.useQuery();
  const utils = trpc.useUtils();

  const units = (unitsData ?? []) as Unit[];

  const createUnit = trpc.units.create.useMutation({
    onSuccess: useCallback(() => {
      utils.units.list.invalidate();
      toast.success(t('common.itemCreated'));
    }, [utils, t]),
    onError: useCallback((e: { message: string }) => toast.error(e.message), []),
  });

  const updateUnit = trpc.units.update.useMutation({
    onSuccess: useCallback(() => {
      utils.units.list.invalidate();
      toast.success(t('common.itemUpdated'));
      closeEditDialog();
    }, [utils, t]),
    onError: useCallback((e: { message: string }) => toast.error(e.message), []),
  });

  const deleteUnit = trpc.units.delete.useMutation({
    onSuccess: useCallback(() => {
      utils.units.list.invalidate();
      toast.success(t('common.itemDeleted'));
    }, [utils, t]),
    onError: useCallback((e: { message: string }) => toast.error(e.message), []),
  });

  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    code: '',
    isActive: true,
    isDefault: false,
  });

  const handleAdd = useCallback(() => {
    if (!newName || !newCode) return;
    createUnit.mutate(
      { name: newName, code: newCode },
      {
        onSuccess: () => {
          setNewName('');
          setNewCode('');
        },
      },
    );
  }, [newName, newCode, createUnit]);

  const openEditDialog = useCallback((unit: Unit) => {
    setEditingId(unit.id);
    setEditForm({
      name: unit.name,
      code: unit.code,
      isActive: unit.isActive,
      isDefault: unit.isDefault,
    });
    setEditDialogOpen(true);
  }, []);

  const closeEditDialog = useCallback(() => {
    setEditDialogOpen(false);
    setEditingId(null);
    setEditForm({ name: '', code: '', isActive: true, isDefault: false });
  }, []);

  const handleEditSave = useCallback(() => {
    if (!editingId || !editForm.name || !editForm.code) return;
    updateUnit.mutate({
      id: editingId,
      name: editForm.name,
      code: editForm.code,
      isActive: editForm.isActive,
      isDefault: editForm.isDefault,
    });
  }, [editingId, editForm, updateUnit]);

  const handleToggleActive = useCallback(
    (unit: Unit) => {
      updateUnit.mutate({ id: unit.id, isActive: !unit.isActive });
    },
    [updateUnit],
  );

  const handleToggleDefault = useCallback(
    (unit: Unit) => {
      updateUnit.mutate({ id: unit.id, isDefault: !unit.isDefault });
    },
    [updateUnit],
  );

  const handleDelete = useCallback(
    (id: string, name: string) => {
      alert.delete({
        title: t('common.confirmDelete'),
        description: `"${name}"`,
        confirmText: t('common.delete'),
        onConfirm: async () => {
          await deleteUnit.mutateAsync({ id });
        },
      });
    },
    [t, deleteUnit],
  );

  const isEditPending = updateUnit.isPending;

  return (
    <div className="h-full space-y-6">
      <SectionCard
        title={t('settings.units.title')}
        description={t('settings.units.description')}
      >
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : units.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t('common.noResults')}
          </p>
        ) : (
          <div className="space-y-2">
            {units.map((unit) => (
              <div
                key={unit.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">{unit.name}</span>
                  <Badge variant="outline">{unit.code}</Badge>
                  {unit.isDefault && (
                    <Badge variant="secondary" className="text-xs">
                      {t('common.default')}
                    </Badge>
                  )}
                  {!unit.isActive && (
                    <Badge variant="destructive" className="text-xs">
                      {t('common.inactive')}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={unit.isDefault}
                      onCheckedChange={() => handleToggleDefault(unit)}
                      disabled={updateUnit.isPending}
                    />
                    <span className="text-xs text-muted-foreground">
                      {t('common.default')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={unit.isActive}
                      onCheckedChange={() => handleToggleActive(unit)}
                      disabled={updateUnit.isPending}
                    />
                    <span className="text-xs text-muted-foreground">
                      {t('common.active')}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(unit)}
                    disabled={updateUnit.isPending}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(unit.id, unit.name)}
                    disabled={unit.isDefault || deleteUnit.isPending}
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
                placeholder={t('settings.units.namePlaceholder')}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="w-28">
              <Input
                placeholder={t('settings.units.codePlaceholder')}
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
              />
            </div>
            <Button
              onClick={handleAdd}
              disabled={!newName || !newCode || createUnit.isPending}
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
              {t('common.edit')} {t('settings.units.title')}
            </DialogTitle>
            <DialogDescription>{t('settings.units.description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Field>
              <Label htmlFor="edit-name">{t('settings.units.nameLabel')}</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </Field>

            <Field>
              <Label htmlFor="edit-code">{t('settings.units.codeLabel')}</Label>
              <Input
                id="edit-code"
                value={editForm.code}
                onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
              />
            </Field>

            <div className="flex items-center justify-between">
              <Label htmlFor="edit-active">{t('common.active')}</Label>
              <Switch
                id="edit-active"
                checked={editForm.isActive}
                onCheckedChange={(v) => setEditForm({ ...editForm, isActive: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="edit-default">{t('common.default')}</Label>
              <Switch
                id="edit-default"
                checked={editForm.isDefault}
                onCheckedChange={(v) => setEditForm({ ...editForm, isDefault: v })}
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
