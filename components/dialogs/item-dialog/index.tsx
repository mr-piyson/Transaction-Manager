"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useAppAbility } from "@/hooks/use-app-ability";
import { useSupplierForm } from "../supplierForm";
import { IdentitySection } from "./identity-section";
import { PricingSection } from "./pricing-section";
import { SectionRail } from "./section-rail";
import { SummaryPanel } from "./summary-panel";
import { SuppliersSection } from "./suppliers-section";
import { UnitsSection } from "./units-section";
import {
  type ItemIssue,
  type Mode,
  type SectionKey,
  useItemForm,
} from "./use-item-form";

export interface UnifiedItemDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialSupplierId?: string;
  initialItem?: any;
  initialMode?: Mode;
  editItemId?: string;
  onSuccess?: (itemId: string) => void;
  children?: React.ReactNode;
}

const SECTION_IDS: Record<SectionKey, string> = {
  identity: "sec-identity",
  units: "sec-units",
  pricing: "sec-pricing",
  suppliers: "sec-suppliers",
};

export function UnifiedItemDialog({
  open: openProp,
  onOpenChange: onOpenChangeProp,
  initialSupplierId,
  initialItem,
  editItemId,
  onSuccess,
  children,
}: UnifiedItemDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? !!openProp : internalOpen;

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (isControlled) onOpenChangeProp?.(next);
      else setInternalOpen(next);
    },
    [isControlled, onOpenChangeProp],
  );

  const form = useItemForm({
    open,
    onOpenChange: handleOpenChange,
    initialSupplierId,
    initialItem,
    editItemId,
    onSuccess,
  });

  const { openCreate: openCreateSupplier } = useSupplierForm();
  const ability = useAppAbility();
  const canManageMaster = ability ? ability.can("item:update", "Item") : true;
  const canManageSuppliers = ability
    ? ability.can("item:update", "Item")
    : true;

  const { mode, master, submit, isSubmitting } = form;
  const supplierMode = mode === "add-supplier" || mode === "existing";

  const [active, setActive] = React.useState<SectionKey>(
    supplierMode ? "suppliers" : "identity",
  );
  const scrollRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    setActive(supplierMode ? "suppliers" : "identity");
  }, [supplierMode]);

  // Scroll-spy
  React.useEffect(() => {
    if (!open) return;
    const root = scrollRef.current;
    if (!root) return;
    const nodes = Array.from(
      root.querySelectorAll<HTMLElement>("[data-section]"),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const key = entry.target.getAttribute("data-section");
            if (key) setActive(key as SectionKey);
          }
        }
      },
      { root, rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );
    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [open, mode]);

  const scrollToAnchor = React.useCallback((anchor: string) => {
    const el = document.getElementById(anchor);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const field = el.querySelector<HTMLElement>("input,select,textarea");
    field?.focus({ preventScroll: true });
  }, []);

  const handleSelect = React.useCallback((key: SectionKey) => {
    setActive(key);
    const el = document.getElementById(SECTION_IDS[key]);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleJump = React.useCallback(
    (issue: ItemIssue) => scrollToAnchor(issue.anchor),
    [scrollToAnchor],
  );

  const disabledSections: SectionKey[] = supplierMode
    ? ["identity", "units", "pricing"]
    : [];

  const header = React.useMemo(() => {
    if (mode === "edit") {
      return {
        eyebrow: `Editing ${master.sku || "item"}`,
        title: "Edit item",
        desc: "Change details, units or supplier prices. Everything saves together.",
      };
    }
    if (supplierMode) {
      return {
        eyebrow: "Existing item",
        title: "Add supplier price",
        desc: "This item already exists, so its details stay as they are.",
      };
    }
    return {
      eyebrow: "New item",
      title: "Create item",
    };
  }, [mode, supplierMode, master.sku]);

  const submitLabel =
    mode === "create"
      ? "Create item"
      : mode === "edit"
        ? "Save changes"
        : "Add supplier price";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !isSubmitting && handleOpenChange(v)}
    >
      {children}
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {header.eyebrow}
            </p>
            <h2 className="font-medium text-xl leading-tight">
              {header.title}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {header.desc}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <SectionRail
            form={form}
            active={active}
            disabledSections={disabledSections}
            onSelect={handleSelect}
          />
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
            <main
              ref={scrollRef}
              className="min-w-0 px-6 lg:flex-1 lg:overflow-y-auto"
            >
              {!supplierMode && (
                <>
                  <IdentitySection form={form} canManage={canManageMaster} />
                  <UnitsSection form={form} canManage={canManageMaster} />
                  <PricingSection form={form} canManage={canManageMaster} />
                </>
              )}
              <SuppliersSection
                form={form}
                canManage={canManageSuppliers}
                onNewSupplier={() =>
                  openCreateSupplier({
                    onSuccess: () => form.addSupplierDraft(),
                  })
                }
              />
            </main>
            <SummaryPanel form={form} onJump={handleJump} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-6 py-3">
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {form.dirty ? "Unsaved changes" : "No changes yet"}
          </span>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            {mode !== "edit" && (
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => submit(true)}
              >
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {supplierMode
                  ? "Save & add another supplier"
                  : "Save & add another"}
              </Button>
            )}
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => submit()}
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {submitLabel}
            </Button>
          </div>
        </div>
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

interface OpenEditOptions {
  itemId: string;
  onSuccess?: (id: string) => void;
}

interface UnifiedItemFormContextValue {
  openCreate: (options?: OpenCreateOptions) => void;
  openAddSupplier: (options: OpenAddSupplierOptions) => void;
  openEdit: (options: OpenEditOptions) => void;
}

const UnifiedItemFormContext =
  React.createContext<UnifiedItemFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  initialItem?: any;
  initialSupplierId?: string;
  initialMode?: Mode;
  editItemId?: string;
  onSuccess?: (id: string) => void;
}

export function UnifiedItemFormProvider({
  children,
}: {
  children?: React.ReactNode;
}) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenCreateOptions) => {
    setState({ open: true, onSuccess: options?.onSuccess });
  }, []);

  const openAddSupplier = React.useCallback(
    (options: OpenAddSupplierOptions) => {
      setState({
        open: true,
        initialItem: options.item,
        initialSupplierId: options.supplierId,
        initialMode: "add-supplier",
        onSuccess: options.onSuccess,
      });
    },
    [],
  );

  const openEdit = React.useCallback((options: OpenEditOptions) => {
    setState({
      open: true,
      editItemId: options.itemId,
      initialMode: "edit",
      onSuccess: options.onSuccess,
    });
  }, []);

  const contextValue = React.useMemo(
    () => ({ openCreate, openAddSupplier, openEdit }),
    [openCreate, openAddSupplier, openEdit],
  );

  return (
    <UnifiedItemFormContext.Provider value={contextValue}>
      {children}
      <UnifiedItemDialog
        open={state.open}
        onOpenChange={(v) => setState((prev) => ({ ...prev, open: v }))}
        initialItem={state.initialItem}
        initialSupplierId={state.initialSupplierId}
        initialMode={state.initialMode}
        editItemId={state.editItemId}
        onSuccess={state.onSuccess}
      />
    </UnifiedItemFormContext.Provider>
  );
}

export function useUnifiedItemForm(): UnifiedItemFormContextValue {
  const ctx = React.useContext(UnifiedItemFormContext);
  if (!ctx)
    throw new Error(
      "useUnifiedItemForm must be used inside <UnifiedItemFormProvider>",
    );
  return ctx;
}
