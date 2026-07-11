'use client';

import { useTranslations } from 'next-intl';
import { Loader2, Plus, Trash, X, Check, Pencil } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc/client';
import { SectionCard } from '../_shared';

export default function CategoriesPage() {
  const t = useTranslations();
  const utils = trpc.useUtils();
  const { data: categories, isLoading } = trpc.categories.list.useQuery();

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#000000');
  const [newIcon, setNewIcon] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#000000');
  const [editIcon, setEditIcon] = useState('');

  const handleError = useCallback((e: { message: string }) => toast.error(e.message), []);

  const createCategory = trpc.categories.create.useMutation({
    onSuccess: () => {
      utils.categories.list.invalidate();
      setNewName('');
      setNewColor('#000000');
      setNewIcon('');
    },
    onError: handleError,
  });

  const updateCategory = trpc.categories.update.useMutation({
    onSuccess: () => {
      utils.categories.list.invalidate();
      setEditingId(null);
    },
    onError: handleError,
  });

  const deleteCategory = trpc.categories.delete.useMutation({
    onSuccess: () => utils.categories.list.invalidate(),
    onError: handleError,
  });

  const categoryList = useMemo(() => categories ?? [], [categories]);

  const startEdit = (cat: { id: string; name: string; color?: string | null; icon?: string | null }) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color || '#000000');
    setEditIcon(cat.icon || '');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full space-y-6">
      <SectionCard title={t('items.category')} description={t('common.description')}>
        <div className="space-y-2">
          {categoryList.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t('common.noResults')}
            </p>
          )}
          {categoryList.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between rounded-lg border px-4 py-2.5"
            >
              {editingId === cat.id ? (
                <>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Input
                      className="h-8 w-48"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter')
                          updateCategory.mutate({
                            id: cat.id,
                            name: editName,
                            color: editColor !== '#000000' ? editColor : undefined,
                            icon: editIcon || undefined,
                          });
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                    />
                    <input
                      type="color"
                      className="size-8 cursor-pointer rounded border shrink-0"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                    />
                    <Input
                      className="h-8 w-32"
                      placeholder="Icon"
                      value={editIcon}
                      onChange={(e) => setEditIcon(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() =>
                        updateCategory.mutate({
                          id: cat.id,
                          name: editName,
                          color: editColor !== '#000000' ? editColor : undefined,
                          icon: editIcon || undefined,
                        })
                      }
                      disabled={updateCategory.isPending}
                    >
                      <Check className="size-3.5 text-green-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className="font-medium truncate cursor-pointer hover:text-primary"
                      onDoubleClick={() => startEdit(cat)}
                      title={t('common.edit')}
                    >
                      {cat.name}
                    </span>
                    {cat.color && (
                      <span
                        className="inline-block size-3 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                    )}
                    {cat.icon && (
                      <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                        {cat.icon}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => startEdit(cat)}
                    >
                      <Pencil className="size-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => deleteCategory.mutate({ id: cat.id })}
                      disabled={deleteCategory.isPending}
                    >
                      <Trash className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="border-t mt-4 pt-4 space-y-3">
          <p className="text-sm font-medium">{t('common.addItem')}</p>
          <div className="flex items-center gap-3">
            <Input
              className="h-8 flex-1"
              placeholder={t('common.name')}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newName.trim())
                  createCategory.mutate({
                    name: newName.trim(),
                    color: newColor !== '#000000' ? newColor : undefined,
                    icon: newIcon || undefined,
                  });
              }}
            />
            <input
              type="color"
              className="size-8 cursor-pointer rounded border shrink-0"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
            />
            <Input
              className="h-8 w-32 shrink-0"
              placeholder="Icon"
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
            />
            <Button
              size="sm"
              onClick={() =>
                createCategory.mutate({
                  name: newName.trim(),
                  color: newColor !== '#000000' ? newColor : undefined,
                  icon: newIcon || undefined,
                })
              }
              disabled={!newName.trim() || createCategory.isPending}
            >
              <Plus className="size-4 mr-1" />
              {t('common.addItem')}
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
