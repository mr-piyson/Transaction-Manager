'use client';

import { Loader2, Plus, Trash } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/lib/trpc/client';
import { SectionCard } from '../_shared';

export default function TaxRatesPage() {
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

  const taxRates = (rawTaxRates as unknown as { id: string; name: string; rate: number; isDefault: boolean; isActive: boolean }[]).map((t) => ({
    ...t,
    rate: Number(t.rate),
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
    <div className="max-w-2xl space-y-6">
      <SectionCard
        title="Tax Rates"
        description="Manage sales tax rates for your organization."
      >
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : taxRates.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No tax rates configured yet.
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
                      Default
                    </Badge>
                  )}
                  {!tax.isActive && (
                    <Badge variant="destructive" className="text-xs">
                      Inactive
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
          <p className="text-sm font-medium">Add Tax Rate</p>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Name (e.g. VAT)"
                value={newTaxName}
                onChange={(e) => setNewTaxName(e.target.value)}
              />
            </div>
            <div className="w-24">
              <Input
                placeholder="Rate"
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
              Add
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
