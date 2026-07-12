'use client';

import { Loader2, TriangleAlert } from 'lucide-react';
import * as React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppAbility } from '@/hooks/use-app-ability';
import { trpc } from '@/lib/trpc/client';
import { MasterTab } from './master-tab';
import { SuppliersTab } from './suppliers-tab';
import { useItemForm } from './use-item-form';
import type { Mode } from './use-item-form';

// ---------------------------------------------------------------------------
// Validation Alert (banner at top of dialog)
// ---------------------------------------------------------------------------

function ValidationAlert({
  errors,
}: {
  errors: { master: Record<string, string | undefined>; suppliers: Record<string, any> };
}) {
  const messages: string[] = [];

  Object.values(errors.master).forEach((msg) => {
    if (msg) messages.push(msg);
  });

  Object.values(errors.suppliers).forEach((draftErrors) => {
    Object.values(draftErrors).forEach((msg) => {
      if (msg && typeof msg === 'string') messages.push(msg);
    });
  });

  if (messages.length === 0) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <TriangleAlert className="h-4 w-4" />
      <AlertTitle>Please fix the following</AlertTitle>
      <AlertDescription>
        <ul className="mt-1 list-disc pl-4 space-y-0.5 text-sm">
          {messages.map((msg, i) => (
            <li key={`${msg}-${i}`}>{msg}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

// ---------------------------------------------------------------------------
// Existing Item Preview
// ---------------------------------------------------------------------------

function ExistingPreview({ item }: { item: any }) {
  if (!item) return null;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border p-4 bg-muted/30 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-lg">{item.name}</span>
          <span className="text-sm text-muted-foreground">({item.sku})</span>
        </div>
        {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
        <div className="flex gap-4 text-sm">
          {item.type && (
            <span>
              <span className="text-muted-foreground">Type:</span> {item.type}
            </span>
          )}
          {item.unit && (
            <span>
              <span className="text-muted-foreground">Unit:</span> {item.unit}
            </span>
          )}
          {item.salesPrice !== undefined && (
            <span>
              <span className="text-muted-foreground">Price:</span> {Number(item.salesPrice)}
            </span>
          )}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        This item already exists. You can add supplier prices to it on the Suppliers tab.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dialog Component
// ---------------------------------------------------------------------------

export interface UnifiedItemDialogProps {
  /** When provided, the dialog is externally controlled (used by the Provider). */
  open?: boolean;
  /** Required when `open` is provided. */
  onOpenChange?: (open: boolean) => void;
  /** Pre-selected supplier for "add-supplier" mode */
  initialSupplierId?: string;
  /** Pre-existing item for "add-supplier" mode */
  initialItem?: any;
  /** Initial mode override */
  initialMode?: Mode;
  onSuccess?: (itemId: string) => void;
  /** Rendered as the DialogTrigger — clicking it opens the dialog. */
  children?: React.ReactNode;
}

export function UnifiedItemDialog({
  open: openProp,
  onOpenChange: onOpenChangeProp,
  initialSupplierId,
  initialItem,
  initialMode,
  onSuccess,
  children,
}: UnifiedItemDialogProps) {
  // ── Internal open state (used when no props are passed) ──────────────
  const [internalOpen, setInternalOpen] = React.useState(false);

  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp! : internalOpen;

  const handleClose = React.useCallback(
    (nextOpen: boolean) => {
      if (isControlled) {
        onOpenChangeProp?.(nextOpen);
      } else {
        setInternalOpen(nextOpen);
      }
    },
    [isControlled, onOpenChangeProp],
  );

  const ability = useAppAbility();
  const canManageMaster = ability
    ? ability.can('item:create', 'Item') || ability.can('item:update', 'Item')
    : true;
  const canManageSupplierItems = ability ? ability.can('po:update', 'all') : true;

  const { data: suppliersData } = trpc.suppliers.list.useQuery({ limit: 200 }, { enabled: open });
  const suppliers = React.useMemo(() => {
    const list = Array.isArray(suppliersData) ? suppliersData : (suppliersData?.data ?? []);
    return list;
  }, [suppliersData]);

  const form = useItemForm({
    open,
    onOpenChange: handleClose,
    initialSupplierId,
    initialItem,
    onSuccess,
  });

  const { mode, errors, isSubmitting, submit } = form;

  // Override mode if initialMode is provided
  React.useEffect(() => {
    if (open && initialMode) {
      form.setMode(initialMode);
    }
  }, [open, initialMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Determine default tab
  const defaultTab = mode === 'add-supplier' ? 'suppliers' : 'master';

  const getTitle = () => {
    switch (mode) {
      case 'existing':
        return 'Add Supplier Price';
      case 'add-supplier':
        return 'Add Supplier Price';
      case 'create':
      default:
        return 'Create Item';
    }
  };

  const getSubmitLabel = () => {
    switch (mode) {
      case 'existing':
        return 'Add Supplier Price';
      case 'add-supplier':
        return 'Add Supplier Price';
      case 'create':
      default:
        return 'Create Item';
    }
  };

  const hasErrors =
    Object.keys(errors.master).length > 0 ||
    Object.values(errors.suppliers).some((e) => Object.keys(e).length > 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !isSubmitting && handleClose(v)}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-120">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>
            {mode === 'existing' || mode === 'add-supplier'
              ? 'Add supplier pricing to an existing item.'
              : 'Fill in the item details and attach supplier prices.'}
          </DialogDescription>
        </DialogHeader>

        {hasErrors && <ValidationAlert errors={errors} />}

        <Tabs defaultValue={defaultTab}>
          <TabsList>
            <TabsTrigger value="master" disabled={mode === 'add-supplier'}>
              Item Master
            </TabsTrigger>
            <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
            {(mode === 'existing' || mode === 'add-supplier') && (
              <TabsTrigger value="existing">Existing</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="master" className="max-h-96 overflow-y-auto pr-2">
            <MasterTab form={form} canManageMaster={canManageMaster} />
          </TabsContent>

          <TabsContent value="suppliers" className="max-h-96 overflow-y-auto pr-2">
            <SuppliersTab
              form={form}
              suppliers={suppliers}
              canManageSupplierItems={canManageSupplierItems}
            />
          </TabsContent>

          {(mode === 'existing' || mode === 'add-supplier') && (
            <TabsContent value="existing">
              <ExistingPreview item={form.existingMaster} />
            </TabsContent>
          )}
        </Tabs>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => submit(true)}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save & Add Another
          </Button>
          <Button type="button" onClick={() => submit()} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {getSubmitLabel()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Provider + Hook
// ---------------------------------------------------------------------------

interface OpenCreateOptions {
  onSuccess?: (id: string) => void;
}

interface OpenAddSupplierOptions {
  item: any;
  supplierId?: string;
  onSuccess?: (id: string) => void;
}

interface UnifiedItemFormContextValue {
  openCreate: (options?: OpenCreateOptions) => void;
  openAddSupplier: (options: OpenAddSupplierOptions) => void;
}

const UnifiedItemFormContext = React.createContext<UnifiedItemFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  initialItem?: any;
  initialSupplierId?: string;
  initialMode?: Mode;
  onSuccess?: (id: string) => void;
}

export function UnifiedItemFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenCreateOptions) => {
    setState({ open: true, onSuccess: options?.onSuccess });
  }, []);

  const openAddSupplier = React.useCallback((options: OpenAddSupplierOptions) => {
    setState({
      open: true,
      initialItem: options.item,
      initialSupplierId: options.supplierId,
      initialMode: 'add-supplier',
      onSuccess: options.onSuccess,
    });
  }, []);

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <UnifiedItemFormContext.Provider value={{ openCreate, openAddSupplier }}>
      {children}
      <UnifiedItemDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        initialItem={state.initialItem}
        initialSupplierId={state.initialSupplierId}
        initialMode={state.initialMode}
        onSuccess={state.onSuccess}
      />
    </UnifiedItemFormContext.Provider>
  );
}

export function useUnifiedItemForm(): UnifiedItemFormContextValue {
  const ctx = React.useContext(UnifiedItemFormContext);
  if (!ctx) throw new Error('useUnifiedItemForm must be used inside <UnifiedItemFormProvider>');
  return ctx;
}
