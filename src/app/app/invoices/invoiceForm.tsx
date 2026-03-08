import { useState } from "react";

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

// ── Utils ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);
const fmtBHD = (fils) => `BHD ${((fils ?? 0) / 1000).toFixed(3)}`;
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

// ── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bg: "#080c18",
  surface: "#0f1623",
  card: "#111827",
  border: "#1a2540",
  borderHi: "#1e3a5f",
  muted: "#334155",
  subtle: "#475569",
  dim: "#64748b",
  text: "#e2e8f0",
  textSoft: "#94a3b8",
  primary: "#3b82f6",
  primaryBg: "#1e3a5f",
  green: "#22c55e",
  greenBg: "#14432a",
  red: "#ef4444",
  redBg: "#3b1515",
};
const base = {
  fontFamily: "'DM Sans','Segoe UI',sans-serif",
  boxSizing: "border-box",
};
const inp = (x = {}) => ({
  ...base,
  width: "100%",
  boxSizing: "border-box",
  background: "#0a0f1e",
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  color: C.text,
  fontSize: 13,
  padding: "8px 10px",
  outline: "none",
  transition: "border-color 0.15s",
  ...x,
});
const b = (x = {}) => ({
  ...base,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  border: "none",
  transition: "opacity 0.15s, background 0.15s",
  whiteSpace: "nowrap",
  ...x,
});
const lbl = {
  fontSize: 11,
  fontWeight: 700,
  color: C.dim,
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  marginBottom: 5,
  display: "block",
};

const methodMeta = {
  cash: { label: "Cash", icon: "💵", color: "#22c55e", bg: "#14432a" },
  bank: { label: "Bank Transfer", icon: "🏦", color: "#60a5fa", bg: "#1e3a5f" },
  card: { label: "Card", icon: "💳", color: "#a78bfa", bg: "#2e1b5e" },
  cheque: { label: "Cheque", icon: "📝", color: "#fb923c", bg: "#3b1f0a" },
  online: { label: "Online", icon: "🌐", color: "#22d3ee", bg: "#0c2f38" },
};

// ── FocusInput ─────────────────────────────────────────────────────────────
function FocusInput({ style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      style={{
        ...inp(),
        ...style,
        ...(focused
          ? {
              borderColor: C.primary,
              boxShadow: "0 0 0 2px rgba(59,130,246,0.15)",
            }
          : {}),
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

// ── Dialog shell ───────────────────────────────────────────────────────────
function Dialog({ onClose, title, subtitle, children, maxW = 520 }) {
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: "16px 16px 0 0",
          width: "100%",
          maxWidth: maxW,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          animation: "slideUp .22s cubic-bezier(.22,1,.36,1)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            paddingTop: 10,
            paddingBottom: 4,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: C.muted,
            }}
          />
        </div>
        <div
          style={{
            padding: "10px 20px 14px",
            borderBottom: `1px solid ${C.border}`,
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>
              {subtitle}
            </div>
          )}
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>{children}</div>
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}

// ── Inventory Picker ───────────────────────────────────────────────────────
function InventoryPicker({ onSelect, onClose }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState([]);
  const filtered = MOCK_INVENTORY.filter((i) =>
    `${i.code} ${i.name} ${i.description}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  const toggle = (item) =>
    setSel((p: any) =>
      p.find((x: any) => x.id === item.id)
        ? p.filter((x: any) => x.id !== item.id)
        : [...p, item],
    );
  const confirm = () => {
    sel.forEach(onSelect);
    onClose();
  };
  return (
    <Dialog
      onClose={onClose}
      title="Add from Inventory"
      subtitle="Select one or more items"
    >
      <div style={{ padding: "12px 20px 8px" }}>
        <FocusInput
          placeholder="🔍  Search items…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
      </div>
      <div>
        {filtered.map((item) => {
          const isSel = !!sel.find((x) => x.id === item.id);
          return (
            <div
              key={item.id}
              onClick={() => toggle(item)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 20px",
                cursor: "pointer",
                borderBottom: `1px solid ${C.bg}`,
                background: isSel ? "#0d1a2e" : "transparent",
                transition: "background .1s",
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  flexShrink: 0,
                  border: `2px solid ${isSel ? C.primary : C.muted}`,
                  background: isSel ? C.primary : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all .15s",
                }}
              >
                {isSel && (
                  <span
                    style={{
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                  >
                    ✓
                  </span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{ fontSize: 13, fontWeight: 600, color: C.text }}
                  >
                    {item.name}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: C.dim,
                      background: C.surface,
                      borderRadius: 4,
                      padding: "1px 5px",
                    }}
                  >
                    {item.code}
                  </span>
                </div>
                {item.description && (
                  <div style={{ fontSize: 11, color: C.subtle, marginTop: 1 }}>
                    {item.description}
                  </div>
                )}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: C.primary,
                  flexShrink: 0,
                }}
              >
                {fmtBHD(item.salesPrice)}
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          padding: "14px 20px",
          borderTop: `1px solid ${C.border}`,
          display: "flex",
          gap: 10,
        }}
      >
        <button
          onClick={onClose}
          style={b({
            background: C.surface,
            color: C.textSoft,
            border: `1px solid ${C.border}`,
            flex: 1,
          })}
        >
          Cancel
        </button>
        <button
          onClick={confirm}
          disabled={!sel.length}
          style={b({
            background: C.primary,
            color: "#fff",
            flex: 2,
            opacity: sel.length ? 1 : 0.4,
            cursor: sel.length ? "pointer" : "not-allowed",
          })}
        >
          Add {sel.length > 0 ? `${sel.length} ` : ""}Item
          {sel.length !== 1 ? "s" : ""}
        </button>
      </div>
    </Dialog>
  );
}

// ── Payment Dialog ─────────────────────────────────────────────────────────
function PaymentDialog({ payments, total, onChange, onClose }) {
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState({
    date: today(),
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
      date: today(),
      method: "cash",
      amount: "",
      reference: "",
      notes: "",
    });
    setTab("list");
  };

  return (
    <Dialog
      onClose={onClose}
      title="Payments"
      subtitle={`Balance: ${fmtBHD(balance)}`}
    >
      <div
        style={{
          display: "flex",
          borderBottom: `1px solid ${C.border}`,
          padding: "0 20px",
        }}
      >
        {[
          ["list", "History"],
          ["add", "＋ Record"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={b({
              background: "transparent",
              border: "none",
              padding: "10px 14px",
              fontSize: 13,
              borderRadius: 0,
              color: tab === key ? C.primary : C.dim,
              borderBottom:
                tab === key
                  ? `2px solid ${C.primary}`
                  : "2px solid transparent",
              marginBottom: -1,
            })}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <div>
          {payments.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "36px 20px",
                color: C.muted,
                fontSize: 13,
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>💳</div>No payments
              recorded yet
            </div>
          )}
          {payments.map((p, i) => {
            const m = methodMeta[p.method] || methodMeta.cash;
            return (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 20px",
                  borderBottom: `1px solid ${C.bg}`,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: m.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  {m.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                    {m.label}
                    {p.reference ? ` · #${p.reference}` : ""}
                  </div>
                  <div style={{ fontSize: 11, color: C.dim }}>
                    {p.date}
                    {p.notes ? ` · ${p.notes}` : ""}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: C.green,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmtBHD(toFils(p.amount))}
                </span>
                <button
                  onClick={() => onChange(payments.filter((_, j) => j !== i))}
                  style={b({
                    background: "transparent",
                    border: "none",
                    padding: "4px 6px",
                    color: C.muted,
                    fontSize: 14,
                  })}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.red)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
                >
                  ✕
                </button>
              </div>
            );
          })}
          <div style={{ padding: "14px 20px", background: C.surface }}>
            {[
              ["Invoice Total", fmtBHD(total), C.textSoft],
              ["Total Paid", fmtBHD(paid), C.green],
            ].map(([label, val, color]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: C.dim,
                  marginBottom: 6,
                }}
              >
                <span>{label}</span>
                <span style={{ color, fontWeight: 600 }}>{val}</span>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 14,
                fontWeight: 700,
                paddingTop: 8,
                borderTop: `1px solid ${C.border}`,
              }}
            >
              <span style={{ color: balance > 0 ? C.red : C.green }}>
                Balance Due
              </span>
              <span
                style={{
                  color: balance > 0 ? C.red : C.green,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fmtBHD(balance)}
              </span>
            </div>
          </div>
        </div>
      )}

      {tab === "add" && (
        <div style={{ padding: 20 }}>
          <div style={{ marginBottom: 14 }}>
            <div style={lbl}>Payment Method</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {Object.entries(methodMeta).map(([key, m]) => (
                <button
                  key={key}
                  onClick={() => setDraft((d) => ({ ...d, method: key }))}
                  style={b({
                    padding: "7px 12px",
                    fontSize: 12,
                    background: draft.method === key ? m.bg : C.surface,
                    color: draft.method === key ? m.color : C.dim,
                    border: `1px solid ${draft.method === key ? m.color + "40" : C.border}`,
                    transition: "all .15s",
                  })}
                >
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <div style={lbl}>Amount (BHD)</div>
              <FocusInput
                type="number"
                min="0"
                step="0.001"
                placeholder="0.000"
                value={draft.amount}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, amount: e.target.value }))
                }
              />
            </div>
            <div>
              <div style={lbl}>Date</div>
              <FocusInput
                type="date"
                value={draft.date}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, date: e.target.value }))
                }
              />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={lbl}>Reference #</div>
            <FocusInput
              placeholder="Transaction / cheque number"
              value={draft.reference}
              onChange={(e) =>
                setDraft((d) => ({ ...d, reference: e.target.value }))
              }
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <div style={lbl}>Notes</div>
            <FocusInput
              placeholder="Optional note"
              value={draft.notes}
              onChange={(e) =>
                setDraft((d) => ({ ...d, notes: e.target.value }))
              }
            />
          </div>
          <button
            onClick={addPayment}
            disabled={!draft.amount}
            style={b({
              background: C.primary,
              color: "#fff",
              width: "100%",
              padding: "12px",
              fontSize: 14,
              opacity: draft.amount ? 1 : 0.4,
              cursor: draft.amount ? "pointer" : "not-allowed",
            })}
          >
            Record Payment
          </button>
        </div>
      )}
    </Dialog>
  );
}

// ── LineItemRow ────────────────────────────────────────────────────────────
function LineItemRow({ item, onChange, onRemove, compact = false }) {
  const total = calcItemTotal(item);
  const grid = compact ? "1fr 50px 86px 74px 28px" : "1fr 56px 96px 82px 30px";
  const fs = compact ? 12 : 13;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: grid,
        gap: 6,
        alignItems: "center",
        padding: "3px 0",
      }}
    >
      <div style={{ position: "relative" }}>
        <FocusInput
          placeholder="Description"
          value={item.description || ""}
          onChange={(e) => onChange("description", e.target.value)}
          style={{ fontSize: fs, paddingRight: item.inventoryItemId ? 26 : 10 }}
        />
        {item.inventoryItemId && (
          <span
            title="From inventory"
            style={{
              position: "absolute",
              right: 7,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 10,
              opacity: 0.55,
            }}
          >
            📦
          </span>
        )}
      </div>
      <FocusInput
        type="number"
        min="0"
        step="1"
        placeholder="1"
        value={item.qty ?? ""}
        onChange={(e) => onChange("qty", e.target.value)}
        style={{ textAlign: "right", fontSize: fs }}
      />
      <FocusInput
        type="number"
        min="0"
        step="0.001"
        placeholder="0.000"
        value={item.salesPrice ? fromFils(item.salesPrice) : ""}
        onChange={(e) => onChange("salesPrice", toFils(e.target.value))}
        style={{ textAlign: "right", fontSize: fs }}
      />
      <div
        style={{
          textAlign: "right",
          fontSize: 12,
          fontWeight: 600,
          color: C.textSoft,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {fmtBHD(total)}
      </div>
      <button
        onClick={onRemove}
        style={b({
          background: "transparent",
          border: "none",
          padding: "4px",
          color: C.muted,
          fontSize: 14,
        })}
        onMouseEnter={(e) => (e.currentTarget.style.color = C.red)}
        onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
      >
        ✕
      </button>
    </div>
  );
}

// ── GroupBlock ─────────────────────────────────────────────────────────────
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
    <div
      style={{
        border: `1px solid ${C.borderHi}`,
        borderRadius: 10,
        overflow: "hidden",
        marginBottom: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 12px",
          background: "#0a1525",
        }}
      >
        <button
          onClick={() => setExpanded((x) => !x)}
          style={b({
            background: "transparent",
            border: "none",
            padding: "2px",
            color: C.dim,
            fontSize: 13,
            lineHeight: 1,
          })}
        >
          {expanded ? "▾" : "▸"}
        </button>
        <span style={{ fontSize: 13 }}>📁</span>
        <input
          value={group.name || ""}
          onChange={(e) => onChange({ ...group, name: e.target.value })}
          placeholder="Group name…"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: C.text,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "inherit",
            minWidth: 0,
          }}
        />
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: C.primary,
            fontVariantNumeric: "tabular-nums",
            flexShrink: 0,
          }}
        >
          {fmtBHD(total)}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            background: C.surface,
            color: C.dim,
            borderRadius: 20,
            padding: "2px 7px",
            flexShrink: 0,
          }}
        >
          {group.items?.length || 0}
        </span>
        <button
          onClick={onRemove}
          style={b({
            background: "transparent",
            border: "none",
            padding: "2px",
            color: C.muted,
            fontSize: 14,
          })}
          onMouseEnter={(e) => (e.currentTarget.style.color = C.red)}
          onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
        >
          ✕
        </button>
      </div>
      {expanded && (
        <div
          style={{ padding: "10px 12px", borderTop: `1px solid ${C.border}` }}
        >
          {group.items?.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 50px 86px 74px 28px",
                gap: 6,
                padding: "2px 0 6px",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: C.muted,
              }}
            >
              {["Description", "Qty", "Unit $", "Amount", ""].map((h) => (
                <span
                  key={h}
                  style={{
                    textAlign:
                      h === "Description" || h === "" ? "left" : "right",
                  }}
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
            <div
              style={{
                textAlign: "center",
                padding: "10px 0",
                color: C.muted,
                fontSize: 12,
              }}
            >
              Empty — add items below
            </div>
          )}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 8,
              paddingTop: 8,
              borderTop: `1px solid ${C.border}`,
            }}
          >
            <button
              onClick={addManual}
              style={b({
                background: "transparent",
                border: "none",
                padding: "4px 8px",
                fontSize: 12,
                color: C.primary,
              })}
            >
              ＋ Manual
            </button>
            <button
              onClick={onPickInventory}
              style={b({
                background: "transparent",
                border: "none",
                padding: "4px 8px",
                fontSize: 12,
                color: "#10b981",
              })}
            >
              📦 Inventory
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Footer Bar ─────────────────────────────────────────────────────────────
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
  const rows = [
    ["Subtotal", fmtBHD(subtotal), C.textSoft, false],
    [`Tax (${taxRate || 0}%)`, fmtBHD(taxAmt), C.textSoft, false],
    ["Total", fmtBHD(total), C.text, true],
    ...(payments.length > 0
      ? [
          ["Paid", `− ${fmtBHD(paid)}`, C.green, false],
          ["Balance", fmtBHD(balance), balance > 0 ? C.red : C.green, true],
        ]
      : []),
  ];
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: C.card,
        borderTop: `1px solid ${C.border}`,
        boxShadow: "0 -8px 32px rgba(0,0,0,0.5)",
      }}
    >
      {expanded && (
        <div
          style={{
            padding: "14px 20px",
            borderBottom: `1px solid ${C.border}`,
            background: C.surface,
            animation: "fadeIn .15s ease",
          }}
        >
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            {rows.map(([label, val, color, bold], i) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "5px 0",
                  fontSize: bold ? 14 : 12,
                  fontWeight: bold ? 700 : 400,
                  marginTop: bold && i > 0 ? 4 : 0,
                  paddingTop: bold && i > 0 ? 8 : 5,
                  borderTop: bold && i > 0 ? `1px solid ${C.border}` : "none",
                }}
              >
                <span style={{ color: C.dim }}>{label}</span>
                <span style={{ color, fontVariantNumeric: "tabular-nums" }}>
                  {val}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div
        style={{
          padding: "10px 14px",
          maxWidth: 900,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {/* Tappable total */}
        <button
          onClick={() => setExpanded((x) => !x)}
          style={b({
            background: C.surface,
            border: `1px solid ${C.border}`,
            color: C.text,
            padding: "8px 12px",
            gap: 7,
            flexShrink: 0,
          })}
        >
          <span style={{ fontSize: 10, color: C.dim, fontWeight: 700 }}>
            TOTAL
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: C.primary,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmtBHD(total)}
          </span>
          <span
            style={{
              fontSize: 10,
              color: C.dim,
              display: "inline-block",
              transform: expanded ? "rotate(180deg)" : "none",
              transition: "transform .2s",
            }}
          >
            ▲
          </span>
        </button>
        {/* Payments pill */}
        <button
          onClick={onPayments}
          style={b({
            background: paid > 0 ? C.greenBg : C.surface,
            border: `1px solid ${paid > 0 ? C.green + "35" : C.border}`,
            color: paid > 0 ? C.green : C.dim,
            padding: "8px 12px",
            flexShrink: 0,
          })}
        >
          💳 {paid > 0 ? fmtBHD(paid) : "Payments"}
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={onDraft}
          style={b({
            background: C.surface,
            color: C.textSoft,
            border: `1px solid ${C.border}`,
            padding: "9px 12px",
          })}
        >
          <span
            style={{
              display: "none",
              "@media(min-width:400px)": { display: "inline" },
            }}
          >
            Save{" "}
          </span>
          Draft
        </button>
        <button
          onClick={onSave}
          style={b({
            background: C.primary,
            color: "#fff",
            padding: "9px 16px",
            fontWeight: 700,
          })}
        >
          Save Invoice
        </button>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function InvoiceEditor() {
  const [lines, setLines] = useState([]);
  const [taxRate, setTaxRate] = useState(0);
  const [payments, setPayments] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null);
  const [paymentsOpen, setPaymentsOpen] = useState(false);

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
    if (pickerTarget === null)
      setLines((l) => [...l, { ...item, type: "item" }]);
    else
      setLines((l) =>
        l.map((line) =>
          line.id === pickerTarget
            ? { ...line, items: [...(line.items || []), item] }
            : line,
        ),
      );
  };

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

  const subtotal = calcSubtotal(lines);
  const taxAmt = calcTax(subtotal, taxRate);
  const total = subtotal + taxAmt;
  const paid = payments.reduce((s, p) => s + toFils(p.amount), 0);

  const hasItems = lines.some((l) => l.type === "item");

  return (
    <div
      style={{
        background: C.bg,
        minHeight: "100vh",
        color: C.text,
        fontFamily: "'DM Sans','Segoe UI',sans-serif",
        paddingBottom: 76,
      }}
    >
      {/* Topbar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: C.surface,
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 14px",
          height: 52,
        }}
      >
        <button
          style={b({
            background: "transparent",
            border: "none",
            color: C.dim,
            padding: "6px",
            fontSize: 18,
            lineHeight: 1,
          })}
        >
          ←
        </button>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: C.text,
            letterSpacing: "-0.2px",
            flex: 1,
          }}
        >
          Invoice Items
        </div>
        {/* Tax inline */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "5px 10px",
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: C.dim,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            TAX %
          </span>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder="0"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            style={{
              width: 48,
              background: "transparent",
              border: "none",
              outline: "none",
              color: C.text,
              fontSize: 13,
              fontWeight: 700,
              textAlign: "right",
              fontFamily: "inherit",
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "16px 14px 0" }}>
        {/* Column headers */}
        {hasItems && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 56px 96px 82px 30px",
              gap: 6,
              padding: "4px 2px 8px",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: C.muted,
            }}
          >
            {["Description", "Qty", "Unit Price", "Amount", ""].map((h) => (
              <span
                key={h}
                style={{
                  textAlign: h === "Description" || h === "" ? "left" : "right",
                }}
              >
                {h}
              </span>
            ))}
          </div>
        )}

        {/* Empty state */}
        {lines.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "52px 20px",
              border: `2px dashed ${C.border}`,
              borderRadius: 14,
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.subtle }}>
              No items yet
            </div>
            <div
              style={{
                fontSize: 12,
                color: C.muted,
                marginTop: 4,
                textAlign: "center",
              }}
            >
              Add manual entries or select from your inventory
            </div>
          </div>
        )}

        {/* Lines */}
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

        {/* Subtotal row */}
        {lines.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              padding: "10px 2px 4px",
              borderTop: `1px solid ${C.border}`,
              marginTop: 6,
            }}
          >
            <span style={{ fontSize: 12, color: C.dim }}>
              Subtotal:{" "}
              <strong
                style={{
                  color: C.textSoft,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fmtBHD(subtotal)}
              </strong>
            </span>
          </div>
        )}

        {/* Add buttons */}
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}
        >
          <button
            onClick={addManualItem}
            style={b({
              background: C.card,
              color: C.textSoft,
              border: `1px solid ${C.border}`,
              padding: "9px 14px",
            })}
          >
            ＋ Manual Item
          </button>
          <button
            onClick={() => openPicker(null)}
            style={b({
              background: C.primaryBg,
              color: C.primary,
              border: `1px solid ${C.primaryBg}`,
              padding: "9px 14px",
            })}
          >
            📦 From Inventory
          </button>
          <button
            onClick={addGroup}
            style={b({
              background: "#0a2a1e",
              color: "#10b981",
              border: "1px solid #0f3d2a",
              padding: "9px 14px",
            })}
          >
            📁 Add Group
          </button>
        </div>
      </div>

      {/* Footer */}
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

      {/* Dialogs */}
      {pickerOpen && (
        <InventoryPicker
          onSelect={handleInvSelect}
          onClose={() => setPickerOpen(false)}
        />
      )}
      {paymentsOpen && (
        <PaymentDialog
          payments={payments}
          total={total}
          onChange={setPayments}
          onClose={() => setPaymentsOpen(false)}
        />
      )}
    </div>
  );
}
