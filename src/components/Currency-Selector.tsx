"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { currencies, getCurrency } from "@/lib/currencies";

interface CurrencySelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function CurrencySelector({ value, onChange }: CurrencySelectorProps) {
  const [open, setOpen] = React.useState(false);

  const selectedCurrency = getCurrency(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <FlagIcon code={selectedCurrency.flag} />
            <span>
              {selectedCurrency.code} - {selectedCurrency.name}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search currency..." />
          <CommandList>
            <CommandEmpty>No currency found.</CommandEmpty>
            <CommandGroup>
              {Array.from(currencies.values()).map((currency) => (
                <CommandItem
                  key={currency.code}
                  value={currency.code}
                  onSelect={() => {
                    onChange(currency.code);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2 w-full">
                    <FlagIcon code={currency.flag} />
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {currency.code} ({currency.symbol})
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {currency.name}
                      </span>
                    </div>
                    <Badge variant="outline" className="ml-auto">
                      {currency.decimals}{" "}
                      {currency.decimals === 1 ? "decimal" : "decimals"}
                    </Badge>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        value === currency.code ? "opacity-100" : "opacity-0"
                      )}
                    />
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

// Simple component to display flag icons
function FlagIcon({ code }: { code: string }) {
  return (
    <div className="relative w-5 h-5 overflow-hidden flex items-center justify-center bg-transparent">
      {code === "btc" ? (
        <span className="text-xs">₿</span>
      ) : (
        <img
          src={`https://flagcdn.com/w20/${code.toLowerCase()}.png`}
          alt={`${code} flag`}
          className="w-5 h-auto object-cover"
        />
      )}
    </div>
  );
}
