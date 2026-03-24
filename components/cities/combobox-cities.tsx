import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import Fuse from 'fuse.js';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BAHRAIN_CITIES, BahrainCity } from './cities';
export function CityCombobox({
  cities = BAHRAIN_CITIES,
  onSelect,
}: {
  cities?: BahrainCity[];
  onSelect?: (city: BahrainCity) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');

  // 1. Initialize Fuse.js
  const fuse = React.useMemo(() => {
    return new Fuse(cities, {
      keys: ['en', 'ar', 'governorate'],
      threshold: 0.3, // Lower is stricter, higher is fuzzier
      includeMatches: true,
    });
  }, [cities]);

  // 2. Filter results based on search input
  const filteredCities = React.useMemo(() => {
    if (!searchQuery) return cities;
    return fuse.search(searchQuery).map((result) => result.item);
  }, [searchQuery, fuse, cities]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-75 justify-between"
          >
            {value ? cities.find((city) => city.id === value)?.en : 'Select city...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        }
      ></PopoverTrigger>
      <PopoverContent className="w-75 p-0">
        <Command shouldFilter={false}>
          {/* Important: Disable internal filtering */}
          <CommandInput
            placeholder="Search city (English or Arabic)..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {filteredCities.length === 0 && <CommandEmpty>No city found.</CommandEmpty>}
            <CommandGroup>
              {filteredCities.map((city) => (
                <CommandItem
                  key={city.id}
                  value={city.id}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? '' : currentValue);
                    setOpen(false);
                    onSelect?.(city);
                  }}
                >
                  <Check
                    className={cn('mr-2 h-4 w-4', value === city.id ? 'opacity-100' : 'opacity-0')}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{city.en}</span>
                    <span className="text-xs text-muted-foreground">
                      {city.ar} • {city.governorate}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
