"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import axios, { AxiosResponse } from "axios";
import { Customers } from "@/types/prisma/client";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { PlusIcon, RefreshCcwIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import CreateCustomerDialog from "@/components/Customers/create-customer-dialog";

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
  ({ customer }: { customer: Customers }) => {
    // Safely handle date conversion
    const formattedDate = useMemo(() => {
      if (customer.createdAt instanceof Date) {
        return customer.createdAt.toLocaleDateString();
      }
      if (typeof customer.createdAt === "string") {
        return new Date(customer.createdAt).toLocaleDateString();
      }
      return "N/A";
    }, [customer.createdAt]);

    return (
      <div className="flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-accent/50 border-b border-input" style={{ height: `${ITEM_HEIGHT}px` }}>
        <OptimizedAvatar src={customer.image ?? ""} alt={customer.name || "image"} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{customer.name}</p>
          <p className="text-sm text-muted-foreground truncate">{customer.email}</p>
        </div>
        <div className="text-right text-xs space-y-0.5">
          <p className="flex items-center justify-end gap-1 text-primary">
            <svg className="w-3 h-3" />
            <span className="font-semibold">{customer.code}</span>
          </p>
          <p className="flex items-center justify-end gap-1 text-muted-foreground">
            <svg className="w-3 h-3" />
            {formattedDate}
          </p>
        </div>
      </div>
    );
  },
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
  const debouncedSearch = useDebounce(search, 150);

  const {
    data: ALL_CUSTOMERS,
    isLoading,
    error,
    refetch,
  } = useQuery<Customers[], Error>({
    queryKey: ["customers"],
    queryFn: async (): Promise<Customers[]> => {
      const response: AxiosResponse<Customers[]> = await axios.get("/api/customers");
      return response.data;
    },
  });

  // Optimized filtering with early exit
  const filteredCustomers = useMemo(() => {
    if (!ALL_CUSTOMERS) return [];
    if (!debouncedSearch.trim()) return ALL_CUSTOMERS;

    const searchLower = debouncedSearch.toLowerCase().trim();
    const results: Customers[] = [];

    for (let i = 0; i < ALL_CUSTOMERS.length; i++) {
      const customer = ALL_CUSTOMERS[i];
      if (customer.name?.toLowerCase().includes(searchLower) || customer.email?.toLowerCase().includes(searchLower) || customer.code?.toLowerCase().includes(searchLower)) {
        results.push(customer);
      }
    }

    return results;
  }, [debouncedSearch, ALL_CUSTOMERS]);

  const count = filteredCustomers.length;

  // Virtualizer with optimized settings
  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => ITEM_HEIGHT, []),
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Handle search input
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
        <p className="ms-2 text-muted-foreground">Loading customers...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Empty className="from-muted/50 to-background h-full bg-linear-to-b from-30%">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <svg className="icon-[lucide-bell]" />
          </EmptyMedia>
          <EmptyTitle>Error Loading Customers</EmptyTitle>
          <EmptyDescription>There was an error loading customers. Please try again.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCcwIcon />
            Refresh
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  // Empty data state
  if (!ALL_CUSTOMERS || ALL_CUSTOMERS.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia>
            <div className="*:data-[slot=avatar]:ring-background flex -space-x-2 *:data-[slot=avatar]:size-12 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:grayscale">
              <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarImage src="https://github.com/maxleiter.png" alt="@maxleiter" />
                <AvatarFallback>LR</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarImage src="https://github.com/evilrabbit.png" alt="@evilrabbit" />
                <AvatarFallback>ER</AvatarFallback>
              </Avatar>
            </div>
          </EmptyMedia>
          <EmptyTitle>No Customers</EmptyTitle>
          <EmptyDescription>There are no customers yet. Add your first customer to get started.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <CreateCustomerDialog>
            <Button size="sm">
              <PlusIcon />
              Add Customer
            </Button>
          </CreateCustomerDialog>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex flex-row h-full">
      <aside className="border-e flex flex-col gap-2 max-w-mid max-sm:w-full p-2 w-96">
        {/* Search Input */}
        <div className="flex flex-row gap-2 items-center">
          <InputGroup className="flex-1">
            <InputGroupInput placeholder="Search by Name, Email, or Code..." value={search} onChange={handleSearchChange} autoComplete="off" spellCheck="false" />
          </InputGroup>
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
                      <Link href={`/app/customers/${customer.id}`}>
                        <CustomerItem customer={customer} />
                      </Link>
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
