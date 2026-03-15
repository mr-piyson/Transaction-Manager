"use client";

/**
 * Replace MOCK_INVENTORY with useQuery + axios call.
 * Replace alert() stubs with useMutation calls.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  Package,
  Plus,
  Trash2,
  CreditCard,
  ArrowLeft,
  ClipboardList,
  ChevronUp,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { InventoryItem } from "@prisma/client";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

// ─────────────────────────────────────────────────────────────────────────────
// Utils
// ─────────────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtBHD = (fils: number | null | undefined) =>
  `${((fils ?? 0) / 1000).toFixed(3)}`;
const toFils = (v: string | number) =>
  Math.round((parseFloat(v as string) || 0) * 1000);
const fromFils = (v: number | null | undefined) => ((v ?? 0) / 1000).toFixed(3);
const calcItemTotal = (item: any) =>
  Math.round((parseFloat(item.qty) || 0) * (item.salesPrice || 0));
const calcGroupTotal = (g: any) =>
  (g.items || []).reduce((s: number, it: any) => s + calcItemTotal(it), 0);
const calcSubtotal = (lines: any[]) =>
  (lines || []).reduce(
    (s, l) => s + (l.type === "group" ? calcGroupTotal(l) : calcItemTotal(l)),
    0,
  );
const calcTax = (sub: number, rate: string | number) =>
  Math.round(sub * ((parseFloat(rate as string) || 0) / 100));

const METHOD_META: Record<string, { label: string; icon: string }> = {
  cash: { label: "Cash", icon: "💵" },
  bank: { label: "Bank Transfer", icon: "🏦" },
  card: { label: "Card", icon: "💳" },
  cheque: { label: "Cheque", icon: "📝" },
  online: { label: "Online", icon: "🌐" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Add Manual Item Dialog
// ─────────────────────────────────────────────────────────────────────────────
function AddManualItemDialog({ open, onOpenChange, onAdd }: any) {
  const [desc, setDesc] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setDesc("");
      setQty("1");
      setPrice("");
    }
    onOpenChange(v);
  };

  const submit = () => {
    onAdd({
      description: desc,
      qty: parseFloat(qty) || 1,
      salesPrice: toFils(price),
    });
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Manual Item</DialogTitle>
          <DialogDescription>
            Enter the details for the new line item.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Description
            </label>
            <Input
              placeholder="Item description"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Quantity
              </label>
              <Input
                type="number"
                min="0"
                step="1"
                placeholder="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Unit Price (BHD)
              </label>
              <Input
                type="number"
                min="0"
                step="0.001"
                placeholder="0.000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!desc.trim()}>
            Add Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Group Dialog
// ─────────────────────────────────────────────────────────────────────────────
function AddGroupDialog({ open, onOpenChange, onAdd }: any) {
  const [name, setName] = useState("");

  const handleOpenChange = (v: boolean) => {
    if (!v) setName("");
    onOpenChange(v);
  };

  const submit = () => {
    onAdd({ name: name.trim() || "New Group" });
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Item Group</DialogTitle>
          <DialogDescription>
            Create a folder to group multiple items together.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Group Name
            </label>
            <Input
              placeholder="e.g. Services, Hardware..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Create Group</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inventory Picker — handled via Dialog
// ─────────────────────────────────────────────────────────────────────────────
function InventoryPicker({ open, onOpenChange, onSelect }: any) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<InventoryItem[]>([]);

  const { data: inventoryItems, isLoading } = useQuery<InventoryItem[]>({
    queryKey: ["inventory"],
    queryFn: async () => (await axios.get("/api/inventory")).data,
  });

  const filtered = inventoryItems?.filter((i) =>
    `${i.code} ${i.name} ${i.description}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  const toggle = (item: InventoryItem) =>
    setSel((p) =>
      p.find((x) => x.id === item.id)
        ? p.filter((x) => x.id !== item.id)
        : [...p, item],
    );

  const confirm = () => {
    sel.forEach(onSelect);
    setSel([]);
    setQ("");
    onOpenChange(false);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setSel([]);
      setQ("");
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden flex flex-col max-h-[85vh]">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle>Add from Inventory</DialogTitle>
          <DialogDescription>
            Select one or more items to add to the invoice.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="px-5 py-3 border-b border-border shrink-0">
          <Input
            placeholder="Search by name, code…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9"
            autoFocus
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto min-h-75">
          {isLoading && (
            <div className="flex justify-center py-8 text-sm text-muted-foreground">
              Loading inventory...
            </div>
          )}
          {filtered?.map((item) => {
            const isSel = !!sel.find((x) => x.id === item.id);
            return (
              <button
                key={item.id}
                onClick={() => toggle(item)}
                className={cn(
                  "w-full flex items-center gap-3 px-5 py-3 text-left border-b border-border/50 transition-colors",
                  isSel ? "bg-default/30" : "hover:bg-accent/50",
                )}
              >
                {/* Checkbox */}
                <div
                  className={cn(
                    "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                    isSel
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground",
                  )}
                >
                  {isSel && (
                    <span className="text-[10px] font-black leading-none">
                      ✓
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">
                      {item.name}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-4"
                    >
                      {item.code}
                    </Badge>
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Price */}
                <span className="text-sm font-bold text-primary tabular-nums shrink-0">
                  {fmtBHD(item.salesPrice)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 py-4 border-t border-border shrink-0 bg-muted/20">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!sel.length} onClick={confirm}>
            Add {sel.length > 0 ? sel.length : ""} Item
            {sel.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment Dialog — rendered inside a Sheet
// ─────────────────────────────────────────────────────────────────────────────
function PaymentDialog({ open, onOpenChange, payments, total, onChange }: any) {
  const [draft, setDraft] = useState({
    date: todayStr(),
    method: "cash",
    amount: "",
    reference: "",
    notes: "",
  });

  const paid = payments.reduce((s: number, p: any) => s + toFils(p.amount), 0);
  const balance = total - paid;

  const addPayment = () => {
    if (!draft.amount) return;
    onChange([...payments, { id: uid(), ...draft }]);
    setDraft({
      date: todayStr(),
      method: "cash",
      amount: "",
      reference: "",
      notes: "",
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-2xl min-h-[85vh] max-h-[92vh] flex flex-col p-0 gap-0 sm:max-w-lg sm:mx-auto">
        <DrawerHeader className="px-5 pb-3 border-b border-border shrink-0">
          <DrawerTitle className="text-base">Payments</DrawerTitle>
          <DrawerDescription className="text-xs">
            Balance:{" "}
            <span
              className={cn(
                "font-bold tabular-nums",
                balance > 0 ? "text-destructive" : "text-success-foreground",
              )}
            >
              {fmtBHD(balance)}
            </span>
          </DrawerDescription>
        </DrawerHeader>

        <Tabs
          defaultValue="list"
          className="flex flex-col w-full p-4 flex-1 overflow-hidden"
        >
          <TabsList className="w-full  shrink-0">
            <TabsTrigger value="list" className="flex-1">
              <Clock /> History
            </TabsTrigger>
            <TabsTrigger value="add" className="flex-1">
              <Plus /> Record
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="list"
            className="flex-1 flex flex-col overflow-hidden mt-0"
          >
            <div className="flex-1 overflow-y-auto">
              {payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                  <CreditCard className="w-8 h-8 opacity-30" />
                  <p className="text-sm">No payments recorded yet</p>
                </div>
              ) : (
                payments.map((p: any, i: number) => {
                  const m = METHOD_META[p.method] || METHOD_META.cash;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 px-5 py-3 border-b border-border/40"
                    >
                      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-lg shrink-0">
                        {m.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {m.label}
                          {p.reference ? (
                            <span className="text-muted-foreground font-normal">
                              {" "}
                              · #{p.reference}
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.date}
                          {p.notes ? ` · ${p.notes}` : ""}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-success-foreground tabular-nums">
                        {fmtBHD(toFils(p.amount))}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() =>
                          onChange(
                            payments.filter((_: any, j: number) => j !== i),
                          )
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="shrink-0 px-5 py-4 bg-card border-t border-border space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Invoice Total</span>
                <span className="tabular-nums">{fmtBHD(total)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-success-foreground">Total Paid</span>
                <span className="font-semibold text-success-foreground tabular-nums">
                  {fmtBHD(paid)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-bold">
                <span
                  className={
                    balance > 0 ? "text-destructive" : "text-success-foreground"
                  }
                >
                  Balance Due
                </span>
                <span
                  className={cn(
                    "tabular-nums",
                    balance > 0
                      ? "text-destructive"
                      : "text-success-foreground",
                  )}
                >
                  {fmtBHD(balance)}
                </span>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="add"
            className="flex flex-col flex-1 overflow-y-auto px-5 pt-4 pb-6 mt-0 space-y-4"
          >
            <div className="flex-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Payment Method
              </p>
              <div className="flex  flex-wrap gap-2">
                {Object.entries(METHOD_META).map(([key, m]) => (
                  <button
                    key={key}
                    onClick={() => setDraft((d) => ({ ...d, method: key }))}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all",
                      draft.method === key
                        ? "border-primary bg-default text-default-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className=" grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Amount (BHD)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="0.000"
                  value={draft.amount}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, amount: e.target.value }))
                  }
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Date
                </label>
                <Input
                  type="date"
                  value={draft.date}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, date: e.target.value }))
                  }
                  className="h-9"
                />
              </div>
            </div>

            {/* <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Reference #
              </label>
              <Input
                placeholder="Transaction / cheque number (optional)"
                value={draft.reference}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, reference: e.target.value }))
                }
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Notes
              </label>
              <Input
                placeholder="Optional note"
                value={draft.notes}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, notes: e.target.value }))
                }
                className="h-9"
              />
            </div> */}

            <Button
              className="w-full h-11 text-sm"
              disabled={!draft.amount}
              onClick={addPayment}
            >
              Record Payment
            </Button>
          </TabsContent>
        </Tabs>
      </DrawerContent>
    </Drawer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LineItemCard
// ─────────────────────────────────────────────────────────────────────────────
function LineItemRow({ item, onRemove, compact = false }: any) {
  const total = calcItemTotal(item);

  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/20",
        compact && "p-3 gap-2",
      )}
    >
      {/* Header: Description & Delete */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          {item.inventoryItemId && (
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <Package className="h-3.5 w-3.5 text-primary" />
            </div>
          )}
          <span
            className={cn(
              "font-semibold leading-tight text-foreground",
              compact ? "text-sm" : "text-base",
            )}
          >
            {item.description || "No Description"}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 -mt-1 -mr-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Details Row: Qty & Price Breakdown */}
      <div className="flex items-end justify-between border-t pt-3 border-dashed">
        <div className="flex gap-6 text-xs text-muted-foreground">
          <div className="flex flex-col gap-0.5">
            <span className="uppercase tracking-wider opacity-60">
              Quantity
            </span>
            <span className="font-medium text-foreground text-sm">
              {item.qty || 0}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="uppercase tracking-wider opacity-60">
              Unit Price
            </span>
            <span className="font-medium text-foreground text-sm">
              {fmtBHD(fromFils(item.salesPrice))}
            </span>
          </div>
        </div>

        {/* Total Price */}
        <div className="text-right">
          <span className="block text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
            Subtotal
          </span>
          <span
            className={cn(
              "font-bold text-primary tabular-nums",
              compact ? "text-base" : "text-lg",
            )}
          >
            {fmtBHD(total)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GroupBlock
// ─────────────────────────────────────────────────────────────────────────────
function GroupBlock({
  group,
  onChange,
  onRemove,
  onPickInventory,
  onAddManual,
}: any) {
  const [expanded, setExpanded] = useState(true);
  const total = calcGroupTotal(group);

  const updItem = (idx: number, k: string, v: any) =>
    onChange({
      ...group,
      items: group.items.map((it: any, i: number) =>
        i === idx ? { ...it, [k]: v } : it,
      ),
    });
  const delItem = (idx: number) =>
    onChange({
      ...group,
      items: group.items.filter((_: any, i: number) => i !== idx),
    });

  return (
    <div className="rounded-xl border border-default overflow-hidden mb-2">
      <div className="flex items-center gap-2 px-3 py-2 bg-default/20">
        <Button
          variant="ghost"
          size="icon"
          className="w-6 h-6 text-muted-foreground shrink-0"
          onClick={() => setExpanded((x) => !x)}
        >
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </Button>

        <Folder className="w-3.5 h-3.5 text-default-foreground shrink-0" />

        <input
          value={group.name || ""}
          onChange={(e) => onChange({ ...group, name: e.target.value })}
          placeholder="Group name…"
          className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm font-bold text-foreground placeholder:text-muted-foreground"
        />

        <span className="text-xs font-bold text-primary tabular-nums shrink-0">
          {fmtBHD(total)}
        </span>

        <Badge variant="secondary" className="text-[10px] px-1.5 h-4 shrink-0">
          {group.items?.length || 0}
        </Badge>

        <Button
          variant="ghost"
          size="icon"
          className="w-6 h-6 text-muted-foreground hover:text-destructive shrink-0"
          onClick={onRemove}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>

      {expanded && (
        <div className="px-3 py-2.5 border-t border-border/50">
          {group.items?.length > 0 && (
            <div className="grid grid-cols-[1fr_48px_82px_70px_26px] gap-1.5 px-0.5 mb-1">
              {["Description", "Qty", "Unit $", "Amount", ""].map((h) => (
                <span
                  key={h}
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider text-muted-foreground",
                    h === "Description" || h === ""
                      ? "text-left"
                      : "text-right",
                  )}
                >
                  {h}
                </span>
              ))}
            </div>
          )}

          {(group.items || []).map((item: any, idx: number) => (
            <LineItemRow
              key={item.id}
              item={item}
              compact
              onChange={(k: string, v: any) => updItem(idx, k, v)}
              onRemove={() => delItem(idx)}
            />
          ))}

          {!group.items?.length && (
            <p className="text-center py-3 text-xs text-muted-foreground">
              Empty group — add items below
            </p>
          )}

          <div className="flex gap-2 mt-2 pt-2 border-t border-border/40">
            <button
              onClick={onAddManual}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:opacity-70 transition-opacity"
            >
              <Plus className="w-3 h-3" /> Manual
            </button>
            <button
              onClick={onPickInventory}
              className="inline-flex items-center gap-1 text-xs font-semibold text-success-foreground hover:opacity-70 transition-opacity"
            >
              <Package className="w-3 h-3" /> Inventory
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Footer Bar
// ─────────────────────────────────────────────────────────────────────────────
function FooterBar({
  subtotal,
  taxAmt,
  total,
  paid,
  taxRate,
  payments,
  onPayments,
  onSave,
  onDraft,
}: any) {
  const [expanded, setExpanded] = useState(false);
  const balance = total - paid;

  const summaryRows = [
    { label: "Subtotal", value: fmtBHD(subtotal), bold: false },
    { label: `Tax (${taxRate || 0}%)`, value: fmtBHD(taxAmt), bold: false },
    {
      label: "Total",
      value: fmtBHD(total),
      bold: true,
      highlight: "text-primary",
    },
    ...(payments.length > 0
      ? [
          {
            label: "Paid",
            value: `− ${fmtBHD(paid)}`,
            bold: false,
            highlight: "text-success-foreground",
          },
          {
            label: "Balance",
            value: fmtBHD(balance),
            bold: true,
            highlight:
              balance > 0 ? "text-destructive" : "text-success-foreground",
            separator: true,
          },
        ]
      : []),
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
      {expanded && (
        <div className="px-4 py-3 border-b border-border bg-card animate-in slide-in-from-bottom-2 duration-150">
          <div className="max-w-xl mx-auto space-y-1.5">
            {summaryRows.map((row, i) => (
              <div key={row.label}>
                {row.separator && <Separator className="my-1.5" />}
                <div className="flex justify-between">
                  <span
                    className={cn(
                      "text-muted-foreground",
                      row.bold
                        ? "text-sm font-semibold text-foreground"
                        : "text-xs",
                    )}
                  >
                    {row.label}
                  </span>
                  <span
                    className={cn(
                      "tabular-nums",
                      row.bold ? "text-sm font-bold" : "text-xs font-medium",
                      row.highlight || "text-foreground",
                    )}
                  >
                    {row.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 py-2.5 max-w-225 mx-auto flex items-center gap-2">
        <button
          onClick={() => setExpanded((x) => !x)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-accent transition-colors shrink-0"
        >
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Total
          </span>
          <span className="text-sm font-extrabold text-primary tabular-nums">
            {fmtBHD(total)}
          </span>
          {expanded ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-3 h-3 text-muted-foreground" />
          )}
        </button>

        <button
          onClick={onPayments}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors shrink-0",
            paid > 0
              ? "bg-success text-success-foreground border-success/40"
              : "bg-card text-muted-foreground border-border hover:bg-accent",
          )}
        >
          <CreditCard className="w-3.5 h-3.5" />
          {paid > 0 ? fmtBHD(paid) : "Payments"}
        </button>

        <div className="flex-1" />

        <Button size="sm" className="h-9 px-5 font-bold" onClick={onSave}>
          Save Invoice
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Invoice Editor
// ─────────────────────────────────────────────────────────────────────────────
export default function InvoiceEditor() {
  const [lines, setLines] = useState<any[]>([]);
  const [taxRate, setTaxRate] = useState("");
  const [payments, setPayments] = useState<any[]>([]);

  // Dialog states
  const [manualOpen, setManualOpen] = useState(false);
  const [manualTarget, setManualTarget] = useState<string | null>(null); // null = top-level | groupId

  const [groupOpen, setGroupOpen] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<string | null>(null); // null = top-level | groupId

  const [paymentsOpen, setPaymentsOpen] = useState(false);

  // ── Line mutations ──
  const handleAddManualSubmit = (data: {
    description: string;
    qty: number;
    salesPrice: number;
  }) => {
    const item = {
      id: uid(),
      type: "item",
      ...data,
      purchasePrice: 0,
    };

    if (manualTarget === null) {
      setLines((l) => [...l, item]);
    } else {
      setLines((l) =>
        l.map((line) =>
          line.id === manualTarget
            ? { ...line, items: [...(line.items || []), item] }
            : line,
        ),
      );
    }
  };

  const handleAddGroupSubmit = (data: { name: string }) => {
    setLines((l) => [
      ...l,
      { id: uid(), type: "group", name: data.name, items: [] },
    ]);
  };

  const updateLine = (idx: number, v: any) =>
    setLines((l) => l.map((x, i) => (i === idx ? v : x)));
  const removeLine = (idx: number) =>
    setLines((l) => l.filter((_, i) => i !== idx));

  // ── Handlers to Open Dialogs ──
  const openManualDialog = (target: string | null = null) => {
    setManualTarget(target);
    setManualOpen(true);
  };

  const openGroupDialog = () => {
    setGroupOpen(true);
  };

  const openPicker = (target: string | null = null) => {
    setPickerTarget(target);
    setPickerOpen(true);
  };

  const handleInvSelect = (inv: any) => {
    const item = {
      id: uid(),
      description: inv.name,
      qty: 1,
      salesPrice: inv.salesPrice,
      purchasePrice: inv.purchasePrice,
      inventoryItemId: inv.id,
      code: inv.code,
    };
    if (pickerTarget === null) {
      setLines((l) => [...l, { ...item, type: "item" }]);
    } else {
      setLines((l) =>
        l.map((line) =>
          line.id === pickerTarget
            ? { ...line, items: [...(line.items || []), item] }
            : line,
        ),
      );
    }
  };

  // ── Totals ──
  const subtotal = calcSubtotal(lines);
  const taxAmt = calcTax(subtotal, taxRate);
  const total = subtotal + taxAmt;
  const paid = payments.reduce((s, p) => s + toFils(p.amount), 0);
  const hasItems = lines.some((l) => l.type === "item");

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="sticky top-0 z-40 bg-card border-b border-border flex items-center gap-2 px-4 h-13">
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <h1 className="flex-1 text-[15px] font-bold tracking-tight">
          Invoice Items
        </h1>

        <div className="flex items-center gap-1.5 bg-background border border-input rounded-lg px-2.5 py-1.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
            Tax %
          </span>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder="0"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            className="w-12 bg-transparent border-none outline-none text-sm font-bold text-right text-foreground"
          />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3.5 pt-4">
        {hasItems && (
          <div className="grid grid-cols-[1fr_52px_90px_78px_28px] gap-1.5 px-0.5 mb-2">
            {["Description", "Qty", "Unit Price", "Amount", ""].map((h) => (
              <span
                key={h}
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider text-muted-foreground",
                  h === "Description" || h === "" ? "text-left" : "text-right",
                )}
              >
                {h}
              </span>
            ))}
          </div>
        )}

        {lines.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 border-2 border-dashed border-border rounded-2xl mb-4 text-center gap-2">
            <ClipboardList className="w-9 h-9 text-muted-foreground opacity-40" />
            <p className="text-sm font-semibold text-muted-foreground">
              No items yet
            </p>
            <p className="text-xs text-muted-foreground/70">
              Add manual entries or pick from your inventory
            </p>
          </div>
        )}

        <div className="space-y-0.5">
          {lines.map((line, idx) =>
            line.type === "group" ? (
              <GroupBlock
                key={line.id}
                group={line}
                onChange={(v: any) => updateLine(idx, v)}
                onRemove={() => removeLine(idx)}
                onPickInventory={() => openPicker(line.id)}
                onAddManual={() => openManualDialog(line.id)}
              />
            ) : (
              <LineItemRow
                key={line.id}
                item={line}
                onChange={(k: string, v: any) =>
                  updateLine(idx, { ...line, [k]: v })
                }
                onRemove={() => removeLine(idx)}
              />
            ),
          )}
        </div>

        {lines.length > 0 && (
          <div className="flex justify-end pt-2.5 mt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Subtotal:{" "}
              <strong className="text-foreground tabular-nums">
                {fmtBHD(subtotal)}
              </strong>
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => openManualDialog(null)}
          >
            <Plus className="w-3.5 h-3.5" /> Manual Item
          </Button>

          <Button
            variant="secondary"
            size="sm"
            className="h-9 gap-1.5 bg-default text-default-foreground hover:bg-default/80"
            onClick={() => openPicker(null)}
          >
            <Package className="w-3.5 h-3.5" /> From Inventory
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 border-success/40 text-success-foreground hover:bg-success/10"
            onClick={openGroupDialog}
          >
            <Folder className="w-3.5 h-3.5" /> Add Group
          </Button>
        </div>
      </div>

      <FooterBar
        subtotal={subtotal}
        taxAmt={taxAmt}
        total={total}
        paid={paid}
        taxRate={taxRate}
        payments={payments}
        onPayments={() => setPaymentsOpen(true)}
        onSave={() => alert("Invoice saved!")}
        onDraft={() => alert("Saved as draft!")}
      />

      {/* ── Add Dialogs ── */}
      <AddManualItemDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        onAdd={handleAddManualSubmit}
      />

      <AddGroupDialog
        open={groupOpen}
        onOpenChange={setGroupOpen}
        onAdd={handleAddGroupSubmit}
      />

      {/* ── Sheets / Dialogs ── */}
      <InventoryPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleInvSelect}
      />

      <PaymentDialog
        open={paymentsOpen}
        onOpenChange={setPaymentsOpen}
        payments={payments}
        total={total}
        onChange={setPayments}
      />
    </div>
  );
}
