'use client';

import { Loader2, Wand2 } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import { ImageUpload } from './image-upload';
import type { Mode, UseItemFormReturn } from './use-item-form';

interface MasterTabProps {
  form: UseItemFormReturn;
  canManageMaster: boolean;
}

export function MasterTab({ form, canManageMaster }: MasterTabProps) {
  const { mode, master, errors, setMasterField, handleMasterNameBlur, pendingImageFile, setPendingImageFile, setImageRemoved } = form;
  const isLocked = !canManageMaster || mode === 'existing' || mode === 'add-supplier';

  const { data: categories } = trpc.categories.list.useQuery();
  const { data: units } = trpc.units.list.useQuery();
  const { data: taxRates } = trpc.settings.taxRates.list.useQuery();
  const generateSku = trpc.categories.generateSku.useMutation();

  const categoryList = Array.isArray(categories) ? categories : [];
  const unitList = Array.isArray(units)
    ? units.filter((u: any) => u.isActive)
    : [];
  const taxRateList = Array.isArray(taxRates) ? taxRates : [];

  const handleGenerateSku = () => {
    const selectedCat = categoryList.find((c: any) => c.id === master.categoryId);
    const categoryCode = selectedCat?.name?.substring(0, 10).toUpperCase().replace(/\s+/g, '');
    generateSku.mutate(
      { categoryCode },
      {
        onSuccess: (data) => setMasterField('sku', data.sku),
      },
    );
  };

  return (
    <div className="space-y-4">
      {/* Name */}
      <Field>
        <Label htmlFor="master-name">Item Name *</Label>
        <Input
          id="master-name"
          placeholder="Item name"
          value={master.name}
          onChange={(e) => setMasterField('name', e.target.value)}
          onBlur={handleMasterNameBlur}
          disabled={isLocked}
          aria-invalid={!!errors.master.name}
          className={cn(errors.master.name && 'border-destructive')}
        />
        {errors.master.name && (
          <p className="text-sm text-destructive mt-1">{errors.master.name}</p>
        )}
      </Field>

      {/* Image */}
      {!isLocked && (
        <ImageUpload
          value={master.image}
          file={pendingImageFile}
          onFileChange={(f) => {
            setPendingImageFile(f);
            if (f) setImageRemoved(false);
          }}
          onRemove={() => setImageRemoved(true)}
          disabled={isLocked}
        />
      )}

      {/* SKU + Barcode */}
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <Label htmlFor="master-sku">Internal SKU *</Label>
          <div className="flex gap-2">
            <Input
              id="master-sku"
              placeholder="SKU-001"
              value={master.sku}
              onChange={(e) => setMasterField('sku', e.target.value)}
              disabled={isLocked}
              aria-invalid={!!errors.master.sku}
              className={cn('flex-1', errors.master.sku && 'border-destructive')}
            />
            {mode === 'create' && canManageMaster && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleGenerateSku}
                disabled={generateSku.isPending}
                title="Auto-generate SKU"
              >
                {generateSku.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Wand2 className="size-4" />
                )}
              </Button>
            )}
          </div>
          {errors.master.sku && (
            <p className="text-sm text-destructive mt-1">{errors.master.sku}</p>
          )}
        </Field>
        <Field>
          <Label htmlFor="master-barcode">Barcode</Label>
          <Input
            id="master-barcode"
            placeholder="EAN/UPC"
            value={master.barcode ?? ''}
            onChange={(e) => setMasterField('barcode', e.target.value || undefined)}
            disabled={isLocked}
          />
        </Field>
      </div>

      {/* Type + Unit */}
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <Label>Type *</Label>
          <Select
            value={master.type}
            onValueChange={(v) => setMasterField('type', v as 'PRODUCT' | 'SERVICE')}
            disabled={isLocked}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PRODUCT">Product</SelectItem>
              <SelectItem value="SERVICE">Service</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <Label>Unit *</Label>
          <Select
            value={master.unitId ?? ''}
            onValueChange={(v) => {
              setMasterField('unitId', v || undefined);
              const unit = unitList.find((u: any) => u.id === v);
              if (unit) setMasterField('unit', unit.code);
            }}
            disabled={isLocked}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {unitList.map((u: any) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.code} — {u.name}
                  {u.isDefault ? ' ★' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.master.unit && (
            <p className="text-sm text-destructive mt-1">{errors.master.unit}</p>
          )}
        </Field>
      </div>

      {/* Category */}
      <Field>
        <Label>Category</Label>
        <Select
          value={master.categoryId ?? ''}
          onValueChange={(v) => setMasterField('categoryId', v || undefined)}
          disabled={isLocked}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categoryList.map((cat: any) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Tax rate */}
      <Field>
        <Label>Tax rate</Label>
        <Select
          value={master.taxRateId ?? ''}
          onValueChange={(v) => setMasterField('taxRateId', v || undefined)}
          disabled={isLocked}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select tax rate" />
          </SelectTrigger>
          <SelectContent>
            {taxRateList.map((tr: any) => (
              <SelectItem key={tr.id} value={tr.id}>
                {tr.name} ({Number(tr.rate)}%)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Flags */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label htmlFor="master-saleable" className="text-sm font-normal cursor-pointer">
            Sellable
          </Label>
          <Switch
            id="master-saleable"
            size="sm"
            checked={master.isSaleable}
            onCheckedChange={(checked) => setMasterField('isSaleable', checked)}
            disabled={isLocked}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label htmlFor="master-purchasable" className="text-sm font-normal cursor-pointer">
            Purchasable
          </Label>
          <Switch
            id="master-purchasable"
            size="sm"
            checked={master.isPurchasable}
            onCheckedChange={(checked) => setMasterField('isPurchasable', checked)}
            disabled={isLocked}
          />
        </div>
      </div>
    </div>
  );
}
