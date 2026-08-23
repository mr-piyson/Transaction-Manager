"use client";

import { Filter, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type ItemFilterValues = {
  type: "" | "PRODUCT" | "SERVICE" | "BUNDLE";
  categoryId: string | null;
  isActive: "all" | "active" | "inactive";
  isSaleable: boolean;
  lowStock: boolean;
};

export const DEFAULT_ITEM_FILTERS: ItemFilterValues = {
  type: "",
  categoryId: null,
  isActive: "all",
  isSaleable: false,
  lowStock: false,
};

interface ItemFilterSheetProps {
  open: boolean;
  filters: ItemFilterValues;
  categories: Array<{ id: string; name: string }>;
  onOpenChange: (open: boolean) => void;
  onApply: (filters: ItemFilterValues) => void;
}

export function ItemFilterSheet({
  open,
  filters,
  categories,
  onOpenChange,
  onApply,
}: ItemFilterSheetProps) {
  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  const activeCount = [
    draft.type,
    draft.categoryId,
    draft.isActive !== "all" ? draft.isActive : null,
    draft.isSaleable,
    draft.lowStock,
  ].filter(Boolean).length;

  const clear = () => setDraft(DEFAULT_ITEM_FILTERS);
  const apply = () => {
    onApply(draft);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-primary" />
            <SheetTitle>Advanced filters</SheetTitle>
            {activeCount > 0 && <Badge>{activeCount}</Badge>}
          </div>
          <SheetDescription>
            Refine the items shown in the list.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="item-filter-type">
              Item type
            </label>
            <Select
              value={draft.type || "ALL"}
              onValueChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  type:
                    value === "ALL" ? "" : (value as ItemFilterValues["type"]),
                }))
              }
            >
              <SelectTrigger id="item-filter-type" className="w-full">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                <SelectItem value="PRODUCT">Product</SelectItem>
                <SelectItem value="SERVICE">Service</SelectItem>
                <SelectItem value="BUNDLE">Bundle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              htmlFor="item-filter-category"
            >
              Category
            </label>
            <Select
              value={draft.categoryId ?? "ALL"}
              onValueChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  categoryId: value === "ALL" ? null : value,
                }))
              }
            >
              <SelectTrigger id="item-filter-category" className="w-full">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Availability</p>
            <label
              htmlFor="item-filter-active"
              className="flex items-center gap-3 text-sm"
            >
              <Checkbox
                id="item-filter-active"
                checked={draft.isActive === "active"}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({
                    ...current,
                    isActive: checked ? "active" : "all",
                  }))
                }
              />
              Active items only
            </label>
            <label
              htmlFor="item-filter-inactive"
              className="flex items-center gap-3 text-sm"
            >
              <Checkbox
                id="item-filter-inactive"
                checked={draft.isActive === "inactive"}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({
                    ...current,
                    isActive: checked ? "inactive" : "all",
                  }))
                }
              />
              Inactive items only
            </label>
            <label
              htmlFor="item-filter-saleable"
              className="flex items-center gap-3 text-sm"
            >
              <Checkbox
                id="item-filter-saleable"
                checked={draft.isSaleable}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({
                    ...current,
                    isSaleable: checked === true,
                  }))
                }
              />
              Saleable items only
            </label>
            <label
              htmlFor="item-filter-low-stock"
              className="flex items-center gap-3 text-sm"
            >
              <Checkbox
                id="item-filter-low-stock"
                checked={draft.lowStock}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({
                    ...current,
                    lowStock: checked === true,
                  }))
                }
              />
              Low stock only
            </label>
          </div>
        </div>

        <SheetFooter>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={clear}>
              <RotateCcw className="size-4" />
              Clear
            </Button>
            <Button className="flex-1" onClick={apply}>
              Apply filters
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
