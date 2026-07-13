'use client';

import { useTranslations } from 'next-intl';
import { SlidersHorizontal, X, List, Table2, Plus, Search } from 'lucide-react';
import { useQueryState, parseAsString } from 'nuqs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

const STATUS_FILTERS = [
  { value: '', labelKey: 'common.all' as const },
  { value: 'DRAFT', labelKey: 'invoices.draft' as const },
  { value: 'SENT', labelKey: 'invoices.sent' as const },
  { value: 'APPROVED', labelKey: 'invoices.approved' as const },
  { value: 'CANCELLED', labelKey: 'invoices.cancelled' as const },
];

const PAYMENT_STATUS_FILTERS = [
  { value: 'all', labelKey: 'common.all' as const },
  { value: 'PENDING', labelKey: 'common.pending' as const },
  { value: 'PARTIAL', labelKey: 'common.partial' as const },
  { value: 'PAID', labelKey: 'common.paid' as const },
  { value: 'OVERDUE', labelKey: 'common.overdue' as const },
];

const SEARCH_ATTRIBUTES = [
  { value: 'serial', labelKey: 'common.serial' as const },
  { value: 'customer', labelKey: 'common.customer' as const },
  { value: 'date', labelKey: 'common.date' as const },
];

interface DocumentFilterBarProps {
  type: string;
  showPaymentFilter?: boolean;
  onCreate: () => void;
}

export function DocumentFilterBar({
  type,
  showPaymentFilter = false,
  onCreate,
}: DocumentFilterBarProps) {
  const t = useTranslations();

  const [statusFilter, setStatusFilter] = useQueryState(
    'status',
    parseAsString.withDefault('')
  );
  const [paymentStatusFilter, setPaymentStatusFilter] = useQueryState(
    'paymentStatus',
    parseAsString.withDefault('all')
  );
  const [viewMode, setViewMode] = useQueryState(
    'view',
    parseAsString.withDefault('list')
  );
  const [searchQuery, setSearchQuery] = useQueryState(
    'q',
    parseAsString.withDefault('')
  );
  const [searchAttribute, setSearchAttribute] = useQueryState(
    'searchBy',
    parseAsString.withDefault('serial')
  );

  const activeFilterCount =
    (statusFilter ? 1 : 0) +
    (paymentStatusFilter !== 'all' ? 1 : 0) +
    (searchQuery ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  const clearFilters = () => {
    setStatusFilter(null);
    setPaymentStatusFilter(null);
    setSearchQuery(null);
  };

  return (
    <div className="w-full flex items-center justify-between gap-2 border-b px-4 py-2 shrink-0">
      {/* Left: Create Button + Filter Drawer */}
      <div className="flex items-center gap-2">
        {/* Create Button */}
        <Button size="sm" onClick={onCreate}>
          <Plus className="size-3.5" />
          <span className="hidden sm:inline">{t('invoices.newInvoice')}</span>
        </Button>

        <Separator orientation="vertical" className="h-5" />

        {/* Filter Drawer Trigger */}
        <Drawer direction="right">
          <DrawerTrigger asChild>
            <Button variant="outline" size="sm" className="relative gap-1.5">
              <SlidersHorizontal className="size-3.5" />
              <span className="hidden sm:inline">{t('common.filter')}</span>
              {hasActiveFilters && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px] rounded-full"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </DrawerTrigger>
          <DrawerContent className="w-[340px] sm:w-[380px]">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <SlidersHorizontal className="size-4" />
                {t('common.filter')}
              </DrawerTitle>
              <DrawerDescription>
                {t('common.filterDescription')}
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-4 space-y-5 overflow-y-auto flex-1">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {t('common.search')}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value || null)}
                      placeholder={`${t('common.search')}...`}
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                  <Select value={searchAttribute} onValueChange={(v) => setSearchAttribute(v)}>
                    <SelectTrigger className="h-8 w-[110px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEARCH_ATTRIBUTES.map((attr) => (
                        <SelectItem key={attr.value} value={attr.value} className="text-xs">
                          {t(attr.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {t('common.status')}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_FILTERS.map((f) => (
                    <Button
                      key={f.value}
                      variant={statusFilter === f.value ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setStatusFilter(f.value || null)}
                    >
                      {t(f.labelKey)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Payment Status Filter (only for invoices) */}
              {showPaymentFilter && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('common.payment')}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {PAYMENT_STATUS_FILTERS.map((f) => (
                      <Button
                        key={f.value}
                        variant={paymentStatusFilter === f.value ? 'default' : 'outline'}
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setPaymentStatusFilter(f.value === 'all' ? null : f.value)}
                      >
                        {t(f.labelKey)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DrawerFooter className="flex-row items-center justify-between border-t pt-4">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="size-3.5 mr-1" />
                  {t('common.clearFilters')}
                </Button>
              )}
              <DrawerClose asChild>
                <Button variant="outline" size="sm" className="ml-auto">
                  {t('common.done')}
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Right: View Toggle */}
      <div className="flex items-center gap-2">
        {/* View Mode Toggle */}
        <TooltipProvider>
          <div className="flex items-center rounded-lg border p-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setViewMode('list')}
                >
                  <List className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{t('common.listView')}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setViewMode('table')}
                >
                  <Table2 className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{t('common.tableView')}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}
