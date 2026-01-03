// "use client";
// import { useToolbar } from "@/hooks/use-toolbar";
// import { use } from "react";
// import InvoicesTable from "./Invoices-Table";

// type CustomerPageProps = {
//   children?: React.ReactNode;
//   params: Promise<{ id: string }>;
// };

// export default function RecordsPage(props: CustomerPageProps) {
//   const { id } = use(props.params);
//   const toolbar = useToolbar();

//   return (
//     <div className="flex flex-col w-full h-full">
//       <InvoicesTable />
//     </div>
//   );
// }

"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Trash2, Edit, Search, MoreHorizontalIcon, PenBox, Share } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import useDebounce from "@/hooks/use-debounce";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ITEM_HEIGHT = 80;

// Mock invoice data generator
const generateMockInvoices = (count: number) => {
  const statuses = ["pending", "done", "draft", "failed"] as const;
  const invoices = [];

  for (let i = 1; i <= count; i++) {
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    const randomAmount = Math.floor(Math.random() * 100) + 100;
    const randomDaysAgo = Math.floor(Math.random() * 365);
    const date = new Date();
    date.setDate(date.getDate() - randomDaysAgo);

    invoices.push({
      id: `inv-${i}`,
      invoiceNumber: `INV-${String(i).padStart(5, "0")}`,
      amount: randomAmount,
      status: randomStatus,
      date: date,
      clientName: `Client ${String.fromCharCode(65 + (i % 26))}`,
    });
  }

  return invoices.sort((a, b) => b.date.getTime() - a.date.getTime());
};

type Invoice = ReturnType<typeof generateMockInvoices>[0];

// Optimized Invoice Item Component
const InvoiceItem = React.memo(
  ({ invoice }: { invoice: Invoice }) => {
    const formattedDate = useMemo(() => {
      return invoice.date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }, [invoice.date]);

    const statusConfig = {
      pending: { variant: "warning" as const, label: "Pending", icon: "icon-[lucide--clock-4]" },
      done: { variant: "success" as const, label: "Done", icon: "icon-[lucide--check]" },
      draft: { variant: "primary" as const, label: "In Progress", icon: "icon-[mingcute--loading-fill]" },
      failed: { variant: "destructive" as const, label: "Failed", icon: "icon-[lucide--circle-x]" },
    };

    const { variant, label, icon } = statusConfig[invoice.status];

    return (
      <Link href={`/app/records`}>
        <div className="flex items-center gap-4 p-4 cursor-pointer transition-colors hover:bg-accent/50 border-b border-border" style={{ height: `${ITEM_HEIGHT}px` }}>
          <div className="flex items-center justify-center size-10 rounded-lg ">
            <svg className="icon-[hugeicons--file-01] size-7 text-foreground/60" />
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm">{invoice.invoiceNumber}</p>
              <Badge variant={variant}>
                <svg className={icon} />
                {label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">{formattedDate}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-semibold text-sm">{invoice.amount.toFixed(3)} BD</p>
              <p className="text-xs text-muted-foreground">{invoice.clientName}</p>
            </div>

            <div className="flex items-center gap-1">
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" onClick={e => e.preventDefault()} aria-label="Open menu" size="icon-sm">
                    <MoreHorizontalIcon />
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

export default function InvoicesPage() {
  const parentRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [, set] = useState<string>("all");
  const [isLoading] = useState(false);

  const debouncedSearch = useDebounce(search, 200);

  // Generate mock data (in real app, this would come from API)
  const ALL_INVOICES = useMemo(() => generateMockInvoices(1000), []);

  // Calculate stats
  const stats = useMemo(() => {
    const total = ALL_INVOICES.length;
    const paidAmount = ALL_INVOICES.filter(inv => inv.status === "done").reduce((sum, inv) => sum + inv.amount, 0);
    const pendingAmount = ALL_INVOICES.filter(inv => inv.status === "pending").reduce((sum, inv) => sum + inv.amount, 0);

    return { total, paidAmount, pendingAmount };
  }, [ALL_INVOICES]);

  // Optimized filtering with multiple filters
  const filteredInvoices = useMemo(() => {
    let results = ALL_INVOICES;

    // Status filter
    if (statusFilter !== "all") {
      results = results.filter(inv => inv.status === statusFilter);
    }

    // Search filter
    if (debouncedSearch.trim()) {
      const searchLower = debouncedSearch.toLowerCase().trim();
      results = results.filter(inv => inv.invoiceNumber.toLowerCase().includes(searchLower) || inv.clientName.toLowerCase().includes(searchLower) || inv.amount.toString().includes(searchLower));
    }

    return results;
  }, [ALL_INVOICES, debouncedSearch, statusFilter]);

  const count = filteredInvoices.length;

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

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
        <p className="ms-2 text-muted-foreground">Loading invoices...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 p-2">
          <InputGroup className="flex-1 w-full min-w-46 bg-card">
            <Label>
              <Search className="size-4 ms-3 text-foreground/60" />
              <InputGroupInput placeholder="Search..." value={search} onChange={handleSearchChange} autoComplete="off" spellCheck="false" />
            </Label>
          </InputGroup>

          <Tabs className="w-full" defaultValue="all" onValueChange={setStatusFilter}>
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
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="rounded-full bg-muted p-6 mb-4">
                <FileText className="size-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No invoices found</h3>
              <p className="text-sm text-muted-foreground mb-6">{debouncedSearch ? `No invoices matching "${debouncedSearch}"` : "Try adjusting your filters"}</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
              >
                Clear filters
              </Button>
            </div>
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
