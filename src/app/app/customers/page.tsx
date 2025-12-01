import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";

export default function CustomersPage() {
  return (
    <main className="w-full h-full flex flex-1 bg-green-700 relative overflow-hidden">
      <aside className="bg-red-800 w-62">
        <Command className="rounded-lg border shadow-md md:min-w-[450px]">
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Suggestions">
              <CommandItem>Item 1</CommandItem>
              {Array.from({ length: 100000 }).map((_, i) => {
                return <CommandItem>Item {i}</CommandItem>;
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </aside>
    </main>
  );
}
