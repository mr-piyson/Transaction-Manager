"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SelectSeparator } from "@/components/ui/select";
import { Trash2, Search, MoreHorizontal, PenBox, Share, AlertCircle, FileX, Plus } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import useDebounce from "@/hooks/use-debounce";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useParams } from "next/navigation";
import { Invoices } from "@/types/prisma/client";
import CreateInvoiceDialog from "./create-invoice-dialog";

const ITEM_HEIGHT = 80;

type Invoice = Invoices;

// Optimized Invoice Item Component
const InvoiceItem = React.memo(
  ({ invoice }: { invoice: Invoice }) => {
    const formattedDate = useMemo(() => {
      if (!invoice.createdAt) return "N/A";
      const date = new Date(invoice.createdAt);
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }, [invoice.createdAt]);
    const params = useParams<{ recordId: string }>();

    const statusConfig = {
      pending: { variant: "warning" as const, label: "Pending", icon: "icon-[lucide--clock-4]" },
      done: { variant: "success" as const, label: "Done", icon: "icon-[lucide--check]" },
      draft: { variant: "primary" as const, label: "In Progress", icon: "icon-[mingcute--loading-fill]" },
      failed: { variant: "destructive" as const, label: "Failed", icon: "icon-[lucide--circle-x]" },
    };

    const status = invoice.status || "draft";
    const { variant, label, icon } = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

    return (
      <Link href={`/app/records/${params.recordId}/invoices/${invoice.id}`}>
        <div className="flex items-center gap-4 p-4 cursor-pointer transition-colors hover:bg-accent/50 border-b border-border" style={{ height: `${ITEM_HEIGHT}px` }}>
          <div className="flex items-center justify-center size-10 rounded-lg ">
            <svg className="icon-[hugeicons--file-01] size-7 text-foreground/60" />
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm">{invoice.title || `Invoice #${invoice.id}`}</p>
              <Badge variant={variant}>
                <svg className={icon} />
                {label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">{formattedDate}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-semibold text-sm">{invoice.total?.toFixed(3) || "0.000"} BD</p>
              {/* <p className="text-xs text-muted-foreground">{invoice.clientName || "N/A"}</p> */}
            </div>

            <div className="flex items-center gap-1">
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" onClick={e => e.preventDefault()} aria-label="Open menu" size="icon-sm">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-40" align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuItem>
                      <PenBox />
                      Edit
                    </DropdownMenuItem>
                    <SelectSeparator />
                    <DropdownMenuItem>
                      <Share />
                      Share...
                    </DropdownMenuItem>
                    <SelectSeparator />
                    <DropdownMenuItem variant="destructive">
                      <Trash2 />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </Link>
    );
  },
  (prev, next) => prev.invoice.id === next.invoice.id
);
InvoiceItem.displayName = "InvoiceItem";

// Empty State Component
function EmptyState({ hasFilters, onClearFilters }: { hasFilters: boolean; onClearFilters: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="rounded-full bg-muted p-6 mb-4">
        <FileX className="size-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{hasFilters ? "No invoices found" : "No invoices yet"}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        {hasFilters ? "Try adjusting your search or filters to find what you're looking for." : "Get started by creating your first invoice."}
      </p>
      {hasFilters && (
        <Button variant="outline" onClick={onClearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
}

// Error State Component
function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading invoices</AlertTitle>
        <AlertDescription className="mt-2">{error.message || "Something went wrong while fetching your invoices."}</AlertDescription>
      </Alert>
      <Button variant="outline" onClick={onRetry} className="mt-4">
        Try again
      </Button>
    </div>
  );
}

// Loading State Component
function LoadingState() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner />
      <p className="ms-2 text-muted-foreground">Loading invoices...</p>
    </div>
  );
}

export default function InvoicesPage() {
  const parentRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const params = useParams<{ recordId: string }>();
  const debouncedSearch = useDebounce(search, 200);

  const {
    data: invoices,
    isLoading,
    error,
    refetch,
  } = useQuery<Invoices[]>({
    queryKey: ["invoices", params.recordId],
    queryFn: async () => (await axios.get(`/api/records/${params.recordId}/invoices`)).data,
  });

  // Optimized filtering with multiple filters
  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];

    let results = invoices;

    // Status filter
    if (statusFilter !== "all") {
      results = results.filter(inv => inv.status === statusFilter);
    }

    // Search filter
    if (debouncedSearch.trim()) {
      const searchLower = debouncedSearch.toLowerCase().trim();
      results = results.filter(inv => inv.id?.toString().includes(searchLower) || inv.total?.toString().includes(searchLower) || inv.title?.toLowerCase().includes(searchLower));
    }

    return results;
  }, [invoices, debouncedSearch, statusFilter]);

  const count = filteredInvoices?.length || 0;

  // Virtualizer with optimized settings
  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => ITEM_HEIGHT, []),
    overscan: 15,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Handle search input
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  // Handle clear filters
  const handleClearFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("all");
  }, []);

  // Check if filters are active
  const hasActiveFilters = search.trim() !== "" || statusFilter !== "all";

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error as Error} onRetry={() => refetch()} />;
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 p-2">
          <CreateInvoiceDialog>
            <Button className=" z-50 ">
              <Plus className="size-5" />
              Invoice
            </Button>
          </CreateInvoiceDialog>
          <InputGroup className="flex-1 w-full min-w-46 bg-card">
            <Label>
              <Search className="size-4 ms-3 text-foreground/60" />
              <InputGroupInput placeholder="Search invoices..." value={search} onChange={handleSearchChange} autoComplete="off" spellCheck="false" />
            </Label>
          </InputGroup>

          <Tabs className="w-full" value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="w-full">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="draft">In Progress</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="done">Done</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Invoice List with Infinite Scroll */}
      <main className="flex-1 min-h-0 relative">
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
              <div className="flex items-center gap-2">
                <Spinner className="size-4" />
                <p className="text-sm font-medium">Searching...</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {count === 0 && search === debouncedSearch ? (
            <EmptyState hasFilters={hasActiveFilters} onClearFilters={handleClearFilters} />
          ) : (
            <div
              className="relative w-full"
              style={{
                height: `${virtualizer.getTotalSize()}px`,
              }}
            >
              {/* Render Virtual Items */}
              {virtualItems.map(virtualItem => {
                const invoice = filteredInvoices[virtualItem.index];

                return (
                  <div
                    key={invoice.id}
                    data-index={virtualItem.index}
                    className="absolute top-0 left-0 w-full"
                    style={{
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                      willChange: "transform",
                    }}
                  >
                    <InvoiceItem invoice={invoice} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
