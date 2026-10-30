"use client";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export default function TestPalette() {
  return (
    <Command className="max-w-2xl rounded-lg border">
      <CommandInput placeholder="Type..." />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem value="calendar">Calendar</CommandItem>
          <CommandItem value="emoji">Search Emoji</CommandItem>
          <CommandItem value="calc">Calculator</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
