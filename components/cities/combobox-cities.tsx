import * as React from 'react';
import { Check, ChevronsUpDown, MapPin } from 'lucide-react';
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
  CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BAHRAIN_CITIES, BahrainCity } from './cities';
import { JSX } from 'react';

export function CityCombobox({
  cities = BAHRAIN_CITIES,
  onSelect,
  children,
}: {
  cities?: BahrainCity[];
  onSelect?: (city: BahrainCity) => void;
  children?: JSX.Element;
}) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');

  const fuse = React.useMemo(() => {
    return new Fuse(cities, {
      keys: ['en', 'ar', 'governorate'],
      threshold: 0.3,
    });
  }, [cities]);

  const filteredCities = React.useMemo(() => {
    if (!searchQuery) return cities;
    return fuse.search(searchQuery).map((result) => result.item);
  }, [searchQuery, fuse, cities]);

  // Group cities by governorate
  const groupedCities = React.useMemo(() => {
    return filteredCities.reduce(
      (acc, city) => {
        const group = city.governorate;
        if (!acc[group]) acc[group] = [];
        acc[group].push(city);
        return acc;
      },
      {} as Record<string, BahrainCity[]>,
    );
  }, [filteredCities]);

  const governorates = Object.keys(groupedCities);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          children ? (
            children
          ) : (
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-75 justify-between"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <MapPin className="h-4 w-4 shrink-0 opacity-50" />
                <span className="truncate">
                  {value ? cities.find((city) => city.id === value)?.en : 'Select city...'}
                </span>
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          )
        }
      ></PopoverTrigger>
      <PopoverContent className="w-75 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search city (English or Arabic)..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {filteredCities.length === 0 && <CommandEmpty>No city found.</CommandEmpty>}

            {governorates.map((gov, index) => (
              <React.Fragment key={gov}>
                <CommandGroup heading={gov}>
                  {groupedCities[gov].map((city) => (
                    <CommandItem
                      key={city.id}
                      value={city.id} // Ensure this is a unique string
                      onSelect={() => {
                        const newValue = city.id === value ? '' : city.id;
                        setValue(newValue);
                        setOpen(false);
                        onSelect?.(city);
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === city.id ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{city.en}</span>
                        <span className="text-xs text-muted-foreground">{city.ar}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                {index < governorates.length - 1 && <CommandSeparator />}
              </React.Fragment>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
