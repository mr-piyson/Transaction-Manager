'use client';

import {
  AlertTriangle,
  ArrowUpDown,
  Banknote,
  Boxes,
  FileClock,
  FileText,
  HandCoins,
  Handshake,
  History,
  Landmark,
  Layers,
  Link2,
  Loader2,
  Package,
  Paperclip,
  Receipt,
  RotateCcw,
  ShieldAlert,
  ShoppingCart,
  Tags,
  Trash2,
  TrendingUp,
  Truck,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { trpc } from '@/lib/trpc/client';

export type HardDeleteKind =
  | 'invoice'
  | 'item'
  | 'customer'
  | 'supplier'
  | 'warehouse'
  | 'po'
  | 'contract';

export interface HardDeleteTarget {
  kind: HardDeleteKind;
  id: string;
  /** serial for documents, name/SKU for master records */
  title?: string;
}

interface RelatedRow {
  key: string;
  icon: LucideIcon;
  labelKey: string;
  /** Row is severed (unlinked) rather than physically deleted. */
  unlink?: boolean;
}

type InfoRecord = Record<string, number>;

// ---------------------------------------------------------------------------
// Per-kind related-row lists
// ---------------------------------------------------------------------------

const POLYMORPHIC_ROWS: RelatedRow[] = [
  { key: 'auditLogs', icon: History, labelKey: 'hardDelete.auditLogs' },
  { key: 'tags', icon: Tags, labelKey: 'hardDelete.tags' },
  { key: 'notifications', icon: ShieldAlert, labelKey: 'hardDelete.notifications' },
  { key: 'attachments', icon: Paperclip, labelKey: 'hardDelete.attachments' },
];

const INVOICE_ROWS: RelatedRow[] = [
  { key: 'lines', icon: FileText, labelKey: 'hardDelete.lines' },
  { key: 'payments', icon: HandCoins, labelKey: 'hardDelete.payments' },
  { key: 'incomes', icon: Banknote, labelKey: 'hardDelete.incomes' },
  { key: 'journalEntries', icon: Landmark, labelKey: 'hardDelete.journalEntries' },
  { key: 'stockMovements', icon: Package, labelKey: 'hardDelete.stockMovements' },
  { key: 'creditNoteAllocations', icon: Link2, labelKey: 'hardDelete.creditNoteAllocations' },
  { key: 'creditNotes', icon: RotateCcw, labelKey: 'hardDelete.creditNotes' },
  { key: 'conversions', icon: Receipt, labelKey: 'hardDelete.conversions' },
  { key: 'approvalRequests', icon: FileClock, labelKey: 'hardDelete.approvalRequests' },
  ...POLYMORPHIC_ROWS,
];

const ITEM_ROWS: RelatedRow[] = [
  { key: 'stock', icon: Boxes, labelKey: 'hardDelete.stock' },
  { key: 'stockMovements', icon: ArrowUpDown, labelKey: 'hardDelete.stockMovements' },
  { key: 'supplierItems', icon: Truck, labelKey: 'hardDelete.supplierItems' },
  { key: 'bundleLines', icon: Layers, labelKey: 'hardDelete.bundleLines' },
  { key: 'priceListLines', icon: Tags, labelKey: 'hardDelete.priceListLines' },
  { key: 'purchaseLines', icon: ShoppingCart, labelKey: 'hardDelete.purchaseLines' },
  { key: 'invoiceLines', icon: Receipt, labelKey: 'hardDelete.invoiceLines', unlink: true },
  { key: 'expenses', icon: Wallet, labelKey: 'hardDelete.expenses', unlink: true },
  ...POLYMORPHIC_ROWS,
];

const CUSTOMER_ROWS: RelatedRow[] = [
  { key: 'invoices', icon: FileText, labelKey: 'hardDelete.invoices' },
  { key: 'contracts', icon: Handshake, labelKey: 'hardDelete.contracts' },
  { key: 'incomes', icon: Banknote, labelKey: 'hardDelete.incomes' },
  { key: 'crmContacts', icon: Users, labelKey: 'hardDelete.contacts' },
  { key: 'crmOpportunities', icon: TrendingUp, labelKey: 'hardDelete.opportunities' },
  { key: 'crmLeads', icon: UserPlus, labelKey: 'hardDelete.leads' },
  ...POLYMORPHIC_ROWS,
];

const SUPPLIER_ROWS: RelatedRow[] = [
  { key: 'supplierItems', icon: Truck, labelKey: 'hardDelete.supplierItems' },
  { key: 'purchaseOrders', icon: ShoppingCart, labelKey: 'hardDelete.purchaseOrders' },
  ...POLYMORPHIC_ROWS,
];

const WAREHOUSE_ROWS: RelatedRow[] = [
  { key: 'stock', icon: Boxes, labelKey: 'hardDelete.stock' },
  { key: 'stockMovements', icon: ArrowUpDown, labelKey: 'hardDelete.stockMovements' },
  { key: 'invoices', icon: FileText, labelKey: 'hardDelete.invoices' },
  { key: 'purchaseOrders', icon: ShoppingCart, labelKey: 'hardDelete.purchaseOrders' },
  ...POLYMORPHIC_ROWS,
];

const PO_ROWS: RelatedRow[] = [
  { key: 'lines', icon: FileText, labelKey: 'hardDelete.lines' },
  { key: 'payments', icon: HandCoins, labelKey: 'hardDelete.payments' },
  { key: 'stockMovements', icon: Package, labelKey: 'hardDelete.stockMovements' },
  { key: 'journalEntries', icon: Landmark, labelKey: 'hardDelete.journalEntries' },
  { key: 'approvalRequests', icon: FileClock, labelKey: 'hardDelete.approvalRequests' },
  ...POLYMORPHIC_ROWS,
];

const CONTRACT_ROWS: RelatedRow[] = [...POLYMORPHIC_ROWS];

// ---------------------------------------------------------------------------
// tRPC hook registry (config-driven)
// ---------------------------------------------------------------------------

interface InfoQueryResult {
  data?: InfoRecord;
  isLoading: boolean;
}

interface DeleteMutationLike {
  isPending: boolean;
  mutate: (input: { id: string }) => void;
}

interface InfoHookLike {
  (input: { id: string }, opts: { enabled: boolean }): InfoQueryResult;
}

interface DeleteHookLike {
  (opts: {
    onSuccess?: () => void;
    onError?: (error: { message: string }) => void;
  }): DeleteMutationLike;
}

type Utils = ReturnType<typeof trpc.useUtils>;

type HardDeleteTitleKey =
  | 'hardDelete.title'
  | 'hardDelete.titleItem'
  | 'hardDelete.titleCustomer'
  | 'hardDelete.titleSupplier'
  | 'hardDelete.titleWarehouse'
  | 'hardDelete.titlePo'
  | 'hardDelete.titleContract';

interface KindConfig {
  rows: RelatedRow[];
  titleKey: HardDeleteTitleKey;
  invalidate: (utils: Utils, id: string) => void;
}

const KIND_CONFIG: Record<HardDeleteKind, KindConfig> = {
  invoice: {
    rows: INVOICE_ROWS,
    titleKey: 'hardDelete.title',
    invalidate: (utils, id) => {
      utils.invoices.list.invalidate();
      utils.invoices.byId.invalidate({ id });
    },
  },
  item: {
    rows: ITEM_ROWS,
    titleKey: 'hardDelete.titleItem',
    invalidate: (utils, id) => {
      utils.items.list.invalidate();
      utils.items.byId.invalidate({ id });
    },
  },
  customer: {
    rows: CUSTOMER_ROWS,
    titleKey: 'hardDelete.titleCustomer',
    invalidate: (utils, id) => {
      utils.customers.list.invalidate();
      utils.customers.byId.invalidate({ id });
    },
  },
  supplier: {
    rows: SUPPLIER_ROWS,
    titleKey: 'hardDelete.titleSupplier',
    invalidate: (utils, id) => {
      utils.suppliers.list.invalidate();
      utils.suppliers.byId.invalidate({ id });
    },
  },
  warehouse: {
    rows: WAREHOUSE_ROWS,
    titleKey: 'hardDelete.titleWarehouse',
    invalidate: (utils, id) => {
      utils.warehouses.list.invalidate();
      utils.warehouses.byId.invalidate({ id });
    },
  },
  po: {
    rows: PO_ROWS,
    titleKey: 'hardDelete.titlePo',
    invalidate: (utils, id) => {
      utils.purchaseOrders.list.invalidate();
      utils.purchaseOrders.byId.invalidate({ id });
    },
  },
  contract: {
    rows: CONTRACT_ROWS,
    titleKey: 'hardDelete.titleContract',
    invalidate: (utils, id) => {
      utils.contracts.list.invalidate();
      utils.contracts.byId.invalidate({ id });
    },
  },
};

const KIND_HOOKS: Record<HardDeleteKind, { useInfo: InfoHookLike; useDelete: DeleteHookLike }> = {
  invoice: {
    useInfo: trpc.invoices.hardDeleteInfo.useQuery as unknown as InfoHookLike,
    useDelete: trpc.invoices.hardDelete.useMutation as unknown as DeleteHookLike,
  },
  item: {
    useInfo: trpc.items.hardDeleteInfo.useQuery as unknown as InfoHookLike,
    useDelete: trpc.items.hardDelete.useMutation as unknown as DeleteHookLike,
  },
  customer: {
    useInfo: trpc.customers.hardDeleteInfo.useQuery as unknown as InfoHookLike,
    useDelete: trpc.customers.hardDelete.useMutation as unknown as DeleteHookLike,
  },
  supplier: {
    useInfo: trpc.suppliers.hardDeleteInfo.useQuery as unknown as InfoHookLike,
    useDelete: trpc.suppliers.hardDelete.useMutation as unknown as DeleteHookLike,
  },
  warehouse: {
    useInfo: trpc.warehouses.hardDeleteInfo.useQuery as unknown as InfoHookLike,
    useDelete: trpc.warehouses.hardDelete.useMutation as unknown as DeleteHookLike,
  },
  po: {
    useInfo: trpc.purchaseOrders.hardDeleteInfo.useQuery as unknown as InfoHookLike,
    useDelete: trpc.purchaseOrders.hardDelete.useMutation as unknown as DeleteHookLike,
  },
  contract: {
    useInfo: trpc.contracts.hardDeleteInfo.useQuery as unknown as InfoHookLike,
    useDelete: trpc.contracts.hardDelete.useMutation as unknown as DeleteHookLike,
  },
};

// ---------------------------------------------------------------------------
// Shared body UI
// ---------------------------------------------------------------------------

function RelatedRows({ rows, info }: { rows: RelatedRow[]; info?: InfoRecord }) {
  const t = useTranslations();
  const totalRelated = info ? rows.reduce((sum, row) => sum + Number(info[row.key] ?? 0), 0) : 0;

  if (!info) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (totalRelated === 0) {
    return (
      <li className="text-sm text-muted-foreground px-2 py-1.5">
        {t('hardDelete.noRelatedRecords')}
      </li>
    );
  }

  return (
    <ul className="space-y-1.5">
      {rows
        .filter((row) => Number(info[row.key] ?? 0) > 0)
        .map((row) => (
          <li
            key={row.key}
            className="flex items-center justify-between text-sm rounded-md px-2 py-1.5 hover:bg-muted/50"
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <row.icon className="size-4 shrink-0" />
              {t(row.labelKey as any)}
            </span>
            <span className="flex items-center gap-2">
              {row.unlink && (
                <Badge variant="secondary" className="text-[10px] font-normal">
                  {t('hardDelete.unlinked')}
                </Badge>
              )}
              <Badge variant="outline" className="tabular-nums">
                {info[row.key]}
              </Badge>
            </span>
          </li>
        ))}
    </ul>
  );
}

interface BodyProps {
  target: HardDeleteTarget;
  onPendingChange: (pending: boolean) => void;
  onDone: () => void;
  onSuccess?: () => void;
}

function HardDeleteBody({ target, onPendingChange, onDone, onSuccess }: BodyProps) {
  const t = useTranslations();
  const utils = trpc.useUtils();
  const config = KIND_CONFIG[target.kind];
  const { useInfo, useDelete } = KIND_HOOKS[target.kind];

  const { data: info, isLoading } = useInfo({ id: target.id }, { enabled: !!target.id });

  const mutation = useDelete({
    onSuccess: () => {
      config.invalidate(utils, target.id);
      toast.success(t('hardDelete.success'));
      onDone();
      onSuccess?.();
    },
    onError: (e) => toast.error(e.message),
  });

  React.useEffect(() => {
    onPendingChange(mutation.isPending);
  }, [mutation.isPending, onPendingChange]);

  return (
    <>
      <div>
        <p className="text-sm font-medium mb-2">{t('hardDelete.relatedRecords')}</p>
        <ScrollArea className="max-h-64">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <RelatedRows rows={config.rows} info={info} />
          )}
        </ScrollArea>
      </div>
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onDone} disabled={mutation.isPending}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="destructive"
          disabled={mutation.isPending || !info}
          onClick={() => mutation.mutate({ id: target.id })}
        >
          {mutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          <Trash2 className="mr-2 size-4" />
          {t('hardDelete.confirmLabel')}
        </Button>
      </DialogFooter>
    </>
  );
}

export interface HardDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target?: HardDeleteTarget;
  onSuccess?: () => void;
}

export function HardDeleteDialog({ open, onOpenChange, target, onSuccess }: HardDeleteDialogProps) {
  const t = useTranslations();
  const [isPending, setIsPending] = React.useState(false);

  const titleKey = target ? KIND_CONFIG[target.kind].titleKey : 'hardDelete.title';

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="size-5 text-destructive" />
            {t(titleKey)}
          </DialogTitle>
          <DialogDescription>
            {t('hardDelete.description', { name: target?.title ?? '' })}
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>{t('hardDelete.warningTitle')}</AlertTitle>
          <AlertDescription>{t('hardDelete.warningDescription')}</AlertDescription>
        </Alert>

        <Separator />

        {target && (
          <HardDeleteBody
            target={target}
            onPendingChange={setIsPending}
            onDone={() => onOpenChange(false)}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// Context for imperative open/close
interface OpenOptions {
  onSuccess?: () => void;
}

interface HardDeleteContextValue {
  openDialog: (target: HardDeleteTarget, options?: OpenOptions) => void;
}

const HardDeleteContext = React.createContext<HardDeleteContextValue | null>(null);

interface DialogState {
  open: boolean;
  target?: HardDeleteTarget;
  onSuccess?: () => void;
}

export function HardDeleteFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openDialog = React.useCallback((target: HardDeleteTarget, options?: OpenOptions) => {
    setState({ open: true, target, onSuccess: options?.onSuccess });
  }, []);

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <HardDeleteContext.Provider value={{ openDialog }}>
      {children}
      <HardDeleteDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        target={state.target}
        onSuccess={state.onSuccess}
      />
    </HardDeleteContext.Provider>
  );
}

export function useHardDeleteForm(): HardDeleteContextValue {
  const ctx = React.useContext(HardDeleteContext);
  if (!ctx) throw new Error('useHardDeleteForm must be used inside <HardDeleteFormProvider>');
  return ctx;
}
