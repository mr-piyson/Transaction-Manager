"use client";

/**
 * InvoiceEditor — line items, groups, inventory picker, payment dialog
 * Stack: Tailwind CSS (CSS-variable tokens) + shadcn/ui components
 *
 * shadcn imports used:
 *   Button, Input, Badge, Separator, Sheet (SheetContent / SheetHeader…),
 *   Tabs (TabsList / TabsTrigger / TabsContent)
 *
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Mock data  (replace with react-query)
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_INVENTORY = [
  {
    id: 1,
    code: "SVC-001",
    name: "Web Development (hourly)",
    description: "Frontend/Backend development",
    salesPrice: 25000,
    purchasePrice: 15000,
  },
  {
    id: 2,
    code: "SVC-002",
    name: "UI/UX Design",
    description: "Figma design & prototyping",
    salesPrice: 18000,
    purchasePrice: 10000,
  },
  {
    id: 3,
    code: "HW-001",
    name: "Dell XPS 15 Laptop",
    description: "Intel i7, 32GB RAM, 1TB SSD",
    salesPrice: 450000,
    purchasePrice: 380000,
  },
  {
    id: 4,
    code: "HW-002",
    name: "Logitech MX Master 3",
    description: "Wireless ergonomic mouse",
    salesPrice: 28000,
    purchasePrice: 20000,
  },
  {
    id: 5,
    code: "SW-001",
    name: "Microsoft 365 License",
    description: "Annual subscription per seat",
    salesPrice: 12000,
    purchasePrice: 9000,
  },
  {
    id: 6,
    code: "SW-002",
    name: "Adobe Creative Cloud",
    description: "All apps, annual plan",
    salesPrice: 35000,
    purchasePrice: 28000,
  },
  {
    id: 7,
    code: "CONS-001",
    name: "IT Consulting (day rate)",
    description: "On-site consulting",
    salesPrice: 80000,
    purchasePrice: 50000,
  },
  {
    id: 8,
    code: "NET-001",
    name: "Network Switch 24-port",
    description: "Managed Gigabit Switch",
    salesPrice: 95000,
    purchasePrice: 72000,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Utils
// ─────────────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtBHD = (fils) => `${((fils ?? 0) / 1000).toFixed(3)}`;
const toFils = (v) => Math.round((parseFloat(v) || 0) * 1000);
const fromFils = (v) => ((v ?? 0) / 1000).toFixed(3);
const calcItemTotal = (item) =>
  Math.round((parseFloat(item.qty) || 0) * (item.salesPrice || 0));
const calcGroupTotal = (g) =>
  (g.items || []).reduce((s, it) => s + calcItemTotal(it), 0);
const calcSubtotal = (lines) =>
  (lines || []).reduce(
    (s, l) => s + (l.type === "group" ? calcGroupTotal(l) : calcItemTotal(l)),
    0,
  );
const calcTax = (sub, rate) =>
  Math.round(sub * ((parseFloat(rate) || 0) / 100));

const METHOD_META = {
  cash: { label: "Cash", icon: "💵" },
  bank: { label: "Bank Transfer", icon: "🏦" },
  card: { label: "Card", icon: "💳" },
  cheque: { label: "Cheque", icon: "📝" },
  online: { label: "Online", icon: "🌐" },
};

// Badge variant classes per method (uses theme tokens)
const methodBadgeClass = {
  cash: "bg-success text-success-foreground",
  bank: "bg-default text-default-foreground",
  card: "bg-accent text-accent-foreground",
  cheque: "bg-warning text-warning-foreground",
  online: "bg-secondary text-secondary-foreground",
};

// ─────────────────────────────────────────────────────────────────────────────
// Inventory Picker — rendered inside a Sheet
// ─────────────────────────────────────────────────────────────────────────────
function InventoryPicker({ open, onOpenChange, onSelect }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState([]);

  const filtered = MOCK_INVENTORY.filter((i) =>
    `${i.code} ${i.name} ${i.description}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  const toggle = (item) =>
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

  const handleOpenChange = (v) => {
    if (!v) {
      setSel([]);
      setQ("");
    }
    onOpenChange(v);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[90vh] flex flex-col p-0 gap-0 sm:max-w-lg sm:mx-auto"
      >
        {/* drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full bg-muted" />
        </div>

        <SheetHeader className="px-5 pb-3 border-b border-border shrink-0">
          <SheetTitle className="text-base">Add from Inventory</SheetTitle>
          <SheetDescription className="text-xs">
            Select one or more items to add
          </SheetDescription>
        </SheetHeader>

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
        <div className="flex-1 overflow-y-auto">
          {filtered.map((item) => {
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
        <div className="px-5 py-4 border-t border-border flex gap-3 shrink-0">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button className="flex-[2]" disabled={!sel.length} onClick={confirm}>
            Add {sel.length > 0 ? sel.length : ""} Item
            {sel.length !== 1 ? "s" : ""}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment Dialog — rendered inside a Sheet
// ─────────────────────────────────────────────────────────────────────────────
function PaymentDialog({ open, onOpenChange, payments, total, onChange }) {
  const [draft, setDraft] = useState({
    date: todayStr(),
    method: "cash",
    amount: "",
    reference: "",
    notes: "",
  });

  const paid = payments.reduce((s, p) => s + toFils(p.amount), 0);
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[92vh] flex flex-col p-0 gap-0 sm:max-w-lg sm:mx-auto"
      >
        {/* drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full bg-muted" />
        </div>

        <SheetHeader className="px-5 pb-3 border-b border-border shrink-0">
          <SheetTitle className="text-base">Payments</SheetTitle>
          <SheetDescription className="text-xs">
            Balance:{" "}
            <span
              className={cn(
                "font-bold tabular-nums",
                balance > 0 ? "text-destructive" : "text-success-foreground",
              )}
            >
              {fmtBHD(balance)}
            </span>
          </SheetDescription>
        </SheetHeader>

        <Tabs
          defaultValue="list"
          className="flex flex-col flex-1 overflow-hidden"
        >
          <TabsList className="mx-5 mt-3 shrink-0">
            <TabsTrigger value="list" className="flex-1">
              History
            </TabsTrigger>
            <TabsTrigger value="add" className="flex-1">
              ＋ Record
            </TabsTrigger>
          </TabsList>

          {/* ── History tab ── */}
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
                payments.map((p, i) => {
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
                          onChange(payments.filter((_, j) => j !== i))
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Summary */}
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

          {/* ── Add payment tab ── */}
          <TabsContent
            value="add"
            className="flex-1 overflow-y-auto px-5 pt-4 pb-6 mt-0 space-y-4"
          >
            {/* Method picker */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Payment Method
              </p>
              <div className="flex flex-wrap gap-2">
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

            {/* Amount + Date */}
            <div className="grid grid-cols-2 gap-3">
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

            {/* Reference */}
            <div className="space-y-1.5">
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

            {/* Notes */}
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
            </div>

            <Button
              className="w-full h-11 text-sm"
              disabled={!draft.amount}
              onClick={addPayment}
            >
              Record Payment
            </Button>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LineItemRow
// ─────────────────────────────────────────────────────────────────────────────
function LineItemRow({ item, onChange, onRemove, compact = false }) {
  const total = calcItemTotal(item);
  return (
    <div
      className={cn(
        "grid gap-1.5 items-center py-1",
        compact
          ? "grid-cols-[1fr_48px_82px_70px_26px]"
          : "grid-cols-[1fr_52px_90px_78px_28px]",
      )}
    >
      {/* Description */}
      <div className="relative">
        <Input
          placeholder="Description"
          value={item.description || ""}
          onChange={(e) => onChange("description", e.target.value)}
          className={cn(
            "h-8 pr-2",
            compact ? "text-xs" : "text-sm",
            item.inventoryItemId && "pr-7",
          )}
        />
        {item.inventoryItemId && (
          <Package className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-primary opacity-60 pointer-events-none" />
        )}
      </div>

      {/* Qty */}
      <Input
        type="number"
        min="0"
        step="1"
        placeholder="1"
        value={item.qty ?? ""}
        onChange={(e) => onChange("qty", e.target.value)}
        className={cn("h-8 text-right", compact ? "text-xs" : "text-sm")}
      />

      {/* Unit price */}
      <Input
        type="number"
        min="0"
        step="0.001"
        placeholder="0.000"
        value={item.salesPrice ? fromFils(item.salesPrice) : ""}
        onChange={(e) => onChange("salesPrice", toFils(e.target.value))}
        className={cn("h-8 text-right", compact ? "text-xs" : "text-sm")}
      />

      {/* Amount */}
      <span className="text-right text-xs font-semibold text-muted-foreground tabular-nums pr-1">
        {fmtBHD(total)}
      </span>

      {/* Remove */}
      <Button
        variant="ghost"
        size="icon"
        className="w-6 h-6 text-muted-foreground hover:text-destructive shrink-0"
        onClick={onRemove}
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GroupBlock
// ─────────────────────────────────────────────────────────────────────────────
function GroupBlock({ group, onChange, onRemove, onPickInventory }) {
  const [expanded, setExpanded] = useState(true);
  const total = calcGroupTotal(group);

  const updItem = (idx, k, v) =>
    onChange({
      ...group,
      items: group.items.map((it, i) => (i === idx ? { ...it, [k]: v } : it)),
    });
  const delItem = (idx) =>
    onChange({ ...group, items: group.items.filter((_, i) => i !== idx) });
  const addManual = () =>
    onChange({
      ...group,
      items: [
        ...group.items,
        { id: uid(), description: "", qty: 1, salesPrice: 0, purchasePrice: 0 },
      ],
    });

  return (
    <div className="rounded-xl border border-default overflow-hidden mb-2">
      {/* Group header */}
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

      {/* Group body */}
      {expanded && (
        <div className="px-3 py-2.5 border-t border-border/50">
          {/* Inner column headers */}
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

          {(group.items || []).map((item, idx) => (
            <LineItemRow
              key={item.id}
              item={item}
              compact
              onChange={(k, v) => updItem(idx, k, v)}
              onRemove={() => delItem(idx)}
            />
          ))}

          {!group.items?.length && (
            <p className="text-center py-3 text-xs text-muted-foreground">
              Empty group — add items below
            </p>
          )}

          {/* Inner add buttons */}
          <div className="flex gap-2 mt-2 pt-2 border-t border-border/40">
            <button
              onClick={addManual}
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
}) {
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
      {/* Expanded summary */}
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

      {/* Main bar */}
      <div className="px-4 py-2.5 max-w-[900px] mx-auto flex items-center gap-2">
        {/* Total pill */}
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

        {/* Payments pill */}
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

        {/* Actions */}
        <Button variant="outline" size="sm" className="h-9" onClick={onDraft}>
          Draft
        </Button>
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
  const [lines, setLines] = useState([]);
  const [taxRate, setTaxRate] = useState("");
  const [payments, setPayments] = useState([]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null); // null = top-level | groupId
  const [paymentsOpen, setPaymentsOpen] = useState(false);

  // ── Line mutations ──
  const addManualItem = () =>
    setLines((l) => [
      ...l,
      {
        id: uid(),
        type: "item",
        description: "",
        qty: 1,
        salesPrice: 0,
        purchasePrice: 0,
      },
    ]);

  const addGroup = () =>
    setLines((l) => [
      ...l,
      { id: uid(), type: "group", name: "New Group", items: [] },
    ]);

  const updateLine = (idx, v) =>
    setLines((l) => l.map((x, i) => (i === idx ? v : x)));
  const removeLine = (idx) => setLines((l) => l.filter((_, i) => i !== idx));

  // ── Inventory pick handler ──
  const openPicker = (target = null) => {
    setPickerTarget(target);
    setPickerOpen(true);
  };

  const handleInvSelect = (inv) => {
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
      {/* ── Top bar ── */}
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

        {/* Tax rate */}
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

      {/* ── Content ── */}
      <div className="max-w-3xl mx-auto px-3.5 pt-4">
        {/* Column headers — only when flat items exist */}
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

        {/* Empty state */}
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

        {/* Lines */}
        <div className="space-y-0.5">
          {lines.map((line, idx) =>
            line.type === "group" ? (
              <GroupBlock
                key={line.id}
                group={line}
                onChange={(v) => updateLine(idx, v)}
                onRemove={() => removeLine(idx)}
                onPickInventory={() => openPicker(line.id)}
              />
            ) : (
              <LineItemRow
                key={line.id}
                item={line}
                onChange={(k, v) => updateLine(idx, { ...line, [k]: v })}
                onRemove={() => removeLine(idx)}
              />
            ),
          )}
        </div>

        {/* Subtotal */}
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

        {/* Add buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={addManualItem}
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
            onClick={addGroup}
          >
            <Folder className="w-3.5 h-3.5" /> Add Group
          </Button>
        </div>
      </div>

      {/* ── Footer ── */}
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
