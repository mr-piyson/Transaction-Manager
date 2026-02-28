import db from "@/lib/database";

type InvoiceItemInput = {
  code?: string;
  description: string;
  purchasePrice: number;
  salesPrice: number;
  inventoryItemId?: number;
  total: number;
  subItems?: Omit<InvoiceItemInput, "subItems">[];
};

export const invoiceAction = {
  async getAll(query: {
    page?: number;
    limit?: number;
    customerId?: number;
    from?: Date;
    to?: Date;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.customerId) where.customerId = query.customerId;
    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = query.from;
      if (query.to) where.date.lte = query.to;
    }

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: true,
          invoiceItems: {
            include: {
              invoiceItems: {
                where: { parentId: null },
                include: { subItems: true },
              },
            },
          },
        },
        orderBy: { date: "desc" },
      }),
      db.invoice.count({ where }),
    ]);

    return { invoices, total, page, limit };
  },

  async getById(id: number) {
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        invoiceItems: {
          where: { parentId: null },
          include: {
            subItems: {
              include: {
                itemRef: true,
                subItems: true,
              },
            },
            itemRef: true,
          },
        },
      },
    });
    if (!invoice) throw new Error("Invoice not found");
    return invoice;
  },

  async create(data: {
    customerId?: number;
    description?: string;
    date?: Date;
    items: InvoiceItemInput[];
  }) {
    const invoice = await db.invoice.create({
      data: {
        customerId: data.customerId,
        description: data.description,
        date: data.date ?? new Date(),
      },
    });

    await this._createInvoiceItems(data.items, invoice.id, null);

    return this.getById(invoice.id);
  },

  async _createInvoiceItems(
    items: InvoiceItemInput[],
    invoiceId: number,
    parentId: number | null,
  ) {
    for (const item of items) {
      const { subItems, ...rest } = item;

      // Also connect the InvoiceItem to the Invoice via the many-to-many join
      const created = await db.invoiceItem.create({
        data: {
          ...rest,
          parentId,
          ...(parentId === null
            ? {
                itemRef: rest.inventoryItemId
                  ? { connect: { id: rest.inventoryItemId } }
                  : undefined,
              }
            : {}),
        },
      });

      // Connect to invoice through InventoryItem if top-level (workaround for schema)
      // Note: Invoice.invoiceItems is connected via InventoryItem due to schema design.
      // InvoiceItem model is separate; wire them via invoice using prisma relation updates.
      if (parentId === null) {
        await db.invoice.update({
          where: { id: invoiceId },
          data: {
            invoiceItems: rest.inventoryItemId
              ? { connect: { id: rest.inventoryItemId } }
              : undefined,
          },
        });
      }

      if (subItems && subItems.length > 0) {
        await this._createInvoiceItems(subItems, invoiceId, created.id);
      }
    }
  },

  async update(
    id: number,
    data: {
      customerId?: number;
      description?: string;
      date?: Date;
    },
  ) {
    return db.invoice.update({
      where: { id },
      data,
      include: { customer: true },
    });
  },

  async delete(id: number) {
    // Cascade deletes invoice items via parentId Cascade
    await db.invoice.delete({ where: { id } });
    return { success: true };
  },

  async addItem(invoiceId: number, item: InvoiceItemInput) {
    await this._createInvoiceItems([item], invoiceId, null);
    return this.getById(invoiceId);
  },

  async removeItem(invoiceItemId: number) {
    await db.invoiceItem.delete({ where: { id: invoiceItemId } });
    return { success: true };
  },

  async getSummary(query: { from?: Date; to?: Date }) {
    const where: any = {};
    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = query.from;
      if (query.to) where.date.lte = query.to;
    }

    const invoices = await db.invoice.findMany({
      where,
      include: {
        invoiceItems: { include: { invoiceItems: true } },
      },
    });

    // Compute totals from InvoiceItems
    const allItemIds = invoices.flatMap((inv) =>
      inv.invoiceItems.map((i) => i.id),
    );

    const items = await db.invoiceItem.findMany({
      where: {
        id: { in: allItemIds },
        parentId: null,
      },
    });

    const totalRevenue = items.reduce((s, i) => s + i.salesPrice, 0);
    const totalCost = items.reduce((s, i) => s + i.purchasePrice, 0);

    return {
      invoiceCount: invoices.length,
      totalRevenue,
      totalCost,
      grossProfit: totalRevenue - totalCost,
    };
  },
};
