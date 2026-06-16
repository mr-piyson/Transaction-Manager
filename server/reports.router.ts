import { assertCan, orgProcedure, router } from '@/lib/trpc/context';

export const reportsRouter = router({
  summary: orgProcedure.query(async ({ ctx }) => {
    assertCan(ctx.ability, 'report:financial', 'all');

    const orgId = ctx.user.organizationId;

    const [
      invoiceAgg,
      openInvoiceCount,
      poAgg,
      activeContractCount,
      customerCount,
      supplierCount,
      itemCount,
      lowStockCount,
    ] = await ctx.db.$transaction([
      ctx.db.invoice.aggregate({
        where: { organizationId: orgId, type: 'INVOICE', deletedAt: null, status: { notIn: ['CANCELLED', 'DELETED'] } },
        _sum: { total: true, amountDue: true },
        _count: true,
      }),
      ctx.db.invoice.count({
        where: { organizationId: orgId, type: 'INVOICE', deletedAt: null, status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] } },
      }),
      ctx.db.purchaseOrder.aggregate({
        where: { organizationId: orgId, deletedAt: null, status: { notIn: ['CANCELLED', 'CLOSED'] } },
        _sum: { total: true, amountOwed: true },
        _count: true,
      }),
      ctx.db.contract.count({
        where: { organizationId: orgId, isActive: true, deletedAt: null },
      }),
      ctx.db.customer.count({
        where: { organizationId: orgId, isActive: true, deletedAt: null },
      }),
      ctx.db.supplier.count({
        where: { organizationId: orgId, isActive: true, deletedAt: null, isSystem: false },
      }),
      ctx.db.item.count({
        where: { organizationId: orgId, isActive: true, deletedAt: null },
      }),
      ctx.db.stock.count({
        where: { organizationId: orgId, quantity: { lte: 0 } },
      }),
    ]);

    return {
      revenue: { total: Number(invoiceAgg._sum.total ?? 0), count: invoiceAgg._count },
      outstanding: { total: Number(invoiceAgg._sum.amountDue ?? 0), count: openInvoiceCount },
      purchases: { total: Number(poAgg._sum.total ?? 0), count: poAgg._count, owed: Number(poAgg._sum.amountOwed ?? 0) },
      contracts: { activeCount: activeContractCount },
      customers: { activeCount: customerCount },
      suppliers: { activeCount: supplierCount },
      inventory: { itemCount, lowStockCount },
    };
  }),

  salesByCustomer: orgProcedure.query(async ({ ctx }) => {
    assertCan(ctx.ability, 'report:sales', 'all');

    const customers = await ctx.db.customer.findMany({
      where: { organizationId: ctx.user.organizationId, deletedAt: null },
      select: {
        id: true,
        name: true,
        invoices: {
          where: { status: { notIn: ['CANCELLED', 'DELETED', 'DRAFT'] } },
          select: { total: true, status: true },
        },
      },
    });

    return customers
      .map((c) => ({
        id: c.id,
        name: c.name,
        totalSales: Number(c.invoices.reduce((sum, inv) => sum + Number(inv.total), 0)),
        invoiceCount: c.invoices.length,
      }))
      .sort((a, b) => b.totalSales - a.totalSales);
  }),

  topItems: orgProcedure.query(async ({ ctx }) => {
    assertCan(ctx.ability, 'report:inventory', 'all');

    const items = await ctx.db.item.findMany({
      where: { organizationId: ctx.user.organizationId, deletedAt: null, isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        salesPrice: true,
        invoiceLines: {
          where: { invoice: { status: { notIn: ['CANCELLED', 'DELETED', 'DRAFT'] } } },
          select: { quantity: true, total: true },
        },
      },
    });

    return items
      .map((item) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        salesPrice: Number(item.salesPrice),
        totalSold: Number(item.invoiceLines.reduce((sum, l) => sum + Number(l.quantity), 0)),
        totalRevenue: Number(item.invoiceLines.reduce((sum, l) => sum + Number(l.total), 0)),
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 20);
  }),
});
