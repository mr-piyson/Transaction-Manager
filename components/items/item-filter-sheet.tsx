"use client";

import { Filter, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ItemFilterValues = {
  type: "" | "PRODUCT" | "SERVICE" | "BUNDLE";
  categoryId: string | null;
  isActive: "all" | "active" | "inactive";
  isSaleable: boolean;
  lowStock: boolean;
};

export const UNCATEGORIZED_CATEGORY_ID = "__uncategorized__";

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
  const updateFilters = (patch: Partial<ItemFilterValues>) => {
    onApply({ ...filters, ...patch });
  };

  const activeCount = [
    filters.type,
    filters.categoryId,
    filters.isActive !== "all" ? filters.isActive : null,
    filters.isSaleable,
    filters.lowStock,
  ].filter(Boolean).length;

  const reset = () => onApply(DEFAULT_ITEM_FILTERS);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-[300px] sm:w-[340px]">
        <DrawerHeader>
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-primary" />
            <DrawerTitle>Advanced filters</DrawerTitle>
            {activeCount > 0 && <Badge>{activeCount}</Badge>}
          </div>
          <DrawerDescription>
            Refine the items shown in the list.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="item-filter-type">
              Item type
            </label>
            <Select
              value={filters.type || "ALL"}
              onValueChange={(value) =>
                updateFilters({
                  type:
                    value === "ALL" ? "" : (value as ItemFilterValues["type"]),
                })
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
              value={filters.categoryId ?? "ALL"}
              onValueChange={(value) =>
                updateFilters({ categoryId: value === "ALL" ? null : value })
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
                <SelectItem value={UNCATEGORIZED_CATEGORY_ID}>
                  Others
                </SelectItem>
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
                checked={filters.isActive === "active"}
                onCheckedChange={(checked) =>
                  updateFilters({ isActive: checked ? "active" : "all" })
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
                checked={filters.isActive === "inactive"}
                onCheckedChange={(checked) =>
                  updateFilters({ isActive: checked ? "inactive" : "all" })
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
                checked={filters.isSaleable}
                onCheckedChange={(checked) =>
                  updateFilters({ isSaleable: checked === true })
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
                checked={filters.lowStock}
                onCheckedChange={(checked) =>
                  updateFilters({ lowStock: checked === true })
                }
              />
              Low stock only
            </label>
          </div>
        </div>

        <Button
          variant="ghost"
          className="mx-4 mb-4"
          onClick={reset}
          disabled={activeCount === 0}
        >
          <RotateCcw className="size-4" />
          Clear
        </Button>
      </DrawerContent>
    </Drawer>
  );
}
