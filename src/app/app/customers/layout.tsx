"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";

// --- Types ---
type Customer = {
  id: number;
  name: string;
  email: string;
  avatarUrl: string;
  transactionCode: string;
  createdAt: string;
};

const generateMockCustomers = (count: number): Customer[] => {
  return Array.from({ length: count }).map((_, i) => ({
    id: i + 1,
    name: `Customer ${i + 1}`,
    email: `customer${i + 1}@example.com`,
    avatarUrl: `https://i.pravatar.cc/150?img=${i % 70}`,
    transactionCode: `TXN-${(Math.random() * 1e9).toFixed(0).padStart(9, "0")}`,
    createdAt: new Date(Date.now() - Math.floor(Math.random() * 365) * 24 * 60 * 60 * 1000).toLocaleDateString(),
  }));
};

const ALL_CUSTOMERS = generateMockCustomers(2000);
const ITEM_HEIGHT = 72;

// --- Optimized Avatar with lazy loading and error handling ---
const OptimizedAvatar = React.memo(({ src, alt }: { src: string; alt: string }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <Avatar className="size-10">
      {!error ? (
        <AvatarImage
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={loaded ? "opacity-100" : "opacity-0"}
          style={{ transition: "opacity 0.2s" }}
        />
      ) : null}
      <AvatarFallback>
        <svg className="w-5 h-5" />
      </AvatarFallback>
    </Avatar>
  );
});
OptimizedAvatar.displayName = "OptimizedAvatar";

// --- Highly optimized CustomerItem with proper memoization ---
const CustomerItem = React.memo(
  ({ customer }: { customer: Customer }) => (
    <div className="flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-accent/50 border-b border-input" style={{ height: `${ITEM_HEIGHT}px` }}>
      <OptimizedAvatar src={customer.avatarUrl} alt={customer.name} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{customer.name}</p>
        <p className="text-sm text-muted-foreground truncate">{customer.email}</p>
      </div>
      <div className="text-right text-xs space-y-0.5">
        <p className="flex items-center justify-end gap-1 text-primary">
          <svg className="w-3 h-3" />
          <span className="font-semibold">{customer.transactionCode}</span>
        </p>
        <p className="flex items-center justify-end gap-1 text-muted-foreground">
          <svg className="w-3 h-3" />
          {customer.createdAt}
        </p>
      </div>
    </div>
  ),
  // Custom comparison function - only re-render if customer ID changes
  (prev, next) => prev.customer.id === next.customer.id
);
CustomerItem.displayName = "CustomerItem";

// --- Debounce Hook ---
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// --- Main Component ---
type CustomerPageProps = {
  children?: React.ReactNode;
};

export default function CustomerPage(props: CustomerPageProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 150); // 150ms debounce
  const [isPending, startTransition] = useTransition();

  // Optimized filtering with early exit
  const filteredCustomers = useMemo(() => {
    if (!debouncedSearch.trim()) return ALL_CUSTOMERS;

    const searchLower = debouncedSearch.toLowerCase().trim();
    const results: Customer[] = [];

    // Early exit optimization - stop after finding enough results if needed
    for (let i = 0; i < ALL_CUSTOMERS.length; i++) {
      const customer = ALL_CUSTOMERS[i];
      if (customer.name.toLowerCase().includes(searchLower) || customer.email.toLowerCase().includes(searchLower) || customer.transactionCode.toLowerCase().includes(searchLower)) {
        results.push(customer);
      }
    }

    return results;
  }, [debouncedSearch]);

  const count = filteredCustomers.length;

  // Virtualizer with optimized settings
  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => ITEM_HEIGHT, []),
    overscan: 10, // Increased overscan for smoother scrolling
    measureElement: undefined, // Skip measurement for fixed height items
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Handle search input with transition
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
  }, []);

  return (
    <div className="flex flex-row h-full">
      <aside className="border-e flex flex-col gap-2 max-w-mid max-sm:w-full p-2 w-96">
        {/* Search Input */}
        <div className="flex flex-row gap-2 items-center">
          <InputGroup className="flex-1">
            <InputGroupInput placeholder="Search by Name, Email, or Code..." value={search} onChange={handleSearchChange} autoComplete="off" spellCheck="false" />
          </InputGroup>
          {/* <Button disabled={search !== debouncedSearch}>
            <Search className="h-4 w-4" />
          </Button> */}
        </div>

        {/* Scrollable Area */}
        <div className="flex-1 min-h-0 relative">
          <div
            ref={parentRef}
            className="h-full overflow-y-auto overflow-x-hidden"
            style={{
              contain: "strict",
              willChange: "scroll-position",
            }}
          >
            {/* Loading Indicator */}
            {search !== debouncedSearch && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10 pointer-events-none">
                <p className="text-sm font-medium">Searching...</p>
              </div>
            )}

            {/* Empty State */}
            {count === 0 && search === debouncedSearch ? (
              <div className="p-4 text-center text-muted-foreground">No customers found matching "{debouncedSearch}".</div>
            ) : (
              <div
                className="relative w-full"
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                }}
              >
                {/* Render Virtual Items */}
                {virtualItems.map(virtualItem => {
                  const customer = filteredCustomers[virtualItem.index];

                  return (
                    <div
                      key={customer.id}
                      data-index={virtualItem.index}
                      className="absolute top-0 left-0 w-full"
                      style={{
                        height: `${virtualItem.size}px`,
                        transform: `translateY(${virtualItem.start}px)`,
                        willChange: "transform",
                      }}
                    >
                      <CustomerItem customer={customer} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="max-sm:hidden flex-1 p-4">{props.children}</main>
    </div>
  );
}
