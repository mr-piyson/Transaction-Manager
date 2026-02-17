import db from "@/lib/database";
import { Prisma, InvoiceStatus } from "@prisma/client";
import { MoneyUtil } from "../utils/money";

export interface CreateInvoiceDTO {
  customerId: string;
  issueDate: Date;
  dueDate: Date;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
  }[];
  taxRate?: number;
  discount?: number;
  notes?: string;
}

export class InvoiceService {
  /**
   * Generate unique invoice number
   */
  private static async generateInvoiceNumber(tenantId: string): Promise<string> {
    const prefix = "INV";
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");

    // Count invoices this month
    const count = await db.invoice.count({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(year, new Date().getMonth(), 1),
        },
      },
    });

    const sequence = String(count + 1).padStart(4, "0");
    return `${prefix}-${year}${month}-${sequence}`;
  }

  /**
   * Create new invoice
   */
  static async create(tenantId: string, userId: string, data: CreateInvoiceDTO) {
    // Verify customer belongs to tenant
    const customer = await db.customer.findFirst({
      where: { id: data.customerId, tenantId },
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    // Calculate totals
    const subtotal = data.items.reduce((sum, item) => {
      return MoneyUtil.add(sum, MoneyUtil.multiply(item.quantity, item.unitPrice));
    }, MoneyUtil.round(0));

    const taxRate = data.taxRate || 0;
    const discount = data.discount || 0;

    const totals = MoneyUtil.calculateInvoiceTotal(subtotal, taxRate, discount);

    const invoiceNumber = await this.generateInvoiceNumber(tenantId);

    return db.invoice.create({
      data: {
        invoiceNumber,
        customerId: data.customerId,
        tenantId,
        createdById: userId,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        subtotal: totals.subtotal.toString(),
        tax: totals.tax.toString(),
        discount: totals.discount.toString(),
        total: totals.total.toString(),
        notes: data.notes,
        items: {
          create: data.items.map(item => ({
            description: item.description,
            quantity: item.quantity.toString(),
            unitPrice: item.unitPrice.toString(),
            total: MoneyUtil.multiply(item.quantity, item.unitPrice).toString(),
          })),
        },
      },
      include: {
        items: true,
        customer: true,
      },
    });
  }

  /**
   * Get invoice by ID
   */
  static async getById(id: string, tenantId: string) {
    const invoice = await db.invoice.findFirst({
      where: { id, tenantId },
      include: {
        items: true,
        customer: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        transaction: true,
      },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    return invoice;
  }

  /**
   * List invoices with pagination and filters
   */
  static async list(
    tenantId: string,
    filters: {
      customerId?: string;
      status?: InvoiceStatus;
      search?: string;
      dateFrom?: Date;
      dateTo?: Date;
      page?: number;
      limit?: number;
    },
  ) {
    const { customerId, status, search, dateFrom, dateTo, page = 1, limit = 20 } = filters;

    const where: Prisma.InvoiceWhereInput = {
      tenantId,
      ...(customerId && { customerId }),
      ...(status && { status }),
      ...(search && { invoiceNumber: { contains: search, mode: "insensitive" } }),
      ...(dateFrom && { issueDate: { gte: dateFrom } }),
      ...(dateTo && { issueDate: { lte: dateTo } }),
    };

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.invoice.count({ where }),
    ]);

    return { invoices, total, page, limit };
  }

  /**
   * Update invoice status
   */
  static async updateStatus(id: string, tenantId: string, status: InvoiceStatus) {
    const invoice = await db.invoice.findFirst({
      where: { id, tenantId },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    return db.invoice.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Mark invoice as paid
   */
  static async markAsPaid(id: string, tenantId: string, userId: string) {
    const invoice = await db.invoice.findFirst({
      where: { id, tenantId },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (invoice.status === "PAID") {
      throw new Error("Invoice is already paid");
    }

    return db.$transaction(async tx => {
      // Update invoice status
      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: { status: "PAID" },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          type: "INCOME",
          status: "COMPLETED",
          amount: invoice.total.toString(),
          currency: "USD",
          description: `Payment for invoice ${invoice.invoiceNumber}`,
          reference: invoice.invoiceNumber,
          invoiceId: invoice.id,
          tenantId,
          createdById: userId,
          processedAt: new Date(),
        },
      });

      return updatedInvoice;
    });
  }

  /**
   * Delete invoice
   */
  static async delete(id: string, tenantId: string) {
    const invoice = await db.invoice.findFirst({
      where: { id, tenantId },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (invoice.status === "PAID") {
      throw new Error("Cannot delete paid invoice");
    }

    return db.invoice.delete({
      where: { id },
    });
  }

  /**
   * Get invoice statistics
   */
  static async getStats(tenantId: string) {
    const [total, draft, sent, paid, overdue] = await Promise.all([
      db.invoice.count({ where: { tenantId } }),
      db.invoice.count({ where: { tenantId, status: "DRAFT" } }),
      db.invoice.count({ where: { tenantId, status: "SENT" } }),
      db.invoice.count({ where: { tenantId, status: "PAID" } }),
      db.invoice.count({ where: { tenantId, status: "OVERDUE" } }),
    ]);

    // Calculate total revenue
    const paidInvoices = await db.invoice.aggregate({
      where: { tenantId, status: "PAID" },
      _sum: { total: true },
    });

    const totalRevenue = paidInvoices._sum.total || 0;

    return {
      total,
      draft,
      sent,
      paid,
      overdue,
      totalRevenue: totalRevenue.toString(),
    };
  }
}
