'use client';

import { useTranslations } from 'next-intl';
import { Loader2, Plus, Trash, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/lib/trpc/client';
import { Field, SectionCard } from '../_shared';

export default function CategoriesPage() {
  const t = useTranslations();
  const { data: tree, isLoading } = trpc.categories.listTree.useQuery();
  const utils = trpc.useUtils();

  const handleError = (e: any) => toast.error(e.message);

  const createFamily = trpc.categories.createFamily.useMutation({
    onSuccess: () => utils.categories.listTree.invalidate(),
    onError: handleError,
  });
  const updateFamily = trpc.categories.updateFamily.useMutation({
    onSuccess: () => utils.categories.listTree.invalidate(),
    onError: handleError,
  });
  const deleteFamily = trpc.categories.deleteFamily.useMutation({
    onSuccess: () => utils.categories.listTree.invalidate(),
    onError: handleError,
  });

  const createClass = trpc.categories.createClass.useMutation({
    onSuccess: () => utils.categories.listTree.invalidate(),
    onError: handleError,
  });
  const updateClass = trpc.categories.updateClass.useMutation({
    onSuccess: () => utils.categories.listTree.invalidate(),
    onError: handleError,
  });
  const deleteClass = trpc.categories.deleteClass.useMutation({
    onSuccess: () => utils.categories.listTree.invalidate(),
    onError: handleError,
  });

  const createCommodity = trpc.categories.createCommodity.useMutation({
    onSuccess: () => utils.categories.listTree.invalidate(),
    onError: handleError,
  });
  const updateCommodity = trpc.categories.updateCommodity.useMutation({
    onSuccess: () => utils.categories.listTree.invalidate(),
    onError: handleError,
  });
  const deleteCommodity = trpc.categories.deleteCommodity.useMutation({
    onSuccess: () => utils.categories.listTree.invalidate(),
    onError: handleError,
  });

  const [newFamily, setNewFamily] = useState({ name: '', code: '', color: '#000000', description: '', icon: '' });
  const [editNames, setEditNames] = useState<Record<string, string>>({});

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const families = tree ?? [];

  return (
    <div className="h-full space-y-6">
      <SectionCard
        title={t('items.category')}
        description={t('common.description')}
      >
        {families.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t('common.noResults')}
          </p>
        ) : null}

        {/* Families */}
        <div className="space-y-4">
          {families.map((family) => (
            <div key={family.id} className="rounded-lg border">
              {/* Family Header */}
              <div className="flex items-center justify-between bg-muted/30 px-4 py-2.5 rounded-t-lg">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {editNames[family.id] !== undefined ? (
                    <Input
                      className="h-8 w-48"
                      value={editNames[family.id]}
                      onChange={(e) => setEditNames({ ...editNames, [family.id]: e.target.value })}
                      onBlur={() => {
                        if (editNames[family.id] && editNames[family.id] !== family.name) {
                          updateFamily.mutate({ id: family.id, name: editNames[family.id] });
                        }
                        setEditNames((prev) => {
                          const { [family.id]: _, ...rest } = prev;
                          return rest;
                        });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        if (e.key === 'Escape') {
                          setEditNames((prev) => {
                            const { [family.id]: _, ...rest } = prev;
                            return rest;
                          });
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <span
                      className="font-semibold cursor-pointer hover:text-primary truncate"
                      onDoubleClick={() => setEditNames({ ...editNames, [family.id]: family.name })}
                      title={t('common.edit')}
                    >
                      {family.name}
                    </span>
                  )}
                  <Badge variant="outline" className="font-mono text-xs">
                    {family.code}
                  </Badge>
                  {family.color && (
                    <span
                      className="inline-block size-3 rounded-full shrink-0"
                      style={{ backgroundColor: family.color }}
                    />
                  )}
                  {family.description && (
                    <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                      {family.description}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={() => deleteFamily.mutate({ id: family.id })}
                  disabled={deleteFamily.isPending}
                >
                  <Trash className="size-3.5 text-destructive" />
                </Button>
              </div>

              {/* Classes inside this family */}
              <div className="divide-y">
                {family.classes.length === 0 && (
                  <p className="text-xs text-muted-foreground px-4 py-2 italic">
                    {t('common.noResults')}
                  </p>
                )}
                {family.classes.map((cls) => (
                  <div key={cls.id} className="px-4 py-2">
                    {/* Class Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-muted-foreground text-xs pl-2 shrink-0">└─</span>
                        <span className="font-medium text-sm truncate">{cls.name}</span>
                        <Badge variant="outline" className="font-mono text-xs">
                          {cls.code}
                        </Badge>
                        {cls.color && (
                          <span
                            className="inline-block size-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cls.color }}
                          />
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0"
                        onClick={() => deleteClass.mutate({ id: cls.id })}
                        disabled={deleteClass.isPending}
                      >
                        <Trash className="size-3 text-destructive" />
                      </Button>
                    </div>

                    {/* Commodities inside this class */}
                    <div className="ml-8 mt-1 space-y-0.5">
                      {cls.commodities.length === 0 && (
                        <p className="text-xs text-muted-foreground italic">{t('common.noResults')}</p>
                      )}
                      {cls.commodities.map((com) => (
                        <div key={com.id} className="flex items-center justify-between py-0.5">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-muted-foreground text-xs shrink-0">▪</span>
                            <span className="text-sm truncate">{com.name}</span>
                            <Badge variant="outline" className="font-mono text-xs">
                              {com.code}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 shrink-0"
                            onClick={() => deleteCommodity.mutate({ id: com.id })}
                            disabled={deleteCommodity.isPending}
                          >
                            <Trash className="size-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      {/* Add commodity */}
                      <AddInlineRow
                        onAdd={(name, code) =>
                          createCommodity.mutate({ name, code, classId: cls.id })
                        }
                        isPending={createCommodity.isPending}
                      />
                    </div>
                  </div>
                ))}
                {/* Add class */}
                <div className="px-4 py-2">
                  <AddInlineRow
                    onAdd={(name, code) =>
                      createClass.mutate({ name, code, familyId: family.id })
                    }
                    isPending={createClass.isPending}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Add Family */}
        <div className="space-y-3">
          <p className="text-sm font-medium">{t('common.addItem')}</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('common.name')}>
              <Input
                placeholder={t('common.name')}
                value={newFamily.name}
                onChange={(e) => setNewFamily({ ...newFamily, name: e.target.value })}
              />
            </Field>
            <Field label={t('common.code')}>
              <Input
                placeholder={t('common.code')}
                value={newFamily.code}
                onChange={(e) => setNewFamily({ ...newFamily, code: e.target.value.toUpperCase() })}
              />
            </Field>
            <Field label="Color">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="size-8 cursor-pointer rounded border"
                  value={newFamily.color}
                  onChange={(e) => setNewFamily({ ...newFamily, color: e.target.value })}
                />
                {newFamily.color !== '#000000' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => setNewFamily({ ...newFamily, color: '#000000' })}
                  >
                    <X className="size-3.5" />
                  </Button>
                )}
              </div>
            </Field>
            <Field label="Icon">
              <Input
                placeholder="e.g. electronics"
                maxLength={50}
                value={newFamily.icon}
                onChange={(e) => setNewFamily({ ...newFamily, icon: e.target.value })}
              />
            </Field>
            <div className="col-span-2">
              <Field label={t('common.description')}>
                <Textarea
                  placeholder={t('common.optionalNotes')}
                  maxLength={500}
                  value={newFamily.description}
                  onChange={(e) => setNewFamily({ ...newFamily, description: e.target.value })}
                />
              </Field>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => {
                createFamily.mutate(
                  {
                    name: newFamily.name,
                    code: newFamily.code,
                    ...(newFamily.color && newFamily.color !== '#000000' ? { color: newFamily.color } : {}),
                    ...(newFamily.description ? { description: newFamily.description } : {}),
                    ...(newFamily.icon ? { icon: newFamily.icon } : {}),
                  },
                  {
                    onSuccess: () =>
                      setNewFamily({ name: '', code: '', color: '#000000', description: '', icon: '' }),
                  },
                );
              }}
              disabled={!newFamily.name || !newFamily.code || createFamily.isPending}
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

function AddInlineRow({
  onAdd,
  isPending,
}: {
  onAdd: (name: string, code: string) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const handleAdd = () => {
    if (!name.trim() || !code.trim()) return;
    onAdd(name.trim(), code.trim().toUpperCase());
    setName('');
    setCode('');
  };

  return (
    <div className="flex items-center gap-2 mt-1">
      <Input
        className="h-7 text-xs flex-1 min-w-0"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleAdd();
        }}
      />
      <Input
        className="h-7 text-xs w-24 shrink-0"
        placeholder="Code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleAdd();
        }}
      />
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        onClick={handleAdd}
        disabled={!name.trim() || !code.trim() || isPending}
      >
        <Plus className="size-3.5" />
      </Button>
    </div>
  );
}
