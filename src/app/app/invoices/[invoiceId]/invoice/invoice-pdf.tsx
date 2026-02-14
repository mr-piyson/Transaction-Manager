import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type InvoiceItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export type InvoiceData = {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  billTo: {
    name: string;
    address: string;
    email?: string;
  };
  from: {
    name: string;
    address: string;
    email?: string;
  };
  currency: string;
  items: InvoiceItem[];
  notes?: string;
};

const PAGE = {
  width: 595.28, // A4 portrait in points
  height: 841.89,
  margin: 48,
  rowHeight: 18,
};

function formatMoney(v: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(v);
}

function sum(items: InvoiceItem[]) {
  return items.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
}

export async function generateInvoicePdf(data: InvoiceData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const usableWidth = PAGE.width - PAGE.margin * 2;
  const tableCols = {
    desc: PAGE.margin,
    qty: PAGE.margin + usableWidth * 0.58,
    unit: PAGE.margin + usableWidth * 0.72,
    total: PAGE.margin + usableWidth * 0.86,
  };

  const addPage = () => {
    const page = pdf.addPage([PAGE.width, PAGE.height]);
    return { page, y: PAGE.height - PAGE.margin };
  };

  const drawText = (page: any, text: string, x: number, y: number, size = 10, fontRef = font) => page.drawText(text, { x, y, size, font: fontRef, color: rgb(0, 0, 0) });

  const drawHeader = (ctx: { page: any; y: number }) => {
    const { page } = ctx;

    drawText(page, "INVOICE", PAGE.margin, ctx.y, 18, bold);
    ctx.y -= 28;

    drawText(page, data.from.name, PAGE.margin, ctx.y, 11, bold);
    ctx.y -= 14;
    drawText(page, data.from.address, PAGE.margin, ctx.y);
    ctx.y -= 14;
    if (data.from.email) {
      drawText(page, data.from.email, PAGE.margin, ctx.y);
      ctx.y -= 18;
    } else {
      ctx.y -= 4;
    }

    const rightX = PAGE.width - PAGE.margin - 200;
    let ry = PAGE.height - PAGE.margin - 6;
    drawText(page, `Invoice #: ${data.invoiceNumber}`, rightX, ry, 10, bold);
    ry -= 14;
    drawText(page, `Issue Date: ${data.issueDate}`, rightX, ry);
    ry -= 14;
    drawText(page, `Due Date: ${data.dueDate}`, rightX, ry);

    ctx.y -= 8;

    drawText(page, "Bill To:", PAGE.margin, ctx.y, 11, bold);
    ctx.y -= 14;
    drawText(page, data.billTo.name, PAGE.margin, ctx.y);
    ctx.y -= 14;
    drawText(page, data.billTo.address, PAGE.margin, ctx.y);
    ctx.y -= 14;
    if (data.billTo.email) {
      drawText(page, data.billTo.email, PAGE.margin, ctx.y);
      ctx.y -= 16;
    }

    // Table header
    ctx.y -= 8;
    page.drawLine({
      start: { x: PAGE.margin, y: ctx.y },
      end: { x: PAGE.width - PAGE.margin, y: ctx.y },
      thickness: 1,
    });
    ctx.y -= 14;

    drawText(page, "Description", tableCols.desc, ctx.y, 10, bold);
    drawText(page, "Qty", tableCols.qty, ctx.y, 10, bold);
    drawText(page, "Unit", tableCols.unit, ctx.y, 10, bold);
    drawText(page, "Total", tableCols.total, ctx.y, 10, bold);

    ctx.y -= 10;
    page.drawLine({
      start: { x: PAGE.margin, y: ctx.y },
      end: { x: PAGE.width - PAGE.margin, y: ctx.y },
      thickness: 1,
    });
    ctx.y -= 12;
  };

  const addFooter = (page: any, pageIndex: number, totalPages: number) => {
    const text = `Page ${pageIndex + 1} of ${totalPages}`;
    page.drawText(text, {
      x: PAGE.width - PAGE.margin - 90,
      y: 20,
      size: 9,
      font,
    });
  };

  // Pagination
  const pages: { page: any; y: number }[] = [];
  pages.push(addPage());
  drawHeader(pages[0]);

  const bottomLimit = PAGE.margin + 80;

  for (const item of data.items) {
    const ctx = pages[pages.length - 1];
    if (ctx.y <= bottomLimit) {
      pages.push(addPage());
      drawHeader(pages[pages.length - 1]);
    }
    const rowTotal = item.quantity * item.unitPrice;

    drawText(ctx.page, item.description, tableCols.desc, ctx.y);
    drawText(ctx.page, String(item.quantity), tableCols.qty, ctx.y);
    drawText(ctx.page, formatMoney(item.unitPrice, data.currency), tableCols.unit, ctx.y);
    drawText(ctx.page, formatMoney(rowTotal, data.currency), tableCols.total, ctx.y);

    ctx.y -= PAGE.rowHeight;
  }

  // Totals + notes on last page (or new page if needed)
  let ctx = pages[pages.length - 1];
  if (ctx.y <= bottomLimit) {
    pages.push(addPage());
    ctx = pages[pages.length - 1];
    drawHeader(ctx);
  }

  const subtotal = sum(data.items);
  const tax = subtotal * 0.0;
  const grand = subtotal + tax;

  ctx.page.drawLine({
    start: { x: PAGE.margin, y: ctx.y },
    end: { x: PAGE.width - PAGE.margin, y: ctx.y },
    thickness: 1,
  });
  ctx.y -= 18;

  const totalsX = PAGE.width - PAGE.margin - 160;
  drawText(ctx.page, "Subtotal:", totalsX, ctx.y, 10, bold);
  drawText(ctx.page, formatMoney(subtotal, data.currency), totalsX + 90, ctx.y);
  ctx.y -= 14;

  drawText(ctx.page, "Tax:", totalsX, ctx.y, 10, bold);
  drawText(ctx.page, formatMoney(tax, data.currency), totalsX + 90, ctx.y);
  ctx.y -= 14;

  drawText(ctx.page, "Total:", totalsX, ctx.y, 12, bold);
  drawText(ctx.page, formatMoney(grand, data.currency), totalsX + 90, ctx.y, 12, bold);
  ctx.y -= 24;

  if (data.notes) {
    drawText(ctx.page, "Notes:", PAGE.margin, ctx.y, 11, bold);
    ctx.y -= 14;
    drawText(ctx.page, data.notes, PAGE.margin, ctx.y);
  }

  // Add footers with page numbers
  const totalPages = pdf.getPageCount();
  pdf.getPages().forEach((p, i) => addFooter(p, i, totalPages));

  return pdf.save();
}
