'use client';

import { Check, ChevronsUpDown, Trash2, AlertTriangle } from 'lucide-react';
import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { SupplierItemDraft } from '@/lib/validations/unified-item';

const CURRENCIES = ['USD', 'BHD', 'EUR', 'GBP', 'JPY', 'AED', 'SAR', 'KWD', 'QAR', 'OMR'];

interface SupplierCardProps {
  draft: SupplierItemDraft;
  suppliers: any[];
  errors?: Partial<Record<keyof SupplierItemDraft, string>>;
  isDuplicate: boolean;
  disabled: boolean;
  canRemove: boolean;
  onUpdate: (tempId: string, patch: Partial<SupplierItemDraft>) => void;
  onRemove: (tempId: string) => void;
}

export function SupplierCard({
  draft,
  suppliers,
  errors,
  isDuplicate,
  disabled,
  canRemove,
  onUpdate,
  onRemove,
}: SupplierCardProps) {
  const [supplierPopoverOpen, setSupplierPopoverOpen] = React.useState(false);
  const [supplierSearch, setSupplierSearch] = React.useState('');

  const selectedSupplier = suppliers.find((s) => s.id === draft.supplierId);

  const filteredSuppliers = React.useMemo(() => {
    if (!supplierSearch) return suppliers;
    const q = supplierSearch.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code?.toLowerCase().includes(q),
    );
  }, [suppliers, supplierSearch]);

  return (
    <div
      className={cn(
        'rounded-lg border p-4 space-y-3 transition-colors',
        isDuplicate && 'border-destructive bg-destructive/5',
        errors && Object.keys(errors).length > 0 && 'border-destructive',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {selectedSupplier ? selectedSupplier.name : 'New Supplier Price'}
          </span>
          {isDuplicate && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="size-3 mr-0.5" />
              Duplicate supplier
            </Badge>
          )}
        </div>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(draft.tempId)}
            disabled={disabled}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>

      {/* Supplier Select */}
      <Field>
        <Label>Supplier *</Label>
        <Popover open={supplierPopoverOpen} onOpenChange={setSupplierPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={supplierPopoverOpen}
              className="w-full justify-between font-normal"
              disabled={disabled}
            >
              {selectedSupplier ? (
                <span className="flex items-center gap-2">
                  <span className="font-medium">{selectedSupplier.name}</span>
                  {selectedSupplier.code && (
                    <span className="text-xs text-muted-foreground">
                      ({selectedSupplier.code})
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-muted-foreground">Select supplier...</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] p-0"
            align="start"
          >
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search suppliers..."
                value={supplierSearch}
                onValueChange={setSupplierSearch}
              />
              <CommandList>
                <CommandEmpty>No suppliers found.</CommandEmpty>
                <CommandGroup>
                  {filteredSuppliers.map((supplier) => (
                    <CommandItem
                      key={supplier.id}
                      value={supplier.id}
                      onSelect={(currentValue) => {
                        onUpdate(draft.tempId, { supplierId: currentValue });
                        setSupplierPopoverOpen(false);
                        setSupplierSearch('');
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          draft.supplierId === supplier.id ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <span className="font-medium">{supplier.name}</span>
                      {supplier.code && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({supplier.code})
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {errors?.supplierId && (
          <p className="text-sm text-destructive mt-1">{errors.supplierId}</p>
        )}
      </Field>

      {/* Supplier SKU */}
      <Field>
        <Label>Supplier SKU</Label>
        <Input
          placeholder="Vendor's SKU"
          value={draft.supplierSku ?? ''}
          onChange={(e) =>
            onUpdate(draft.tempId, { supplierSku: e.target.value || undefined })
          }
          disabled={disabled}
        />
      </Field>

      {/* Price + Currency */}
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <Label>Price *</Label>
          <Input
            type="number"
            min={0}
            step="0.001"
            value={draft.basePrice}
            onChange={(e) =>
              onUpdate(draft.tempId, { basePrice: Number(e.target.value) })
            }
            disabled={disabled}
            aria-invalid={!!errors?.basePrice}
            className={cn(errors?.basePrice && 'border-destructive')}
          />
          {errors?.basePrice && (
            <p className="text-sm text-destructive mt-1">{errors.basePrice}</p>
          )}
        </Field>
        <Field>
          <Label>Currency</Label>
          <Select
            value={draft.currency}
            onValueChange={(v) =>
              onUpdate(draft.tempId, { currency: v as any })
            }
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

    </div>
  );
}
