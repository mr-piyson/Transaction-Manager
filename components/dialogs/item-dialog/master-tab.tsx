'use client';

import { Loader2, Wand2 } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
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
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import type { Mode, UseItemFormReturn } from './use-item-form';

interface MasterTabProps {
  form: UseItemFormReturn;
  canManageMaster: boolean;
}

export function MasterTab({ form, canManageMaster }: MasterTabProps) {
  const { mode, master, errors, setMasterField, handleMasterNameBlur } = form;
  const isLocked = !canManageMaster || mode === 'existing' || mode === 'add-supplier';

  const { data: categoryTree } = trpc.categories.listTree.useQuery();
  const { data: units } = trpc.units.list.useQuery();
  const { data: taxRates } = trpc.settings.taxRates.list.useQuery();
  const generateSku = trpc.categories.generateSku.useMutation();

  const families = categoryTree ?? [];
  const selectedFamily = families.find((f: any) => f.id === master.familyId);
  const classes = selectedFamily?.classes ?? [];
  const selectedClass = classes.find((c: any) => c.id === master.classId);
  const commodities = selectedClass?.commodities ?? [];

  const unitList = Array.isArray(units)
    ? units.filter((u: any) => u.isActive)
    : [];
  const taxRateList = Array.isArray(taxRates) ? taxRates : [];

  const handleGenerateSku = () => {
    const familyCode = selectedFamily?.code;
    const classCode = selectedClass?.code;
    generateSku.mutate(
      { familyCode, classCode },
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

      {/* Description */}
      <Field>
        <Label htmlFor="master-description">Description</Label>
        <Textarea
          id="master-description"
          className="resize-none"
          rows={2}
          value={master.description ?? ''}
          onChange={(e) => setMasterField('description', e.target.value || undefined)}
          disabled={isLocked}
        />
      </Field>

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

      {/* 3-Layer Category */}
      <div className="grid grid-cols-3 gap-3">
        <Field>
          <Label>Family</Label>
          <Select
            value={master.familyId ?? ''}
            onValueChange={(v) => setMasterField('familyId', v || undefined)}
            disabled={isLocked}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select family" />
            </SelectTrigger>
            <SelectContent>
              {families.map((f: any) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.code} — {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <Label>Class</Label>
          <Select
            value={master.classId ?? ''}
            onValueChange={(v) => setMasterField('classId', v || undefined)}
            disabled={isLocked || !master.familyId}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={master.familyId ? 'Select class' : 'Select family first'}
              />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <Label>Commodity</Label>
          <Select
            value={master.commodityId ?? ''}
            onValueChange={(v) => setMasterField('commodityId', v || undefined)}
            disabled={isLocked || !master.classId}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={master.classId ? 'Select commodity' : 'Select class first'}
              />
            </SelectTrigger>
            <SelectContent>
              {commodities.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {/* Category + Tax */}
      <div className="grid grid-cols-2 gap-3">
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
              {taxRateList.map((cat: any) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
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
      </div>

      {/* Flags */}
      <div className="flex gap-4">
        <Toggle
          pressed={master.isSaleable}
          onPressedChange={(pressed) => setMasterField('isSaleable', pressed)}
          variant="outline"
          aria-label="Toggle saleable"
          disabled={isLocked}
        >
          Sellable
        </Toggle>
        <Toggle
          pressed={master.isPurchasable}
          onPressedChange={(pressed) => setMasterField('isPurchasable', pressed)}
          variant="outline"
          aria-label="Toggle purchasable"
          disabled={isLocked}
        >
          Purchasable
        </Toggle>
      </div>
    </div>
  );
}
