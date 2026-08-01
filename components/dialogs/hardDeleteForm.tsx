'use client';

import {
  AlertTriangle,
  Banknote,
  FileClock,
  FileText,
  HandCoins,
  History,
  Landmark,
  Link2,
  Loader2,
  Package,
  Receipt,
  RotateCcw,
  ShieldAlert,
  Tags,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
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

interface RelatedRow {
  key: keyof HardDeleteInfoData;
  icon: LucideIcon;
  labelKey: string;
}

type HardDeleteInfoData = {
  lines: number;
  payments: number;
  incomes: number;
  journalEntries: number;
  stockMovements: number;
  creditNoteAllocations: number;
  creditNotes: number;
  conversions: number;
  auditLogs: number;
  approvalRequests: number;
  tags: number;
  notifications: number;
};

const RELATED_ROWS: RelatedRow[] = [
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

export interface HardDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: { id: string; serial?: string };
  onSuccess?: () => void;
}

export function HardDeleteDialog({
  open,
  onOpenChange,
  invoice,
  onSuccess,
}: HardDeleteDialogProps) {
  const t = useTranslations();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: info, isLoading } = trpc.invoices.hardDeleteInfo.useQuery(
    { id: invoice?.id ?? '' },
    { enabled: open && !!invoice?.id },
  );

  const hardDeleteMutation = trpc.invoices.hardDelete.useMutation({
    onSuccess: () => {
      utils.invoices.list.invalidate();
      if (invoice?.id) utils.invoices.byId.invalidate({ id: invoice.id });
      toast.success(t('hardDelete.success'));
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const isPending = hardDeleteMutation.isPending;

  const totalRelated = info
    ? RELATED_ROWS.reduce((sum, row) => sum + Number((info as HardDeleteInfoData)[row.key] ?? 0), 0)
    : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="size-5 text-destructive" />
            {t('hardDelete.title')}
          </DialogTitle>
          <DialogDescription>
            {t('hardDelete.description', { serial: invoice?.serial ?? '' })}
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>{t('hardDelete.warningTitle')}</AlertTitle>
          <AlertDescription>{t('hardDelete.warningDescription')}</AlertDescription>
        </Alert>

        <Separator />

        <div>
          <p className="text-sm font-medium mb-2">{t('hardDelete.relatedRecords')}</p>
          {isLoading || !info ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="max-h-64">
              <ul className="space-y-1.5">
                {RELATED_ROWS.filter((row) => (info as HardDeleteInfoData)[row.key] > 0).map(
                  (row) => (
                    <li
                      key={row.key}
                      className="flex items-center justify-between text-sm rounded-md px-2 py-1.5 hover:bg-muted/50"
                    >
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <row.icon className="size-4" />
                        {t(row.labelKey as any)}
                      </span>
                      <Badge variant="outline" className="tabular-nums">
                        {(info as HardDeleteInfoData)[row.key]}
                      </Badge>
                    </li>
                  ),
                )}
                {totalRelated === 0 && (
                  <li className="text-sm text-muted-foreground px-2 py-1.5">
                    {t('hardDelete.noRelatedRecords')}
                  </li>
                )}
              </ul>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            disabled={isPending || !invoice?.id || !info}
            onClick={() => invoice?.id && hardDeleteMutation.mutate({ id: invoice.id })}
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            <Trash2 className="mr-2 size-4" />
            {t('hardDelete.confirmLabel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Context for imperative open/close
interface OpenOptions {
  onSuccess?: () => void;
}

interface InvoiceData {
  id: string;
  serial?: string;
}

interface HardDeleteContextValue {
  openDialog: (invoice: InvoiceData, options?: OpenOptions) => void;
}

const HardDeleteContext = React.createContext<HardDeleteContextValue | null>(null);

interface DialogState {
  open: boolean;
  invoice?: InvoiceData;
  onSuccess?: () => void;
}

export function HardDeleteFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openDialog = React.useCallback((invoice: InvoiceData, options?: OpenOptions) => {
    setState({ open: true, invoice, onSuccess: options?.onSuccess });
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
        invoice={state.invoice}
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
