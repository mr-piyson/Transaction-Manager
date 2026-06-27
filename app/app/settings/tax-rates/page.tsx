'use client';

import { useTranslations } from 'next-intl';
import { Loader2, Plus, Trash } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/lib/trpc/client';
import { SectionCard } from '../_shared';

export default function TaxRatesPage() {
  const t = useTranslations();
  const { data: rawTaxRates = [], isLoading } =
    trpc.settings.taxRates.list.useQuery();
  const utils = trpc.useUtils();
  const createTaxRate = trpc.settings.taxRates.create.useMutation({
    onSuccess: () => utils.settings.taxRates.list.invalidate(),
  });
  const deleteTaxRate = trpc.settings.taxRates.delete.useMutation({
    onSuccess: () => utils.settings.taxRates.list.invalidate(),
  });

  const [newTaxName, setNewTaxName] = useState('');
  const [newTaxRate, setNewTaxRate] = useState('');

  const taxRates = (rawTaxRates as unknown as { id: string; name: string; rate: number; isDefault: boolean; isActive: boolean }[]).map((tax) => ({
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteTaxRate.mutate({ id: tax.id })}
                  disabled={tax.isDefault || deleteTaxRate.isPending}
                >
                  <Trash className="size-4 text-destructive" />
                </Button>
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
    </div>
  );
}
