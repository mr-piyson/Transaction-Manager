'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { Search, Package, Plus, Check } from 'lucide-react';
import { inventoryApi } from '@/lib/api';
import { InventoryItem } from '@prisma/client';

interface InventorySelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: InventoryItem) => void;
  selectedItems?: string[];
}

export function InventorySelector({ open, onOpenChange, onSelect, selectedItems = [] }: InventorySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory', searchQuery],
    queryFn: () => (searchQuery ? inventoryApi.search(searchQuery) : inventoryApi.getAll()),
    enabled: open,
  });

  const handleSelect = (item: InventoryItem) => {
    onSelect(item);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Select Inventory Item
          </DialogTitle>
          <DialogDescription>Search and select items to add to your invoice</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, SKU, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <ScrollArea className="flex-1 min-h-75 max-h-100 border rounded-lg">
          {isLoading ? (
            <div className="flex items-center justify-center h-75">
              <Spinner className="h-8 w-8" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-75 text-muted-foreground">
              <Package className="h-12 w-12 mb-3 opacity-50" />
              <p>No items found</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {items.map((item) => {
                const isSelected = selectedItems.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={`group flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer hover:bg-accent ${isSelected ? 'bg-primary/5 border-primary/20' : 'border-transparent'}`}
                    onClick={() => handleSelect(item)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">{item.name}</span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {item.sku}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">{item.description}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm font-semibold text-primary">{formatPrice(item.unitPrice)}</span>
                        <span className="text-xs text-muted-foreground">per {item.unit}</span>
                        <Badge variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={isSelected ? 'default' : 'outline'}
                      className="shrink-0 ml-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(item);
                      }}
                    >
                      {isSelected ? (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Added
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
