"use client";

import React, { useState } from "react";
import { atom, useAtom } from "jotai";
import { useForm } from "react-hook-form";
import {
  Plus,
  X,
  Folder,
  Package,
  CreditCard,
  ChevronDown,
  ChevronRight,
  Check,
  Search,
  ArrowLeft,
  Banknote,
  Building,
  Globe,
  FileSignature,
} from "lucide-react";

// --- Imported Utilities & Classes ---

// --- Shadcn UI Components ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Money } from "@/lib/money";
import { CurrencyCode } from "@/lib/currency";

// ═══════════════════════════════════════════════════════════════════
// 1. TYPES & MOCK DATA
// ═══════════════════════════════════════════════════════════════════

export type LineItem = {
  _id: string;
  type: "item" | "group";
  description?: string;
  qty?: number;
  unitPrice?: number;
  inventoryId?: string;
  code?: string;
  name?: string;
  items?: LineItem[];
};

export type PaymentMethod = "cash" | "bank" | "card" | "cheque" | "online";

export type Payment = {
  _id: string;
  date: string;
  method: PaymentMethod;
  amount: string;
  reference: string;
  notes: string;
};

const INVENTORY = [
  {
    id: "1",
    code: "SVC-001",
    name: "Web Development (hourly)",
    description: "Frontend/Backend development",
    salesPrice: 25,
    purchasePrice: 15,
  },
  {
    id: "2",
    code: "SVC-002",
    name: "UI/UX Design",
    description: "Figma design & prototyping",
    salesPrice: 18,
    purchasePrice: 10,
  },
  {
    id: "3",
    code: "HW-001",
    name: "Dell XPS 15 Laptop",
    description: "Intel i7, 32GB RAM, 1TB SSD",
    salesPrice: 450,
    purchasePrice: 380,
  },
  {
    id: "8",
    code: "NET-001",
    name: "Network Switch 24-port",
    description: "Managed Gigabit Switch",
    salesPrice: 95,
    purchasePrice: 72,
  },
];

const PAYMENT_METHODS: Record<
  PaymentMethod,
  { label: string; icon: React.ReactNode; colorClass: string }
> = {
  cash: {
    label: "Cash",
    icon: <Banknote className="w-4 h-4" />,
    colorClass: "text-green-600 bg-green-600/10 border-green-600/30",
  },
  bank: {
    label: "Bank Transfer",
    icon: <Building className="w-4 h-4" />,
    colorClass: "text-blue-600 bg-blue-600/10 border-blue-600/30",
  },
  card: {
    label: "Card",
    icon: <CreditCard className="w-4 h-4" />,
    colorClass: "text-purple-600 bg-purple-600/10 border-purple-600/30",
  },
  cheque: {
    label: "Cheque",
    icon: <FileSignature className="w-4 h-4" />,
    colorClass: "text-amber-600 bg-amber-600/10 border-amber-600/30",
  },
  online: {
    label: "Online",
    icon: <Globe className="w-4 h-4" />,
    colorClass: "text-cyan-600 bg-cyan-600/10 border-cyan-600/30",
  },
};

const CURRENCIES: CurrencyCode[] = ["BHD", "USD", "EUR"];

// ═══════════════════════════════════════════════════════════════════
// 2. ATOMS (Jotai)
// ═══════════════════════════════════════════════════════════════════

const linesAtom = atom<LineItem[]>([]);
const taxRateAtom = atom<number>(0);
const paymentsAtom = atom<Payment[]>([]);
const currencyAtom = atom<CurrencyCode>("BHD");
const drawerOpenAtom = atom<boolean>(false);
const pickerOpenAtom = atom<null | "root" | string>(null);

// ═══════════════════════════════════════════════════════════════════
// 3. CALCULATION HELPERS
// ═══════════════════════════════════════════════════════════════════

function calcItemTotal(item: LineItem, curr: CurrencyCode = "BHD") {
  return Money.multiply(item.unitPrice ?? 0, Number(item.qty) || 0, curr);
}

function calcGroupTotal(group: LineItem, curr: CurrencyCode = "BHD") {
  return (group.items ?? []).reduce(
    (sum, item) => Money.add(sum.value, calcItemTotal(item, curr).value, curr),
    Money.add(0, 0, curr), // Initializes empty currency object
  );
}

function calcSubtotal(lines: LineItem[], curr: CurrencyCode = "BHD") {
  return lines.reduce(
    (sum, line) => {
      const lineTotal =
        line.type === "group"
          ? calcGroupTotal(line, curr)
          : calcItemTotal(line, curr);
      return Money.add(sum.value, lineTotal.value, curr);
    },
    Money.add(0, 0, curr),
  );
}

const uid = () => Math.random().toString(36).slice(2, 9);
const todayStr = () => new Date().toISOString().slice(0, 10);

// ═══════════════════════════════════════════════════════════════════
// 4. COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function LineItemRow({
  item,
  onChange,
  onRemove,
  compact = false,
  currency,
}: {
  item: LineItem;
  onChange: (k: string, v: any) => void;
  onRemove: () => void;
  compact?: boolean;
  currency: CurrencyCode;
}) {
  const total = calcItemTotal(item, currency);
  const gridCols = compact
    ? "grid-cols-[1fr_56px_84px_72px_28px]"
    : "grid-cols-[1fr_64px_96px_82px_32px]";

  return (
    <div
      className={`grid ${gridCols} gap-2 items-center p-1.5 rounded-md hover:bg-accent/50 transition-colors group`}
    >
      <div className="relative">
        <Input
          placeholder="Description"
          value={item.description ?? ""}
          onChange={(e) => onChange("description", e.target.value)}
          className={`h-8 ${compact ? "text-xs" : "text-sm"} pr-7`}
        />
        {item.inventoryId && (
          <Package className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground opacity-50" />
        )}
      </div>

      <Input
        type="number"
        min="0"
        placeholder="1"
        value={item.qty ?? ""}
        onChange={(e) => onChange("qty", parseFloat(e.target.value) || 0)}
        className={`h-8 text-right ${compact ? "text-xs" : "text-sm"}`}
      />

      <Input
        type="number"
        min="0"
        step="0.001"
        placeholder="0.000"
        value={item.unitPrice ?? ""}
        onChange={(e) => onChange("unitPrice", parseFloat(e.target.value) || 0)}
        className={`h-8 text-right ${compact ? "text-xs" : "text-sm"}`}
      />

      <div className="text-right text-xs font-bold text-muted-foreground tabular-nums">
        {total.format()}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

function GroupBlock({
  group,
  onChange,
  onRemove,
  onPickInventory,
  currency,
}: {
  group: LineItem;
  onChange: (g: LineItem) => void;
  onRemove: () => void;
  onPickInventory: () => void;
  currency: CurrencyCode;
}) {
  const [expanded, setExpanded] = useState(true);
  const total = calcGroupTotal(group, currency);

  const updateItem = (idx: number, key: string, val: any) =>
    onChange({
      ...group,
      items: (group.items ?? []).map((it, i) =>
        i === idx ? { ...it, [key]: val } : it,
      ),
    });

  const removeItem = (idx: number) =>
    onChange({
      ...group,
      items: (group.items ?? []).filter((_, i) => i !== idx),
    });

  const addManual = () =>
    onChange({
      ...group,
      items: [
        ...(group.items ?? []),
        { _id: uid(), type: "item", description: "", qty: 1, unitPrice: 0 },
      ],
    });

  return (
    <div className="border border-border rounded-lg overflow-hidden mb-3">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/40">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setExpanded(!expanded)}
          className="w-6 h-6"
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </Button>
        <Folder className="w-4 h-4 text-primary" />
        <Input
          value={group.name ?? ""}
          onChange={(e) => onChange({ ...group, name: e.target.value })}
          placeholder="Group name…"
          className="flex-1 h-7 bg-transparent border-none shadow-none focus-visible:ring-0 px-1 font-bold text-sm"
        />
        <span className="text-xs font-bold text-primary tabular-nums">
          {total.format()}
        </span>
        <Badge
          variant="secondary"
          className="px-1.5 min-w-[20px] justify-center"
        >
          {group.items?.length ?? 0}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="w-7 h-7 text-muted-foreground hover:text-destructive"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {expanded && (
        <div className="p-3 border-t border-border">
          {(group.items?.length ?? 0) > 0 && (
            <div className="grid grid-cols-[1fr_56px_84px_72px_28px] gap-2 px-1.5 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Description</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Unit Price</span>
              <span className="text-right">Amount</span>
              <span></span>
            </div>
          )}

          {(group.items ?? []).map((item, idx) => (
            <LineItemRow
              key={item._id}
              item={item}
              compact
              currency={currency}
              onChange={(k, v) => updateItem(idx, k, v)}
              onRemove={() => removeItem(idx)}
            />
          ))}

          {!group.items?.length && (
            <p className="text-center py-4 text-xs text-muted-foreground">
              Empty group — add items below
            </p>
          )}

          <div className="flex gap-2 mt-2 pt-2 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={addManual}
              className="h-7 text-xs text-primary hover:text-primary"
            >
              <Plus className="w-3 h-3 mr-1" /> Manual
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onPickInventory}
              className="h-7 text-xs text-green-600 hover:text-green-600"
            >
              <Package className="w-3 h-3 mr-1" /> Inventory
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function InventoryPickerDrawer({
  targetGroupId,
  onClose,
}: {
  targetGroupId: string | null;
  onClose: () => void;
}) {
  const [, setLines] = useAtom(linesAtom);
  const [currency] = useAtom(currencyAtom);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<typeof INVENTORY>([]);

  const filtered = INVENTORY.filter((i) =>
    `${i.code} ${i.name} ${i.description}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  const toggle = (item: (typeof INVENTORY)[0]) =>
    setSelected((prev) =>
      prev.find((x) => x.id === item.id)
        ? prev.filter((x) => x.id !== item.id)
        : [...prev, item],
    );

  const confirm = () => {
    const newItems: LineItem[] = selected.map((inv) => ({
      _id: uid(),
      type: "item",
      description: inv.name,
      qty: 1,
      unitPrice: inv.salesPrice,
      inventoryId: inv.id,
      code: inv.code,
    }));

    if (targetGroupId === null) {
      setLines((prev) => [...prev, ...newItems]);
    } else {
      setLines((prev) =>
        prev.map((line) =>
          line._id === targetGroupId
            ? { ...line, items: [...(line.items ?? []), ...newItems] }
            : line,
        ),
      );
    }
    onClose();
  };

  return (
    <Drawer open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>Add from Inventory</DrawerTitle>
          <DrawerDescription>
            {selected.length} item{selected.length !== 1 ? "s" : ""} selected
          </DrawerDescription>
        </DrawerHeader>

        <div className="p-4 pb-0 relative">
          <Search className="absolute left-7 top-6 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products & services…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {filtered.map((item) => {
            const isSel = !!selected.find((x) => x.id === item.id);
            return (
              <div
                key={item.id}
                onClick={() => toggle(item)}
                className={`flex items-center gap-3 p-3 mb-2 rounded-lg cursor-pointer border transition-all ${
                  isSel
                    ? "border-primary bg-primary/10"
                    : "border-transparent hover:bg-accent"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center border ${isSel ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"}`}
                >
                  {isSel && <Check className="w-3 h-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {item.name}
                    </span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                      {item.code}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.description}
                  </p>
                </div>
                <span className="text-sm font-bold text-primary tabular-nums">
                  {Money.format(item.salesPrice, currency)}
                </span>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={confirm}
            disabled={selected.length === 0}
            className="flex-[2]"
          >
            Add {selected.length > 0 ? `${selected.length} ` : ""}Item
            {selected.length !== 1 ? "s" : ""}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function PaymentsDrawer() {
  const [open, setOpen] = useAtom(drawerOpenAtom);
  const [payments, setPayments] = useAtom(paymentsAtom);
  const [currency] = useAtom(currencyAtom);
  const [lines] = useAtom(linesAtom);
  const [taxRate] = useAtom(taxRateAtom);
  const [tab, setTab] = useState<"list" | "add">("list");

  const { register, watch, handleSubmit, reset, setValue } = useForm({
    defaultValues: {
      date: todayStr(),
      method: "cash" as PaymentMethod,
      amount: "",
      reference: "",
      notes: "",
    },
  });

  const watchMethod = watch("method");

  const subtotal = calcSubtotal(lines, currency);
  const taxAmt = Money.multiply(subtotal.value, taxRate / 100, currency);
  const total = Money.add(subtotal.value, taxAmt.value, currency);

  const paid = payments.reduce(
    (acc, p) => Money.add(acc.value, parseFloat(p.amount) || 0, currency),
    Money.add(0, 0, currency),
  );
  const balance = Money.subtract(total.value, paid.value, currency);

  const onAddPayment = (data: any) => {
    if (!data.amount) return;
    setPayments((prev) => [...prev, { _id: uid(), ...data }]);
    reset({
      date: todayStr(),
      method: "cash",
      amount: "",
      reference: "",
      notes: "",
    });
    setTab("list");
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>Payments</DrawerTitle>
          <DrawerDescription>Balance: {balance.format()}</DrawerDescription>
        </DrawerHeader>

        <div className="flex border-b px-4">
          {(["list", "add"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 -mb-[1px] ${
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground"
              }`}
            >
              {key === "list" ? "History" : "＋ Record Payment"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === "list" && (
            <div>
              {payments.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No payments recorded yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {payments.map((p) => {
                    const m = PAYMENT_METHODS[p.method] ?? PAYMENT_METHODS.cash;
                    return (
                      <div key={p._id} className="flex items-center gap-3 p-4">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center border ${m.colorClass}`}
                        >
                          {m.icon}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">
                            {m.label}{" "}
                            {p.reference && (
                              <span className="text-muted-foreground font-normal">
                                · #{p.reference}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {p.date} {p.notes && `· ${p.notes}`}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-green-600 tabular-nums">
                          {Money.format(parseFloat(p.amount) || 0, currency)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setPayments((prev) =>
                              prev.filter((x) => x._id !== p._id),
                            )
                          }
                          className="w-8 h-8 text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="p-4 bg-muted/30 mt-4 border-y">
                <div className="flex justify-between text-sm text-muted-foreground mb-1">
                  <span>Invoice Total</span>
                  <span className="font-semibold text-foreground">
                    {total.format()}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground mb-3">
                  <span>Total Paid</span>
                  <span className="font-semibold text-green-600">
                    {paid.format()}
                  </span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-base font-bold">
                  <span
                    className={
                      balance.value > 0 ? "text-destructive" : "text-green-600"
                    }
                  >
                    Balance Due
                  </span>
                  <span
                    className={
                      balance.value > 0
                        ? "text-destructive"
                        : "text-green-600 tabular-nums"
                    }
                  >
                    {balance.format()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {tab === "add" && (
            <form
              onSubmit={handleSubmit(onAddPayment)}
              className="p-4 space-y-4"
            >
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                  Payment Method
                </Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(PAYMENT_METHODS).map(([key, m]) => {
                    const isActive = watchMethod === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setValue("method", key as PaymentMethod)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                          isActive
                            ? m.colorClass
                            : "bg-secondary text-muted-foreground border-transparent hover:bg-secondary/80"
                        }`}
                      >
                        {m.icon} {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.001"
                    placeholder="0.000"
                    {...register("amount")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" {...register("date")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Reference #</Label>
                <Input
                  placeholder="Transaction / cheque number"
                  {...register("reference")}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input placeholder="Optional note" {...register("notes")} />
              </div>

              <Button
                type="submit"
                disabled={!watch("amount")}
                className="w-full mt-2"
              >
                Record Payment
              </Button>
            </form>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 5. MAIN INVOICE EDITOR
// ═══════════════════════════════════════════════════════════════════

export default function InvoiceEditor() {
  const [lines, setLines] = useAtom(linesAtom);
  const [taxRate, setTaxRate] = useAtom(taxRateAtom);
  const [currency, setCurrency] = useAtom(currencyAtom);
  const [payments] = useAtom(paymentsAtom);
  const [, setDrawerOpen] = useAtom(drawerOpenAtom);
  const [pickerTarget, setPickerTarget] = useAtom(pickerOpenAtom);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  const subtotal = calcSubtotal(lines, currency);
  const taxAmt = Money.multiply(subtotal.value, taxRate / 100, currency);
  const total = Money.add(subtotal.value, taxAmt.value, currency);
  const paid = payments.reduce(
    (acc, p) => Money.add(acc.value, parseFloat(p.amount) || 0, currency),
    Money.add(0, 0, currency),
  );
  const balance = Money.subtract(total.value, paid.value, currency);
  const hasPaid = paid.value > 0;

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 font-mono">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 flex items-center gap-3 px-4 h-14 bg-card border-b border-border shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="flex-1 text-sm font-bold tracking-tight">
          Invoice Items
        </h1>

        <div className="flex items-center gap-2 bg-secondary rounded-md px-2 py-1 border">
          <span className="text-[10px] font-bold text-muted-foreground">
            CCY
          </span>
          <Select
            value={currency}
            onValueChange={(val) => setCurrency(val as CurrencyCode)}
          >
            <SelectTrigger className="h-7 border-0 bg-transparent shadow-none px-1 text-xs font-bold w-auto focus:ring-0">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 bg-secondary rounded-md px-2 py-1 border">
          <span className="text-[10px] font-bold text-muted-foreground">
            TAX %
          </span>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={taxRate || ""}
            onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
            className="w-12 h-7 border-0 bg-transparent text-right shadow-none px-1 text-xs font-bold focus-visible:ring-0"
            placeholder="0"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto p-4">
        {lines.length > 0 && (
          <div className="grid grid-cols-[1fr_64px_96px_82px_32px] gap-2 px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Description</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Unit Price</span>
            <span className="text-right">Amount</span>
            <span></span>
          </div>
        )}

        {lines.length === 0 && (
          <div className="flex flex-col items-center justify-center p-14 border-2 border-dashed border-border rounded-xl mb-4 bg-muted/10 animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center mb-4">
              <FileSignature className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-bold text-foreground">No items yet</p>
            <p className="text-xs text-muted-foreground mt-1 text-center max-w-[200px]">
              Add manual entries or select from your inventory to begin.
            </p>
          </div>
        )}

        <div className="space-y-1">
          {lines.map((line, idx) =>
            line.type === "group" ? (
              <GroupBlock
                key={line._id}
                group={line}
                currency={currency}
                onChange={(v) =>
                  setLines((prev) => prev.map((x, i) => (i === idx ? v : x)))
                }
                onRemove={() =>
                  setLines((prev) => prev.filter((_, i) => i !== idx))
                }
                onPickInventory={() => setPickerTarget(line._id)}
              />
            ) : (
              <LineItemRow
                key={line._id}
                item={line}
                currency={currency}
                onChange={(k, v) =>
                  setLines((prev) =>
                    prev.map((x, i) => (i === idx ? { ...line, [k]: v } : x)),
                  )
                }
                onRemove={() =>
                  setLines((prev) => prev.filter((_, i) => i !== idx))
                }
              />
            ),
          )}
        </div>

        {lines.length > 0 && (
          <div className="flex justify-end pt-3 mt-4 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Subtotal:{" "}
              <strong className="text-foreground text-sm tabular-nums ml-1">
                {subtotal.format()}
              </strong>
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setLines((prev) => [
                ...prev,
                {
                  _id: uid(),
                  type: "item",
                  description: "",
                  qty: 1,
                  unitPrice: 0,
                },
              ])
            }
          >
            <Plus className="w-4 h-4 mr-1.5" /> Manual Item
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPickerTarget("root")}
            className="text-primary hover:text-primary"
          >
            <Package className="w-4 h-4 mr-1.5" /> From Inventory
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setLines((prev) => [
                ...prev,
                { _id: uid(), type: "group", name: "New Group", items: [] },
              ])
            }
            className="text-green-600 bg-green-600/10 hover:bg-green-600/20 hover:text-green-700"
          >
            <Folder className="w-4 h-4 mr-1.5" /> Add Group
          </Button>
        </div>
      </main>

      {/* Footer Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
        {summaryExpanded && (
          <div className="px-5 py-4 bg-muted/40 border-b">
            <div className="max-w-3xl mx-auto space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums">{subtotal.format()}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax ({taxRate || 0}%)</span>
                <span className="tabular-nums">{taxAmt.format()}</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t mt-2">
                <span>Total</span>
                <span className="tabular-nums">{total.format()}</span>
              </div>
              {hasPaid && (
                <>
                  <div className="flex justify-between text-green-600">
                    <span>Paid</span>
                    <span className="tabular-nums">− {paid.format()}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-2 border-t mt-2">
                    <span
                      className={
                        balance.value > 0
                          ? "text-destructive"
                          : "text-green-600"
                      }
                    >
                      Balance
                    </span>
                    <span
                      className={`tabular-nums ${balance.value > 0 ? "text-destructive" : "text-green-600"}`}
                    >
                      {balance.format()}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSummaryExpanded(!summaryExpanded)}
            className="flex items-center gap-2 bg-secondary border rounded-md px-3 py-1.5 transition-colors hover:border-border/80 shrink-0"
          >
            <span className="text-[10px] font-bold text-muted-foreground uppercase">
              Total
            </span>
            <span className="text-sm font-bold text-primary tabular-nums">
              {total.format()}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${summaryExpanded ? "rotate-180" : ""}`}
            />
          </button>

          <Button
            variant={hasPaid ? "outline" : "outline"}
            size="sm"
            onClick={() => setDrawerOpen(true)}
            className={`shrink-0 ${hasPaid ? "border-green-600/30 bg-green-600/10 text-green-600 hover:bg-green-600/20" : ""}`}
          >
            <CreditCard className="w-4 h-4 mr-2" />{" "}
            {hasPaid ? paid.format() : "Payments"}
          </Button>

          <div className="flex-1" />

          <Button variant="outline" size="sm">
            Draft
          </Button>
          <Button size="sm" className="font-bold">
            Save Invoice
          </Button>
        </div>
      </div>

      <PaymentsDrawer />
      {pickerTarget !== null && (
        <InventoryPickerDrawer
          targetGroupId={pickerTarget === "root" ? null : pickerTarget}
          onClose={() => setPickerTarget(null)}
        />
      )}
    </div>
  );
}
