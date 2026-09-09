"use client";

import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronsUpDown,
  Trash2,
} from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { SupplierItemDraft } from "@/lib/validations/unified-item";

const CURRENCIES = [
  "USD",
  "BHD",
  "EUR",
  "GBP",
  "JPY",
  "AED",
  "SAR",
  "KWD",
  "QAR",
  "OMR",
];

interface SupplierCardProps {
  draft: SupplierItemDraft;
  suppliers: any[];
  errors?: Partial<Record<keyof SupplierItemDraft, string>>;
  isDuplicate: boolean;
  disabled: boolean;
  supplierRequired: boolean;
  canRemove: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (tempId: string, patch: Partial<SupplierItemDraft>) => void;
  onRemove: (tempId: string) => void;
}

export function SupplierCard({
  draft,
  suppliers,
  errors,
  isDuplicate,
  disabled,
  supplierRequired,
  canRemove,
  expanded,
  onToggleExpand,
  onUpdate,
  onRemove,
}: SupplierCardProps) {
  const [supplierPopoverOpen, setSupplierPopoverOpen] = React.useState(false);
  const [supplierSearch, setSupplierSearch] = React.useState("");

  const selectedSupplier = suppliers.find((s) => s.id === draft.supplierId);
  const hasErrors = errors && Object.keys(errors).length > 0;

  const filteredSuppliers = React.useMemo(() => {
    if (!supplierSearch) return suppliers;
    const q = supplierSearch.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q),
    );
  }, [suppliers, supplierSearch]);

  return (
    <div
      className={cn(
        "rounded-md border transition-colors",
        isDuplicate && "border-destructive bg-destructive/5",
        hasErrors && !isDuplicate && "border-destructive",
      )}
    >
      {/* Main row */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px_70px_auto] gap-2 items-center p-2 sm:p-1.5">
        {/* Supplier name / selector */}
        <Popover
          open={supplierPopoverOpen}
          onOpenChange={setSupplierPopoverOpen}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className={cn(
                "flex items-center gap-1.5 min-w-0 h-8 px-2 rounded-md text-sm text-left transition-colors",
                "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                disabled && "opacity-50 cursor-not-allowed",
                !selectedSupplier && "text-muted-foreground",
              )}
            >
              {selectedSupplier ? (
                <span className="truncate font-medium">
                  {selectedSupplier.name}
                </span>
              ) : (
                <span className="truncate">Select supplier...</span>
              )}
              {selectedSupplier?.code && (
                <span className="hidden sm:inline text-xs text-muted-foreground truncate">
                  ({selectedSupplier.code})
                </span>
              )}
              {isDuplicate && (
                <Badge
                  variant="destructive"
                  className="ml-1 text-[10px] px-1 py-0 h-4 shrink-0"
                >
                  <AlertTriangle className="size-2.5 mr-0.5" />
                  Dup
                </Badge>
              )}
              <ChevronsUpDown className="ml-auto size-3.5 shrink-0 opacity-50" />
            </button>
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
                        setSupplierSearch("");
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          draft.supplierId === supplier.id
                            ? "opacity-100"
                            : "opacity-0",
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

        {/* Price */}
        <Input
          type="number"
          min={0}
          step="0.001"
          placeholder="0.000"
          value={draft.basePrice || ""}
          onChange={(e) =>
            onUpdate(draft.tempId, { basePrice: Number(e.target.value) })
          }
          disabled={disabled}
          aria-invalid={!!errors?.basePrice}
          className={cn(
            "h-8 text-xs",
            errors?.basePrice && "border-destructive",
          )}
        />

        {/* Currency */}
        <Select
          value={draft.currency}
          onValueChange={(v) => onUpdate(draft.tempId, { currency: v as any })}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 text-xs w-full">
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

        {/* Actions */}
        <div className="flex items-center gap-0.5 sm:w-16 justify-end">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "size-7 shrink-0",
              expanded || hasErrors
                ? "text-foreground"
                : "text-muted-foreground",
            )}
            onClick={onToggleExpand}
            disabled={disabled}
            title={expanded ? "Collapse" : "Expand details"}
          >
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                expanded && "rotate-180",
              )}
            />
          </Button>
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(draft.tempId)}
              disabled={disabled}
              title="Remove supplier"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Expanded details (SKU + errors) */}
      {expanded && (
        <div className="px-2 pb-2 sm:px-2 sm:pb-1.5 border-t">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 pt-2 sm:pt-1.5 items-end">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">
                Supplier SKU
              </label>
              <Input
                placeholder="Vendor's SKU"
                value={draft.supplierSku ?? ""}
                onChange={(e) =>
                  onUpdate(draft.tempId, {
                    supplierSku: e.target.value || undefined,
                  })
                }
                disabled={disabled}
                className="h-8 text-xs"
              />
            </div>
            {(errors?.supplierId || errors?.basePrice) && (
              <div className="text-xs text-destructive space-y-0.5">
                {errors?.supplierId && <p>{errors.supplierId}</p>}
                {errors?.basePrice && <p>{errors.basePrice}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
