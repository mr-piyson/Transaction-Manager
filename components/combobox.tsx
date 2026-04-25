'use client';

import * as React from 'react';
import Fuse from 'fuse.js';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type UniversalComboboxProps<T> = {
  data?: T[]; // ✅ now optional
  value?: string;
  onSelect?: (item: T) => void;

  getValue: (item: T) => string;
  getLabel: (item: T) => string;
  getSubLabel?: (item: T) => string;

  groupBy?: (item: T) => string;
  searchKeys: (keyof T)[];

  placeholder?: string;
  emptyText?: string;
  loading?: boolean;

  renderItem?: (item: T, selected: boolean) => React.ReactNode;

  children?: React.JSX.Element;
};

export function UniversalCombobox<T>({
  data,
  value,
  onSelect,
  getValue,
  getLabel,
  getSubLabel,
  groupBy,
  searchKeys,
  placeholder = 'Select...',
  emptyText = 'No results found.',
  loading = false,
  renderItem,
  children,
}: UniversalComboboxProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  // ✅ safe fallback
  const safeData = React.useMemo(() => data ?? [], [data]);

  // ✅ only build fuse when data exists
  const fuse = React.useMemo(() => {
    if (!safeData.length) return null;

    return new Fuse(safeData, {
      keys: searchKeys as string[],
      threshold: 0.3,
    });
  }, [safeData, searchKeys]);

  const filtered = React.useMemo(() => {
    if (!searchQuery) return safeData;
    if (!fuse) return safeData;

    return fuse.search(searchQuery).map((r) => r.item);
  }, [searchQuery, fuse, safeData]);

  const grouped = React.useMemo(() => {
    if (!groupBy) return { All: filtered };

    return filtered.reduce(
      (acc, item) => {
        const key = groupBy(item);
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      },
      {} as Record<string, T[]>,
    );
  }, [filtered, groupBy]);

  const groups = Object.keys(grouped);

  const selectedItem = safeData.find((d) => getValue(d) === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          children ?? (
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
              disabled={loading}
            >
              <span className="truncate">
                {selectedItem ? getLabel(selectedItem) : loading ? 'Loading...' : placeholder}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          )
        }
      />

      <PopoverContent className="w-full p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />

          <CommandList>
            {/* ✅ Loading state */}
            {loading && <div className="p-4 text-sm text-muted-foreground">Loading...</div>}

            {/* ✅ Empty state */}
            {!loading && filtered.length === 0 && <CommandEmpty>{emptyText}</CommandEmpty>}

            {!loading &&
              groups.map((group, i) => (
                <React.Fragment key={group}>
                  <CommandGroup heading={group}>
                    {grouped[group].map((item) => {
                      const itemValue = getValue(item);
                      const selected = itemValue === value;

                      return (
                        <CommandItem
                          key={itemValue}
                          value={itemValue}
                          onSelect={() => {
                            onSelect?.(item);
                            setOpen(false);
                          }}
                        >
                          {renderItem ? (
                            renderItem(item, selected)
                          ) : (
                            <>
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  selected ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{getLabel(item)}</span>
                                {getSubLabel && (
                                  <span className="text-xs text-muted-foreground">
                                    {getSubLabel(item)}
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>

                  {i < groups.length - 1 && <CommandSeparator />}
                </React.Fragment>
              ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
