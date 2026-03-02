"use client";

import { Button } from "@/components/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import Icons from "lucide-react";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// lib/utils
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const uid = () => Math.random().toString(36).slice(2, 9);

const fmt = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n ?? 0);

const today = () => new Date().toISOString().slice(0, 10);

const addDays = (dateStr, n) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const calcItemAmount = (item) =>
  (parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0);

const calcGroupTotal = (group) =>
  (group.items || []).reduce((s, i) => s + calcItemAmount(i), 0);

/**
 * Compute invoice subtotal.
 * - Standalone items are summed directly.
 * - Groups are summed as their constituent item totals.
 */
const calcSubtotal = (lines) =>
  (lines || []).reduce((s, line) => {
    if (line.type === "group") return s + calcGroupTotal(line);
    return s + calcItemAmount(line);
  }, 0);

const calcTotal = (lines, taxRate) => {
  const sub = calcSubtotal(lines);
  return sub + sub * ((parseFloat(taxRate) || 0) / 100);
};

const calcTax = (lines, taxRate) => {
  const sub = calcSubtotal(lines);
  return sub * ((parseFloat(taxRate) || 0) / 100);
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
    customerId: customers[0]?.id || "",
    isNewCustomer: false,
    newCustomerData: { name: "", email: "", address: "" },
    date: today(),
    dueDate: addDays(today(), 30),
    taxRate: 0,
    notes: "",
    status: "draft",
    lines: [],
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

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
        <TabsList>
          <TabsTrigger
            value="details"
            // currentValue={tab}
            onClick={(e) => setTab(e.currentTarget.value)}
          >
            Details
          </TabsTrigger>
          <TabsTrigger
            value="items"
            // currentValue={tab}
            onClick={(e) => setTab(e.currentTarget.value)}
          >
            Line Items
            {form.lines.length > 0 && (
              <span className="ml-1.5 rounded-full bg-indigo-100 text-indigo-700 px-1.5 py-0.5 text-xs font-semibold">
                {form.lines.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="px-6 py-5 space-y-5">
        {tab === "details" && (
          <>
            {/* Customer section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Customer
                </span>
                <button
                  onClick={() => set("isNewCustomer", !form.isNewCustomer)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline-offset-2 hover:underline transition-colors"
                >
                  {form.isNewCustomer ? "← Select existing" : "+ New customer"}
                </button>
              </div>

              {form.isNewCustomer ? (
                <div className="rounded-lg border border-dashed border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
                  <p className="text-xs text-indigo-600 font-medium">
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
                <Select
                  value={form.customerId}
                  onChange={(e) => set("customerId", e.target.value)}
                >
                  <option value="">Select customer…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              )}
            </div>

            <Separator />

            {/* Dates + meta */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Issue Date"
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
              />
              <Input
                label="Due Date"
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
        )}

        {tab === "items" && (
          <>
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
              <strong>Mixed mode:</strong> Add standalone items and/or groups
              freely. Groups are shown as a single summary line in the PDF;
              items inside are not listed individually.
            </div>
            <LineItemsEditor
              lines={form.lines}
              onChange={(l) => set("lines", l)}
            />
          </>
        )}
      </div>

      {/* Footer with totals + actions */}
      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 rounded-b-xl">
        <div className="flex items-center justify-between">
          <div className="flex gap-4 text-sm text-slate-500">
            <span>
              Tax:{" "}
              <span className="text-slate-800 font-medium tabular-nums">
                {fmt(tax)}
              </span>
            </span>
            <span className="font-semibold text-slate-900">
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
// Unified editor: both standalone items + groups coexist
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
              className="text-xs font-medium text-slate-400 uppercase tracking-wider text-right first:text-left"
            >
              {h}
            </span>
          ))}
        </div>
      )}

      {lines.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
          <Icons.List className="h-8 w-8 mb-2 opacity-40" />
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
            <Icons.Plus className="h-3.5 w-3.5" /> Add Item
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={addGroup}
            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
          >
            <Icons.Folder className="h-3.5 w-3.5" /> Add Group
          </Button>
        </div>
        {lines.length > 0 && (
          <span className="text-sm font-medium text-slate-600 tabular-nums">
            Subtotal:{" "}
            <span className="font-semibold text-slate-900">
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
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/30 overflow-hidden">
      {/* Group header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border-b border-indigo-200">
        <button
          onClick={() => setExpanded((x) => !x)}
          className="text-indigo-500 hover:text-indigo-700 transition-colors"
        >
          {expanded ? (
            <Icons.ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <Icons.ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
        <Icons.Folder className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
        <input
          className="flex-1 bg-transparent text-sm font-semibold text-indigo-900 focus:outline-none placeholder:text-indigo-400 min-w-0"
          value={group.name || ""}
          placeholder="Group name…"
          onChange={(e) => onChange({ ...group, name: e.target.value })}
        />
        <span className="text-sm font-semibold text-indigo-700 tabular-nums shrink-0">
          {fmt(total)}
        </span>
        <Badge variant="group" className="shrink-0">
          {group.items?.length || 0} item{group.items?.length !== 1 ? "s" : ""}
        </Badge>
        <button
          onClick={onRemove}
          className="h-7 w-7 flex items-center justify-center rounded text-indigo-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
        >
          <Icons.Trash className="h-3.5 w-3.5" />
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
                className="text-xs font-medium text-slate-400 uppercase tracking-wider text-right first:text-left"
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
            className="mt-1 flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors py-1"
          >
            <Icons.Plus className="h-3 w-3" /> Add line item
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
        className="h-8 w-full rounded border border-slate-200 bg-white px-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
        placeholder="Description"
        value={item.description || ""}
        onChange={(e) => onChange("description", e.target.value)}
      />
      <input
        className="h-8 w-full rounded border border-slate-200 bg-white px-2 text-sm text-right text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
        placeholder="Qty"
        type="number"
        min="0"
        value={item.qty ?? ""}
        onChange={(e) => onChange("qty", e.target.value)}
      />
      <input
        className="h-8 w-full rounded border border-slate-200 bg-white px-2 text-sm text-right text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
        placeholder="Unit $"
        type="number"
        min="0"
        step="0.01"
        value={item.unitPrice ?? ""}
        onChange={(e) => onChange("unitPrice", e.target.value)}
      />
      <span className="text-right text-sm font-medium text-slate-700 tabular-nums pr-1">
        {fmt(amount)}
      </span>
      <button
        onClick={onRemove}
        className="h-8 w-8 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
      >
        <Icons.Trash className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
