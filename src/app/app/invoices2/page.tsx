/**
 * Invoice Manager v2
 * ─────────────────────────────────────────────────────────
 * Architecture:
 *  lib/utils        – uid, fmt, date helpers
 *  lib/pdfEngine    – jsPDF invoice renderer (reads InvoicePreview layout)
 *  store/           – useAppStore (customers + invoices state)
 *  components/ui/   – Shadcn-style primitives
 *  components/invoice/LineItemsEditor  – unified flat+grouped editor
 *  components/invoice/InvoicePDFPreview – canonical invoice layout (source of truth)
 *  components/invoice/InvoiceForm      – create invoice modal form
 *  components/customers/CustomerForm   – create/edit customer
 *  pages/InvoicesPage
 *  pages/CustomersPage
 *  App (root)
 */
"use client";
import {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  createContext,
  useContext,
} from "react";

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
// lib/pdfEngine
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function loadJsPDF() {
  return new Promise((resolve) => {
    if (window.jspdf) return resolve(window.jspdf.jsPDF);
    const s = document.createElement("script");
    s.src =
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = () => resolve(window.jspdf.jsPDF);
    document.head.appendChild(s);
  });
}

/**
 * Renders the invoice to PDF.
 * Groups → only group name + aggregated total shown.
 * Standalone items → shown individually.
 */
async function generateInvoicePDF(invoice, customer, settings = {}) {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ unit: "pt", format: "letter" });

  const PAGE_W = 612;
  const M = 50;
  const CONTENT_W = PAGE_W - M * 2;

  // ── Palette ──
  const DARK = [15, 23, 42];
  const ACCENT = [99, 102, 241]; // indigo
  const MUTED = [100, 116, 139];
  const LIGHT_BG = [248, 250, 252];
  const ALT_BG = [241, 245, 249];
  const WHITE = [255, 255, 255];

  let y = 0;

  // Header band
  doc.setFillColor(...DARK);
  doc.rect(0, 0, PAGE_W, 72, "F");

  // Accent strip
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, 6, 72, "F");

  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(settings.companyName || "INVOICE", M + 8, 44);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`#${invoice.number}`, PAGE_W - M, 32, { align: "right" });
  doc.text(`Issued: ${invoice.date}`, PAGE_W - M, 47, { align: "right" });
  doc.text(`Due: ${invoice.dueDate}`, PAGE_W - M, 62, { align: "right" });

  y = 95;

  // Bill To + From columns
  const colW = CONTENT_W / 2 - 10;

  // Bill To
  doc.setTextColor(...ACCENT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("BILL TO", M, y);
  y += 14;
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(customer.name, M, y);
  y += 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  if (customer.email) {
    doc.text(customer.email, M, y);
    y += 13;
  }
  if (customer.address) {
    const lines = doc.splitTextToSize(customer.address, colW);
    doc.text(lines, M, y);
    y += lines.length * 13;
  }

  // Company From (right column)
  if (settings.companyName) {
    let ry = 95 + 14;
    doc.setTextColor(...ACCENT);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("FROM", M + colW + 20, 95);
    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(settings.companyName, M + colW + 20, ry);
    ry += 15;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    if (settings.companyEmail) {
      doc.text(settings.companyEmail, M + colW + 20, ry);
      ry += 13;
    }
    if (settings.companyAddress) {
      const al = doc.splitTextToSize(settings.companyAddress, colW);
      doc.text(al, M + colW + 20, ry);
    }
  }

  y = Math.max(y, 160) + 20;

  // Divider
  doc.setDrawColor(...ALT_BG);
  doc.setLineWidth(1);
  doc.line(M, y, PAGE_W - M, y);
  y += 20;

  // Table header
  const COL = {
    desc: M,
    qty: M + CONTENT_W * 0.58,
    price: M + CONTENT_W * 0.73,
    amount: PAGE_W - M,
  };
  doc.setFillColor(...ALT_BG);
  doc.rect(M, y - 2, CONTENT_W, 22, "F");
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("DESCRIPTION", COL.desc + 6, y + 12);
  doc.text("QTY", COL.qty, y + 12, { align: "right" });
  doc.text("UNIT PRICE", COL.price, y + 12, { align: "right" });
  doc.text("AMOUNT", COL.amount, y + 12, { align: "right" });
  y += 28;

  // Rows
  let rowIdx = 0;
  const lines = invoice.lines || [];

  for (const line of lines) {
    if (line.type === "group") {
      // Group header row
      if (rowIdx % 2 === 1) {
        doc.setFillColor(...LIGHT_BG);
        doc.rect(M, y - 3, CONTENT_W, 22, "F");
      }
      doc.setFillColor(...DARK);
      doc.rect(M, y - 3, 3, 22, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...DARK);
      const gTotal = calcGroupTotal(line);
      const descLines = doc.splitTextToSize(line.name, CONTENT_W * 0.54);
      doc.text(descLines, COL.desc + 8, y + 10);
      doc.text(fmt(gTotal), COL.amount, y + 10, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(
        `${line.items?.length || 0} line item${(line.items?.length || 0) !== 1 ? "s" : ""}`,
        COL.desc + 8,
        y + 20,
      );

      y += 28;
      rowIdx++;
    } else {
      // Standalone item
      if (rowIdx % 2 === 1) {
        doc.setFillColor(...LIGHT_BG);
        doc.rect(M, y - 3, CONTENT_W, 22, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...DARK);
      const descLines = doc.splitTextToSize(
        line.description || "",
        CONTENT_W * 0.54,
      );
      doc.text(descLines, COL.desc + 6, y + 10);
      doc.text(String(line.qty || ""), COL.qty, y + 10, { align: "right" });
      doc.text(fmt(parseFloat(line.unitPrice) || 0), COL.price, y + 10, {
        align: "right",
      });
      doc.text(fmt(calcItemAmount(line)), COL.amount, y + 10, {
        align: "right",
      });
      y += descLines.length > 1 ? 14 * descLines.length + 8 : 26;
      rowIdx++;
    }
  }

  y += 10;

  // Totals block
  const sub = calcSubtotal(lines);
  const tax = calcTax(lines, invoice.taxRate);
  const total = sub + tax;

  doc.setDrawColor(...ALT_BG);
  doc.line(M, y, PAGE_W - M, y);
  y += 16;

  const totX = PAGE_W - M - 200;
  const valX = PAGE_W - M;

  [
    [`Subtotal`, fmt(sub)],
    [`Tax (${invoice.taxRate || 0}%)`, fmt(tax)],
  ].forEach(([label, val]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(label, totX, y);
    doc.text(val, valX, y, { align: "right" });
    y += 16;
  });

  y += 4;
  doc.setFillColor(...DARK);
  doc.roundedRect(totX - 10, y - 14, valX - totX + 10, 28, 4, 4, "F");
  doc.setFillColor(...ACCENT);
  doc.roundedRect(totX - 10, y - 14, 4, 28, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.text("TOTAL DUE", totX, y + 6);
  doc.text(fmt(total), valX, y + 6, { align: "right" });

  y += 36;

  if (invoice.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...ACCENT);
    doc.text("NOTES", M, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    const nl = doc.splitTextToSize(invoice.notes, CONTENT_W);
    doc.text(nl, M, y);
    y += nl.length * 12 + 10;
  }

  // Footer
  const footerY = 760;
  doc.setFillColor(...DARK);
  doc.rect(0, footerY, PAGE_W, 32, "F");
  doc.setFillColor(...ACCENT);
  doc.rect(0, footerY, PAGE_W, 3, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    settings.footerText || "Thank you for your business.",
    PAGE_W / 2,
    footerY + 19,
    { align: "center" },
  );

  doc.save(`Invoice-${invoice.number}.pdf`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// store/useAppStore
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const AppStoreContext = createContext(null);

const SEED_CUSTOMERS = [
  {
    id: "c1",
    name: "Acme Corporation",
    email: "billing@acme.com",
    address: "123 Main St\nSpringfield, IL 62701",
  },
  {
    id: "c2",
    name: "Globex Industries",
    email: "ap@globex.com",
    address: "742 Evergreen Terrace\nSpringfield, IL 62702",
  },
];

function AppStoreProvider({ children }) {
  const [customers, setCustomers] = useState(SEED_CUSTOMERS);
  const [invoices, setInvoices] = useState([]);
  const [settings, setSettings] = useState({
    companyName: "Your Company",
    companyEmail: "hello@yourcompany.com",
    companyAddress: "456 Business Ave\nSuite 100",
    footerText: "Thank you for your business.",
  });

  const addCustomer = useCallback((data) => {
    const c = { id: uid(), ...data };
    setCustomers((prev) => [...prev, c]);
    return c;
  }, []);

  const updateCustomer = useCallback(
    (id, data) =>
      setCustomers((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...data } : c)),
      ),
    [],
  );

  const deleteCustomer = useCallback(
    (id) => setCustomers((prev) => prev.filter((c) => c.id !== id)),
    [],
  );

  const invoiceCount = useRef(0);
  const nextNumber = () => {
    invoiceCount.current += 1;
    return `INV-${String(invoiceCount.current).padStart(4, "0")}`;
  };

  const addInvoice = useCallback((data) => {
    let customerId = data.customerId;
    let newCustomer = null;
    if (data.isNewCustomer && data.newCustomerData?.name) {
      newCustomer = { id: uid(), ...data.newCustomerData };
      setCustomers((prev) => [...prev, newCustomer]);
      customerId = newCustomer.id;
    }
    const invoice = {
      id: uid(),
      number: nextNumber(),
      customerId,
      date: data.date,
      dueDate: data.dueDate,
      taxRate: parseFloat(data.taxRate) || 0,
      notes: data.notes || "",
      status: data.status || "draft",
      lines: data.lines || [],
      createdAt: new Date().toISOString(),
    };
    setInvoices((prev) => [invoice, ...prev]);
    return invoice;
  }, []);

  const updateInvoice = useCallback(
    (id, data) =>
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === id ? { ...inv, ...data } : inv)),
      ),
    [],
  );

  const deleteInvoice = useCallback(
    (id) => setInvoices((prev) => prev.filter((inv) => inv.id !== id)),
    [],
  );

  const value = {
    customers,
    invoices,
    settings,
    setSettings,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addInvoice,
    updateInvoice,
    deleteInvoice,
  };

  return (
    <AppStoreContext.Provider value={value}>
      {children}
    </AppStoreContext.Provider>
  );
}

const useAppStore = () => {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// components/ui  (Shadcn-style primitives)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const cn = (...cls) => cls.filter(Boolean).join(" ");

function Button({
  children,
  variant = "default",
  size = "default",
  asChild,
  className,
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none";
  const variants = {
    default: "bg-slate-900 text-white hover:bg-slate-800 shadow-sm",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    outline:
      "border border-input bg-background hover:bg-accent hover:text-accent-foreground border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    ghost:
      "hover:bg-accent hover:text-accent-foreground hover:bg-slate-100 text-slate-600",
    destructive: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
    link: "text-indigo-600 underline-offset-4 hover:underline",
  };
  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-11 rounded-md px-8 text-base",
    icon: "h-9 w-9",
  };
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}

function Input({ label, helper, error, className, id, ...props }) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-slate-500 uppercase tracking-wider leading-none"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors",
          "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-400 focus-visible:ring-red-400",
          className,
        )}
        {...props}
      />
      {helper && <p className="text-xs text-slate-400">{helper}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function Textarea({ label, className, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider leading-none">
          {label}
        </label>
      )}
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm",
          "placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900",
          "disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-colors",
          className,
        )}
        {...props}
      />
    </div>
  );
}

function Select({ label, children, className, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider leading-none">
          {label}
        </label>
      )}
      <select
        className={cn(
          "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900",
          "disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

function Badge({ children, variant = "default", className }) {
  const variants = {
    default: "bg-slate-100 text-slate-700 border-transparent",
    draft: "bg-slate-100 text-slate-600 border-transparent",
    sent: "bg-blue-50 text-blue-700 border-blue-200",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    overdue: "bg-red-50 text-red-700 border-red-200",
    group: "bg-indigo-50 text-indigo-700 border-indigo-200",
    item: "bg-slate-50 text-slate-600 border-slate-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variants[variant] || variants.default,
        className,
      )}
    >
      {children}
    </span>
  );
}

function Card({ children, className, ...props }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white shadow-sm text-card-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function CardHeader({ children, className }) {
  return (
    <div className={cn("flex flex-col space-y-1.5 p-6", className)}>
      {children}
    </div>
  );
}

function CardContent({ children, className }) {
  return <div className={cn("p-6 pt-0", className)}>{children}</div>;
}

function Separator({ className }) {
  return (
    <div
      className={cn(
        "shrink-0 bg-border h-[1px] w-full bg-slate-200",
        className,
      )}
    />
  );
}

function Tabs({ value, onValueChange, children, className }) {
  return (
    <div className={cn("", className)} data-tabs-value={value}>
      {children}
    </div>
  );
}

function TabsList({ children, className }) {
  return (
    <div
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-lg bg-slate-100 p-1 text-slate-500",
        className,
      )}
    >
      {children}
    </div>
  );
}

function TabsTrigger({ value, currentValue, onClick, children, className }) {
  const active = value === currentValue;
  return (
    <button
      onClick={() => onClick(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        active
          ? "bg-white text-slate-950 shadow"
          : "hover:bg-slate-200/60 text-slate-600",
      )}
    >
      {children}
    </button>
  );
}

function Dialog({ open, onOpenChange, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 m-auto flex">{children}</div>
    </div>
  );
}

function DialogContent({ children, className }) {
  return (
    <Card
      className={cn(
        "relative z-10 w-full max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95",
        className,
      )}
    >
      {children}
    </Card>
  );
}

function DialogHeader({ children, className }) {
  return (
    <div
      className={cn(
        "flex flex-col space-y-1.5 p-6 border-b border-slate-100",
        className,
      )}
    >
      {children}
    </div>
  );
}

function DialogTitle({ children, className }) {
  return (
    <h2
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-slate-900",
        className,
      )}
    >
      {children}
    </h2>
  );
}

function DialogClose({ onClose }) {
  return (
    <button
      onClick={onClose}
      className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  );
}

function ScrollArea({ children, className }) {
  return <div className={cn("overflow-y-auto", className)}>{children}</div>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// components/ui/Icons
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const Icons = {
  Plus: ({ className }) => (
    <svg
      className={cn("h-4 w-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Trash: ({ className }) => (
    <svg
      className={cn("h-4 w-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    </svg>
  ),
  Edit: ({ className }) => (
    <svg
      className={cn("h-4 w-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Download: ({ className }) => (
    <svg
      className={cn("h-4 w-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  ),
  FileText: ({ className }) => (
    <svg
      className={cn("h-4 w-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Users: ({ className }) => (
    <svg
      className={cn("h-4 w-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  Settings: ({ className }) => (
    <svg
      className={cn("h-4 w-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
  GripVertical: ({ className }) => (
    <svg
      className={cn("h-4 w-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="9" cy="12" r="1" fill="currentColor" />
      <circle cx="9" cy="5" r="1" fill="currentColor" />
      <circle cx="9" cy="19" r="1" fill="currentColor" />
      <circle cx="15" cy="12" r="1" fill="currentColor" />
      <circle cx="15" cy="5" r="1" fill="currentColor" />
      <circle cx="15" cy="19" r="1" fill="currentColor" />
    </svg>
  ),
  ChevronDown: ({ className }) => (
    <svg
      className={cn("h-4 w-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  ChevronRight: ({ className }) => (
    <svg
      className={cn("h-4 w-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Eye: ({ className }) => (
    <svg
      className={cn("h-4 w-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Folder: ({ className }) => (
    <svg
      className={cn("h-4 w-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  ),
  List: ({ className }) => (
    <svg
      className={cn("h-4 w-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
};

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
// components/invoice/InvoicePDFPreview
// Canonical invoice layout — source of truth for PDF
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function InvoicePDFPreview({ invoice, customer, settings = {} }) {
  const subtotal = calcSubtotal(invoice.lines || []);
  const tax = calcTax(invoice.lines || [], invoice.taxRate);
  const total = subtotal + tax;

  return (
    <div
      className="bg-white font-mono text-slate-900 shadow-2xl"
      style={{ width: "794px", minHeight: "1123px", fontSize: "12px" }}
    >
      {/* Header */}
      <div
        className="bg-slate-900 text-white px-10 py-8 flex items-start justify-between"
        style={{ borderLeft: "6px solid #6366f1" }}
      >
        <div>
          <div className="text-2xl font-bold tracking-tight font-sans">
            {settings.companyName || "INVOICE"}
          </div>
          {settings.companyEmail && (
            <div className="text-slate-400 text-xs mt-1">
              {settings.companyEmail}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-indigo-400 text-xs uppercase tracking-widest">
            Invoice
          </div>
          <div className="text-xl font-bold mt-0.5">#{invoice.number}</div>
          <div className="text-slate-400 text-xs mt-1">
            Issued: {invoice.date}
          </div>
          <div className="text-slate-400 text-xs">Due: {invoice.dueDate}</div>
        </div>
      </div>

      {/* Bill To / From */}
      <div className="px-10 py-6 grid grid-cols-2 gap-8 bg-slate-50 border-b border-slate-200">
        <div>
          <div className="text-indigo-600 text-xs font-bold uppercase tracking-widest mb-2">
            Bill To
          </div>
          <div className="font-bold text-base font-sans text-slate-900">
            {customer?.name}
          </div>
          {customer?.email && (
            <div className="text-slate-500 text-xs mt-0.5">
              {customer.email}
            </div>
          )}
          {customer?.address && (
            <div className="text-slate-500 text-xs mt-0.5 whitespace-pre-line">
              {customer.address}
            </div>
          )}
        </div>
        {settings.companyName && (
          <div className="text-right">
            <div className="text-indigo-600 text-xs font-bold uppercase tracking-widest mb-2">
              From
            </div>
            <div className="font-bold text-base font-sans text-slate-900">
              {settings.companyName}
            </div>
            {settings.companyEmail && (
              <div className="text-slate-500 text-xs mt-0.5">
                {settings.companyEmail}
              </div>
            )}
            {settings.companyAddress && (
              <div className="text-slate-500 text-xs mt-0.5 whitespace-pre-line">
                {settings.companyAddress}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Line items table */}
      <div className="px-10 py-6">
        {/* Table header */}
        <div
          className="grid gap-3 py-2 border-b-2 border-slate-900 mb-1 text-xs font-bold uppercase tracking-wider text-slate-500"
          style={{ gridTemplateColumns: "1fr 80px 100px 90px" }}
        >
          <span>Description</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Unit Price</span>
          <span className="text-right">Amount</span>
        </div>

        {(invoice.lines || []).map((line, idx) => {
          if (line.type === "group") {
            const gTotal = calcGroupTotal(line);
            return (
              <div key={line.id} className="border-b border-slate-100">
                <div
                  className="grid gap-3 py-2.5 font-sans text-sm font-semibold text-slate-800"
                  style={{
                    gridTemplateColumns: "1fr 80px 100px 90px",
                    borderLeft: "3px solid #6366f1",
                    paddingLeft: "8px",
                  }}
                >
                  <div>
                    <span>{line.name}</span>
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      ({line.items?.length} item
                      {line.items?.length !== 1 ? "s" : ""})
                    </span>
                  </div>
                  <span className="text-right text-slate-400">—</span>
                  <span className="text-right text-slate-400">—</span>
                  <span className="text-right tabular-nums">{fmt(gTotal)}</span>
                </div>
              </div>
            );
          }
          return (
            <div
              key={line.id}
              className={cn(
                "grid gap-3 py-2 border-b border-slate-100 text-sm",
                idx % 2 === 1 ? "bg-slate-50/50" : "",
              )}
              style={{ gridTemplateColumns: "1fr 80px 100px 90px" }}
            >
              <span className="text-slate-700">{line.description}</span>
              <span className="text-right text-slate-600 tabular-nums">
                {line.qty}
              </span>
              <span className="text-right text-slate-600 tabular-nums">
                {fmt(parseFloat(line.unitPrice) || 0)}
              </span>
              <span className="text-right text-slate-800 font-medium tabular-nums">
                {fmt(calcItemAmount(line))}
              </span>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div className="px-10 pb-8">
        <div className="ml-auto" style={{ width: "260px" }}>
          <div className="flex justify-between py-1 text-sm text-slate-500 border-t border-slate-200 mt-2">
            <span>Subtotal</span>
            <span className="tabular-nums">{fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between py-1 text-sm text-slate-500">
            <span>Tax ({invoice.taxRate || 0}%)</span>
            <span className="tabular-nums">{fmt(tax)}</span>
          </div>
          <div
            className="flex justify-between py-3 px-4 mt-2 bg-slate-900 text-white rounded-lg font-bold text-base"
            style={{ borderLeft: "4px solid #6366f1" }}
          >
            <span>Total Due</span>
            <span className="tabular-nums">{fmt(total)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="px-10 pb-8">
          <div className="text-indigo-600 text-xs font-bold uppercase tracking-widest mb-1">
            Notes
          </div>
          <div className="text-slate-500 text-xs whitespace-pre-line leading-relaxed">
            {invoice.notes}
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-slate-900 text-slate-400 text-xs text-center py-3"
        style={{ borderTop: "3px solid #6366f1" }}
      >
        {settings.footerText || "Thank you for your business."}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// components/invoice/InvoicePreviewModal
// Shows the canonical preview + triggers PDF
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function InvoicePreviewModal({
  invoice,
  customer,
  settings,
  open,
  onOpenChange,
}) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      await generateInvoicePDF(invoice, customer, settings);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[880px] w-full p-0">
        <DialogHeader className="px-6 py-4 border-b border-slate-100">
          <DialogTitle>Invoice Preview — #{invoice?.number}</DialogTitle>
          <DialogClose onClose={() => onOpenChange(false)} />
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] overflow-auto bg-slate-100 p-6">
          {invoice && customer && (
            <div className="flex justify-center">
              <div className="relative" style={{ width: "794px" }}>
                <InvoicePDFPreview
                  invoice={invoice}
                  customer={customer}
                  settings={settings}
                />
              </div>
            </div>
          )}
        </ScrollArea>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleDownload} disabled={loading}>
            {loading ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
                Generating…
              </>
            ) : (
              <>
                <Icons.Download className="h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// components/customers/CustomerForm
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CustomerForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial || { name: "", email: "", address: "" },
  );
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <Input
        label="Company / Name *"
        value={form.name}
        onChange={(e) => set("name", e.target.value)}
        placeholder="Acme Corporation"
      />
      <Input
        label="Email"
        type="email"
        value={form.email}
        onChange={(e) => set("email", e.target.value)}
        placeholder="billing@company.com"
      />
      <Textarea
        label="Billing Address"
        value={form.address}
        onChange={(e) => set("address", e.target.value)}
        rows={3}
        placeholder={"123 Main Street\nCity, State ZIP"}
      />
      <div className="flex gap-2 pt-2">
        <Button onClick={() => onSave(form)} disabled={!form.name.trim()}>
          {initial ? "Update Customer" : "Create Customer"}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// components/invoice/InvoiceForm
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function InvoiceForm({ customers, onSave, onCancel }) {
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
          <TabsTrigger value="details" currentValue={tab} onClick={setTab}>
            Details
          </TabsTrigger>
          <TabsTrigger value="items" currentValue={tab} onClick={setTab}>
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
// components/layout/StatCard
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function StatCard({ label, value, sub, accent }) {
  return (
    <Card className="p-5 relative overflow-hidden">
      {accent && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-xl" />
      )}
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
        {value}
      </p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </Card>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// pages/InvoicesPage
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function InvoicesPage() {
  const {
    invoices,
    customers,
    settings,
    addInvoice,
    deleteInvoice,
    updateInvoice,
  } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [preview, setPreview] = useState(null); // invoice id for preview

  const getCustomer = (id) => customers.find((c) => c.id === id);

  const stats = useMemo(() => {
    const paid = invoices
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + calcTotal(i.lines, i.taxRate), 0);
    const outstanding = invoices
      .filter((i) => ["sent", "overdue"].includes(i.status))
      .reduce((s, i) => s + calcTotal(i.lines, i.taxRate), 0);
    return { count: invoices.length, paid, outstanding };
  }, [invoices]);

  const handleSave = (formData) => {
    addInvoice(formData);
    setShowForm(false);
  };

  const previewInvoice = preview
    ? invoices.find((i) => i.id === preview)
    : null;
  const previewCustomer = previewInvoice
    ? getCustomer(previewInvoice.customerId)
    : null;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Invoices" value={stats.count} sub="all time" />
        <StatCard
          label="Revenue Collected"
          value={fmt(stats.paid)}
          sub="paid invoices"
          accent
        />
        <StatCard
          label="Outstanding"
          value={fmt(stats.outstanding)}
          sub="awaiting payment"
        />
        <StatCard label="Customers" value={customers.length} sub="registered" />
      </div>

      {/* Invoices table */}
      <Card>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-900">Invoices</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {invoices.length} total
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} size="sm">
            <Icons.Plus /> New Invoice
          </Button>
        </div>

        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Icons.FileText className="h-10 w-10 mb-3 opacity-30" />
            <p className="font-medium text-sm">No invoices yet</p>
            <p className="text-xs mt-1">
              Create your first invoice to get started
            </p>
            <Button
              className="mt-4"
              size="sm"
              onClick={() => setShowForm(true)}
            >
              <Icons.Plus /> Create Invoice
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {[
                    "Number",
                    "Customer",
                    "Date",
                    "Due",
                    "Lines",
                    "Total",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invoices.map((inv) => {
                  const customer = getCustomer(inv.customerId);
                  const total = calcTotal(inv.lines, inv.taxRate);
                  const groups = (inv.lines || []).filter(
                    (l) => l.type === "group",
                  ).length;
                  const items = (inv.lines || []).filter(
                    (l) => l.type === "item",
                  ).length;
                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50/80 group transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-sm font-medium text-slate-900">
                        {inv.number}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {customer?.name || (
                          <span className="text-slate-400 italic">Unknown</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 tabular-nums">
                        {inv.date}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 tabular-nums">
                        {inv.dueDate}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {items > 0 && (
                            <Badge variant="item">
                              {items} item{items !== 1 ? "s" : ""}
                            </Badge>
                          )}
                          {groups > 0 && (
                            <Badge variant="group">
                              {groups} group{groups !== 1 ? "s" : ""}
                            </Badge>
                          )}
                          {items === 0 && groups === 0 && (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900 tabular-nums">
                        {fmt(total)}
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={inv.status}
                          onChange={(e) =>
                            updateInvoice(inv.id, { status: e.target.value })
                          }
                          className="h-7 text-xs py-0 w-28"
                        >
                          {["draft", "sent", "paid", "overdue"].map((s) => (
                            <option key={s} value={s}>
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPreview(inv.id)}
                            className="h-8 w-8 flex items-center justify-center rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Preview & Download PDF"
                          >
                            <Icons.Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteInvoice(inv.id)}
                            className="h-8 w-8 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Icons.Trash className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* New Invoice Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl w-full p-0">
          <DialogHeader className="px-6 py-4">
            <DialogTitle>New Invoice</DialogTitle>
            <DialogClose onClose={() => setShowForm(false)} />
          </DialogHeader>
          <InvoiceForm
            customers={customers}
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      {previewInvoice && (
        <InvoicePreviewModal
          invoice={previewInvoice}
          customer={previewCustomer}
          settings={settings}
          open={!!preview}
          onOpenChange={(o) => !o && setPreview(null)}
        />
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// pages/CustomersPage
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CustomersPage() {
  const { customers, invoices, addCustomer, updateCustomer, deleteCustomer } =
    useAppStore();
  const [modal, setModal] = useState(null); // null | "new" | "edit"
  const [editing, setEditing] = useState(null);

  const invoiceCountFor = (cid) =>
    invoices.filter((i) => i.customerId === cid).length;
  const revenueFor = (cid) =>
    invoices
      .filter((i) => i.customerId === cid && i.status === "paid")
      .reduce((s, i) => s + calcTotal(i.lines, i.taxRate), 0);

  const handleSave = (data) => {
    if (editing) {
      updateCustomer(editing.id, data);
    } else {
      addCustomer(data);
    }
    setModal(null);
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-900">Customers</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {customers.length} registered
            </p>
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setModal("new");
            }}
            size="sm"
          >
            <Icons.Plus /> New Customer
          </Button>
        </div>

        {customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Icons.Users className="h-10 w-10 mb-3 opacity-30" />
            <p className="font-medium text-sm">No customers yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {[
                  "Name",
                  "Email",
                  "Address",
                  "Invoices",
                  "Paid Revenue",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {customers.map((c) => {
                const count = invoiceCountFor(c.id);
                return (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {c.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {c.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 max-w-xs">
                      <span className="line-clamp-1">
                        {c.address?.replace(/\n/g, ", ") || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {count}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800 tabular-nums">
                      {fmt(revenueFor(c.id))}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditing(c);
                            setModal("edit");
                          }}
                          className="h-8 w-8 flex items-center justify-center rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <Icons.Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteCustomer(c.id)}
                          disabled={count > 0}
                          title={
                            count > 0 ? "Cannot delete: has invoices" : "Delete"
                          }
                          className="h-8 w-8 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Icons.Trash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Dialog open={!!modal} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="max-w-md w-full p-0">
          <DialogHeader className="px-6 py-4">
            <DialogTitle>
              {modal === "edit" ? "Edit Customer" : "New Customer"}
            </DialogTitle>
            <DialogClose onClose={() => setModal(null)} />
          </DialogHeader>
          <div className="px-6 py-5">
            <CustomerForm
              initial={editing || undefined}
              onSave={handleSave}
              onCancel={() => setModal(null)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// pages/SettingsPage
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function SettingsPage() {
  const { settings, setSettings } = useAppStore();
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-xl space-y-6">
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-slate-900">Company Settings</h2>
          <p className="text-xs text-slate-400">
            These details appear on all generated invoices.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Company Name"
            value={form.companyName}
            onChange={(e) =>
              setForm((f) => ({ ...f, companyName: e.target.value }))
            }
          />
          <Input
            label="Company Email"
            type="email"
            value={form.companyEmail}
            onChange={(e) =>
              setForm((f) => ({ ...f, companyEmail: e.target.value }))
            }
          />
          <Textarea
            label="Company Address"
            value={form.companyAddress}
            onChange={(e) =>
              setForm((f) => ({ ...f, companyAddress: e.target.value }))
            }
            rows={3}
          />
          <Input
            label="Invoice Footer Text"
            value={form.footerText}
            onChange={(e) =>
              setForm((f) => ({ ...f, footerText: e.target.value }))
            }
            helper="Appears at the bottom of every PDF invoice"
          />
          <div className="pt-2">
            <Button onClick={save}>
              {saved ? "✓ Saved" : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// components/layout/AppShell
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function AppShell({ children, activePage, onNavigate }) {
  const navItems = [
    { id: "invoices", label: "Invoices", icon: Icons.FileText },
    { id: "customers", label: "Customers", icon: Icons.Users },
    { id: "settings", label: "Settings", icon: Icons.Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-56 bg-slate-900 flex flex-col z-30">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              }}
            >
              <Icons.FileText className="h-4 w-4 text-white" />
            </div>
            <span className="text-white font-bold text-base tracking-tight">
              Invoicer
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ id, label, icon: NavIcon }) => {
            const active = activePage === id;
            return (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                  active
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-900/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800",
                )}
              >
                <NavIcon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-slate-800">
          <p className="text-xs text-slate-600">Invoice Manager v2</p>
        </div>
      </aside>

      {/* Main */}
      <main className="pl-56">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-8 h-14 flex items-center">
          <h1 className="font-semibold text-slate-900 capitalize">
            {activePage}
          </h1>
        </header>

        {/* Page content */}
        <div className="px-8 py-8">{children}</div>
      </main>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// App (root)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function AppContent() {
  const [page, setPage] = useState("invoices");

  return (
    <AppShell activePage={page} onNavigate={setPage}>
      {page === "invoices" && <InvoicesPage />}
      {page === "customers" && <CustomersPage />}
      {page === "settings" && <SettingsPage />}
    </AppShell>
  );
}

export default function App() {
  return (
    <AppStoreProvider>
      <AppContent />
    </AppStoreProvider>
  );
}
