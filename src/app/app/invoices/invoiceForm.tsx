"use client";

import { Button } from "@/components/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyCode } from "@/lib/currency";
import { Money } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Customer } from "@prisma/client";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  List,
  Plus,
  Trash,
} from "lucide-react";
import { useState } from "react";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// lib/utils
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const uid = () => Math.random().toString(36).slice(2, 9);

export const today = () => new Date().toISOString().slice(0, 10);

export const addDays = (dateStr: string, n: number) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// --- Financial Utils ---

/**
 * Formats a value using your Money class.
 * Defaults to BHD per your class definition.
 */
export const fmt = (n: any, curr: CurrencyCode = "BHD") =>
  Money.format(n ?? 0, curr);

/**
 * Calculates item total: unitPrice * qty
 */
export const calcItemAmount = (item: any, curr: CurrencyCode = "BHD") =>
  Money.multiply(item.unitPrice || 0, parseFloat(item.qty) || 0, curr);

/**
 * Sums up items within a group
 */
export const calcGroupTotal = (group: any, curr: CurrencyCode = "BHD") =>
  (group.items || []).reduce(
    (sum: number, item: number) =>
      Money.add(sum, calcItemAmount(item, curr), curr),
    0,
  );

/**
 * Calculates subtotal for a mix of standard items and grouped items
 */
export const calcSubtotal = (lines: any[], curr: CurrencyCode = "BHD") =>
  (lines || []).reduce((sum, line) => {
    const amount =
      line.type === "group"
        ? calcGroupTotal(line, curr)
        : calcItemAmount(line, curr);
    return Money.add(sum, amount, curr);
  }, 0);

/**
 * Calculates the tax amount based on a percentage rate
 */
export const calcTax = (
  lines: any[],
  taxRate: number | string,
  curr: CurrencyCode = "BHD",
) => {
  const subtotal = calcSubtotal(lines, curr);
  const rate = (parseFloat(taxRate as string) || 0) / 100;
  return Money.multiply(subtotal, rate, curr);
};

/**
 * Calculates total: Subtotal + Tax
 */
export const calcTotal = (
  lines: any[],
  taxRate: number | string,
  curr: CurrencyCode = "BHD",
) => {
  const subtotal = calcSubtotal(lines, curr);
  const tax = calcTax(lines, taxRate, curr);
  return Money.add(subtotal, tax, curr);
};
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// components/invoice/InvoiceForm
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function InvoiceForm({
  customers,
  onSave,
  onCancel,
}: {
  customers: any;
  onSave: (data: any) => void;
  onCancel: (data: any) => void;
}) {
  const [tab, setTab] = useState("details");
  const [form, setForm] = useState({
    customerId: customers?.length ? customers[0].id : "",
    isNewCustomer: false,
    newCustomerData: { name: "", email: "", address: "" },
    date: today(),
    dueDate: addDays(today(), 30),
    taxRate: 0,
    notes: "",
    status: "draft",
    lines: [],
  });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const subtotal = calcSubtotal(form.lines);
  const tax = calcTax(form.lines, form.taxRate);
  const total = subtotal + tax;

  const canSubmit = form.isNewCustomer
    ? form.newCustomerData.name.trim()
    : !!form.customerId;

  return (
    <div className="space-y-0">
      {/* Tabs */}
      <div className="px-6 pt-2 pb-0">
        <Tabs className="flex flex-col w-full">
          <TabsList className="w-full">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="items">
              Line Items
              {form.lines.length > 0 && (
                <span
                  className="ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-semibold"
                  style={{
                    background: "var(--default)",
                    color: "var(--default-foreground)",
                  }}
                >
                  {form.lines.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <>
              {/* Customer section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Customer
                  </span>
                  <button
                    onClick={() => set("isNewCustomer", !form.isNewCustomer)}
                    className="text-xs font-medium underline-offset-2 hover:underline transition-colors"
                    style={{ color: "var(--primary)" }}
                  >
                    {form.isNewCustomer
                      ? "← Select existing"
                      : "+ New customer"}
                  </button>
                </div>

                {form.isNewCustomer ? (
                  <div
                    className="rounded-lg border border-dashed p-4 space-y-3"
                    style={{
                      borderColor: "var(--primary)",
                      background:
                        "color-mix(in srgb, var(--default) 30%, transparent)",
                    }}
                  >
                    <p
                      className="text-xs font-medium"
                      style={{ color: "var(--primary)" }}
                    >
                      New customer will be created automatically
                    </p>
                    <Input
                      placeholder="Company name *"
                      value={form.newCustomerData.name}
                      onChange={(e) =>
                        set("newCustomerData", {
                          ...form.newCustomerData,
                          name: e.target.value,
                        })
                      }
                    />
                    <Input
                      placeholder="Email"
                      type="email"
                      value={form.newCustomerData.email}
                      onChange={(e) =>
                        set("newCustomerData", {
                          ...form.newCustomerData,
                          email: e.target.value,
                        })
                      }
                    />
                    <Input
                      placeholder="Address"
                      value={form.newCustomerData.address}
                      onChange={(e) =>
                        set("newCustomerData", {
                          ...form.newCustomerData,
                          address: e.target.value,
                        })
                      }
                    />
                  </div>
                ) : (
                  <Select items={customers}>
                    <SelectTrigger value="">Select customer…</SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Customers</SelectLabel>
                        {customers?.map((c: Customer) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Separator />

              {/* Dates + meta */}
              <div className="grid grid-cols-1 gap-4">
                <Label htmlFor="date" className="text-muted-foreground">
                  Issue Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => set("date", e.target.value)}
                />
                <Label htmlFor="dueDate" className="text-muted-foreground">
                  Due Date
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => set("dueDate", e.target.value)}
                />
                <Input
                  label="Tax Rate %"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={form.taxRate}
                  onChange={(e) => set("taxRate", e.target.value)}
                />
                <Select
                  label="Status"
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                >
                  {["draft", "sent", "paid", "overdue"].map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </Select>
              </div>

              <Textarea
                label="Notes"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                placeholder="Payment terms, additional information…"
              />
            </>
          </TabsContent>

          <TabsContent value="items">
            <>
              {/* Info banner using warning schema colors */}
              <div className="rounded-lg border px-3 my-5 py-2 text-xs text-warning-foreground bg-warning border-warning-foreground">
                <strong>Mixed mode:</strong> Add standalone items and/or groups
                freely. Groups are shown as a single summary line in the PDF;
                items inside are not listed individually.
              </div>
              <LineItemsEditor
                lines={form.lines}
                onChange={(l) => set("lines", l)}
              />
            </>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer with totals + actions */}
      <div
        className="px-6 py-4 border-t rounded-b-xl"
        style={{
          borderColor: "var(--border)",
          background: "var(--card)",
        }}
      >
        <div className="flex items-center justify-between">
          <div
            className="flex gap-4 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            <span>
              Tax:{" "}
              <span
                className="font-medium tabular-nums"
                style={{ color: "var(--foreground)" }}
              >
                {fmt(tax)}
              </span>
            </span>
            <span
              className="font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Total: <span className="tabular-nums">{fmt(total)}</span>
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={() => onSave(form)} disabled={!canSubmit}>
              Create Invoice
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// components/invoice/LineItemsEditor
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function LineItemsEditor({ lines, onChange }) {
  const updateLine = (idx, updated) =>
    onChange(lines.map((l, i) => (i === idx ? updated : l)));

  const removeLine = (idx) => onChange(lines.filter((_, i) => i !== idx));

  const addItem = () =>
    onChange([
      ...lines,
      { id: uid(), type: "item", description: "", qty: 1, unitPrice: "" },
    ]);

  const addGroup = () =>
    onChange([
      ...lines,
      {
        id: uid(),
        type: "group",
        name: "New Group",
        items: [{ id: uid(), description: "", qty: 1, unitPrice: "" }],
      },
    ]);

  const subtotal = calcSubtotal(lines);

  return (
    <div className="space-y-3">
      {/* Column headers for flat items */}
      {lines.some((l) => l.type === "item") && (
        <div className="grid grid-cols-[1fr_70px_90px_80px_36px] gap-2 px-1">
          {["Description", "Qty", "Unit Price", "Amount", ""].map((h) => (
            <span
              key={h}
              className="text-xs font-medium uppercase tracking-wider text-right first:text-left"
              style={{ color: "var(--muted-foreground)" }}
            >
              {h}
            </span>
          ))}
        </div>
      )}

      {lines.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-lg"
          style={{
            color: "var(--muted-foreground)",
            borderColor: "var(--border)",
          }}
        >
          <List className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">No line items yet</p>
          <p className="text-xs mt-1">
            Add individual items or organized groups below
          </p>
        </div>
      )}

      {lines.map((line, idx) =>
        line.type === "group" ? (
          <GroupBlock
            key={line.id}
            group={line}
            onChange={(updated) => updateLine(idx, updated)}
            onRemove={() => removeLine(idx)}
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

      {/* Action bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-3.5 w-3.5" /> Add Item
          </Button>
          {/* Group button styled with schema default/primary colors */}
          <button
            onClick={addGroup}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:opacity-80"
            style={{
              borderColor: "var(--primary)",
              color: "var(--primary)",
              background: "color-mix(in srgb, var(--default) 40%, transparent)",
            }}
          >
            <Folder className="h-3.5 w-3.5" /> Add Group
          </button>
        </div>
        {lines.length > 0 && (
          <span
            className="text-sm font-medium tabular-nums"
            style={{ color: "var(--muted-foreground)" }}
          >
            Subtotal:{" "}
            <span
              className="font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              {fmt(subtotal)}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// components/invoice/GroupBlock
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function GroupBlock({ group, onChange, onRemove }) {
  const [expanded, setExpanded] = useState(true);
  const total = calcGroupTotal(group);

  const updateItem = (idx, key, val) =>
    onChange({
      ...group,
      items: group.items.map((it, i) =>
        i === idx ? { ...it, [key]: val } : it,
      ),
    });

  const removeItem = (idx) =>
    onChange({ ...group, items: group.items.filter((_, i) => i !== idx) });

  const addItem = () =>
    onChange({
      ...group,
      items: [
        ...group.items,
        { id: uid(), description: "", qty: 1, unitPrice: "" },
      ],
    });

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        borderColor: "var(--primary)",
        background: "color-mix(in srgb, var(--default) 15%, transparent)",
      }}
    >
      {/* Group header */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b"
        style={{
          background: "var(--default)",
          borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)",
        }}
      >
        <button
          onClick={() => setExpanded((x) => !x)}
          className="transition-colors"
          style={{ color: "var(--default-foreground)" }}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
        <Folder
          className="h-3.5 w-3.5 shrink-0"
          style={{ color: "var(--default-foreground)" }}
        />
        <input
          className="flex-1 bg-transparent text-sm font-semibold focus:outline-none min-w-0"
          style={{
            color: "var(--default-foreground)",
          }}
          value={group.name || ""}
          placeholder="Group name…"
          onChange={(e) => onChange({ ...group, name: e.target.value })}
        />
        <span
          className="text-sm font-semibold tabular-nums shrink-0"
          style={{ color: "var(--default-foreground)" }}
        >
          {fmt(total)}
        </span>
        <Badge variant="default" className="shrink-0">
          {group.items?.length || 0} item{group.items?.length !== 1 ? "s" : ""}
        </Badge>
        <button
          onClick={onRemove}
          className="h-7 w-7 flex items-center justify-center rounded transition-colors shrink-0"
          style={{ color: "var(--muted-foreground)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--destructive)";
            (e.currentTarget as HTMLElement).style.background =
              "color-mix(in srgb, var(--destructive) 10%, transparent)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color =
              "var(--muted-foreground)";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <Trash className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Group items */}
      {expanded && (
        <div className="p-3 space-y-1.5">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_60px_80px_70px_32px] gap-2 px-0.5">
            {["Description", "Qty", "Unit $", "Amount", ""].map((h) => (
              <span
                key={h}
                className="text-xs font-medium uppercase tracking-wider text-right first:text-left"
                style={{ color: "var(--muted-foreground)" }}
              >
                {h}
              </span>
            ))}
          </div>
          {(group.items || []).map((item, idx) => (
            <LineItemRow
              key={item.id}
              item={item}
              compact
              onChange={(k, v) => updateItem(idx, k, v)}
              onRemove={() => removeItem(idx)}
            />
          ))}
          <button
            onClick={addItem}
            className="mt-1 flex items-center gap-1.5 text-xs font-medium transition-colors py-1"
            style={{ color: "var(--primary)" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.opacity = "0.7")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.opacity = "1")
            }
          >
            <Plus className="h-3 w-3" /> Add line item
          </button>
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// components/invoice/LineItemRow
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function LineItemRow({ item, onChange, onRemove, compact = false }) {
  const amount = calcItemAmount(item);

  const inputStyle = {
    height: "2rem",
    width: "100%",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--input)",
    background: "var(--background)",
    padding: "0 0.5rem",
    fontSize: "0.875rem",
    color: "var(--foreground)",
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  };

  return (
    <div
      className={cn(
        "grid gap-2 items-center",
        compact
          ? "grid-cols-[1fr_60px_80px_70px_32px]"
          : "grid-cols-[1fr_70px_90px_80px_36px]",
      )}
    >
      <input
        style={inputStyle}
        placeholder="Description"
        value={item.description || ""}
        onChange={(e) => onChange("description", e.target.value)}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--primary)";
          e.currentTarget.style.boxShadow = `0 0 0 2px color-mix(in srgb, var(--ring) 40%, transparent)`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--input)";
          e.currentTarget.style.boxShadow = "none";
        }}
      />
      <input
        style={{ ...inputStyle, textAlign: "right" }}
        placeholder="Qty"
        type="number"
        min="0"
        value={item.qty ?? ""}
        onChange={(e) => onChange("qty", e.target.value)}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--primary)";
          e.currentTarget.style.boxShadow = `0 0 0 2px color-mix(in srgb, var(--ring) 40%, transparent)`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--input)";
          e.currentTarget.style.boxShadow = "none";
        }}
      />
      <input
        style={{ ...inputStyle, textAlign: "right" }}
        placeholder="Unit $"
        type="number"
        min="0"
        step="0.01"
        value={item.unitPrice ?? ""}
        onChange={(e) => onChange("unitPrice", e.target.value)}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--primary)";
          e.currentTarget.style.boxShadow = `0 0 0 2px color-mix(in srgb, var(--ring) 40%, transparent)`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--input)";
          e.currentTarget.style.boxShadow = "none";
        }}
      />
      <span
        className="text-right text-sm font-medium tabular-nums pr-1"
        style={{ color: "var(--foreground)" }}
      >
        {fmt(amount)}
      </span>
      <button
        onClick={onRemove}
        className="h-8 w-8 flex items-center justify-center rounded transition-colors"
        style={{ color: "var(--muted-foreground)" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = "var(--destructive)";
          (e.currentTarget as HTMLElement).style.background =
            "color-mix(in srgb, var(--destructive) 10%, transparent)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color =
            "var(--muted-foreground)";
          (e.currentTarget as HTMLElement).style.background = "transparent";
        }}
      >
        <Trash className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
