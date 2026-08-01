'use client';

import {
  AlertTriangle,
  ArrowUpDown,
  Banknote,
  Boxes,
  FileClock,
  FileText,
  HandCoins,
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
  Truck,
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

export type HardDeleteKind = 'invoice' | 'item';

export interface HardDeleteTarget {
  kind: HardDeleteKind;
  id: string;
  /** serial for documents, name/SKU for items */
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

const INVOICE_ROWS: RelatedRow[] = [
  { key: 'lines', icon: FileText, labelKey: 'hardDelete.lines' },
  { key: 'payments', icon: HandCoins, labelKey: 'hardDelete.payments' },
  { key: 'incomes', icon: Banknote, labelKey: 'hardDelete.incomes' },
  { key: 'journalEntries', icon: Landmark, labelKey: 'hardDelete.journalEntries' },
  { key: 'stockMovements', icon: Package, labelKey: 'hardDelete.stockMovements' },
  { key: 'creditNoteAllocations', icon: Link2, labelKey: 'hardDelete.creditNoteAllocations' },
  { key: 'creditNotes', icon: RotateCcw, labelKey: 'hardDelete.creditNotes' },
  { key: 'conversions', icon: Receipt, labelKey: 'hardDelete.conversions' },
  { key: 'auditLogs', icon: History, labelKey: 'hardDelete.auditLogs' },
  { key: 'approvalRequests', icon: FileClock, labelKey: 'hardDelete.approvalRequests' },
  { key: 'tags', icon: Tags, labelKey: 'hardDelete.tags' },
  { key: 'notifications', icon: ShieldAlert, labelKey: 'hardDelete.notifications' },
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
  { key: 'auditLogs', icon: History, labelKey: 'hardDelete.auditLogs' },
  { key: 'tags', icon: Tags, labelKey: 'hardDelete.tags' },
  { key: 'notifications', icon: ShieldAlert, labelKey: 'hardDelete.notifications' },
  { key: 'attachments', icon: Paperclip, labelKey: 'hardDelete.attachments' },
];

interface BodyProps {
  target: HardDeleteTarget;
  onPendingChange: (pending: boolean) => void;
  onDone: () => void;
  onSuccess?: () => void;
}

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

function InvoiceHardDeleteBody({ target, onPendingChange, onDone, onSuccess }: BodyProps) {
  const t = useTranslations();
  const utils = trpc.useUtils();

  const { data: info, isLoading } = trpc.invoices.hardDeleteInfo.useQuery(
    { id: target.id },
    { enabled: !!target.id },
  );

  const mutation = trpc.invoices.hardDelete.useMutation({
    onSuccess: () => {
      utils.invoices.list.invalidate();
      utils.invoices.byId.invalidate({ id: target.id });
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
            <RelatedRows rows={INVOICE_ROWS} info={info as unknown as InfoRecord} />
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

function ItemHardDeleteBody({ target, onPendingChange, onDone, onSuccess }: BodyProps) {
  const t = useTranslations();
  const utils = trpc.useUtils();

  const { data: info, isLoading } = trpc.items.hardDeleteInfo.useQuery(
    { id: target.id },
    { enabled: !!target.id },
  );

  const mutation = trpc.items.hardDelete.useMutation({
    onSuccess: () => {
      utils.items.list.invalidate();
      utils.items.byId.invalidate({ id: target.id });
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
            <RelatedRows rows={ITEM_ROWS} info={info as unknown as InfoRecord} />
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

  const title = target?.kind === 'item' ? t('hardDelete.titleItem') : t('hardDelete.title');

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="size-5 text-destructive" />
            {title}
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

        {target?.kind === 'item' ? (
          <ItemHardDeleteBody
            target={target}
            onPendingChange={setIsPending}
            onDone={() => onOpenChange(false)}
            onSuccess={onSuccess}
          />
        ) : target?.kind === 'invoice' ? (
          <InvoiceHardDeleteBody
            target={target}
            onPendingChange={setIsPending}
            onDone={() => onOpenChange(false)}
            onSuccess={onSuccess}
          />
        ) : null}
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
