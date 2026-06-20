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
      paidInvoicesAgg,
      expenseAgg,
    ] = await ctx.db.$transaction([
      ctx.db.invoice.aggregate({
        where: { organizationId: orgId, type: 'INVOICE', deletedAt: null, status: { notIn: ['CANCELLED', 'DELETED'] } },
        _sum: { total: true, amountDue: true, costTotal: true },
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
      ctx.db.invoice.aggregate({
        where: { organizationId: orgId, type: 'INVOICE', deletedAt: null, status: 'PAID' },
        _sum: { total: true },
      }),
      ctx.db.expense.aggregate({
        where: { organizationId: orgId, deletedAt: null },
        _sum: { amount: true },
      }),
    ]);

    const totalRevenue = Number(invoiceAgg._sum.total ?? 0);
    const totalCost = Number(invoiceAgg._sum.costTotal ?? 0);
    const totalExpenses = Number(expenseAgg._sum.amount ?? 0);

    return {
      revenue: { total: totalRevenue, count: invoiceAgg._count },
      costOfGoods: totalCost,
      grossProfit: totalRevenue - totalCost,
      expenses: totalExpenses,
      netProfit: totalRevenue - totalCost - totalExpenses,
      collected: { total: Number(paidInvoicesAgg._sum.total ?? 0) },
      outstanding: { total: Number(invoiceAgg._sum.amountDue ?? 0), count: openInvoiceCount },
      purchases: { total: Number(poAgg._sum.total ?? 0), count: poAgg._count, owed: Number(poAgg._sum.amountOwed ?? 0) },
      contracts: { activeCount: activeContractCount },
      customers: { activeCount: customerCount },
      suppliers: { activeCount: supplierCount },
      inventory: { itemCount, lowStockCount },
    };
  }),

  monthlyRevenue: orgProcedure.query(async ({ ctx }) => {
    assertCan(ctx.ability, 'report:financial', 'all');

    const orgId = ctx.user.organizationId;
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const invoices = await ctx.db.invoice.findMany({
      where: {
        organizationId: orgId,
        type: 'INVOICE',
        deletedAt: null,
        status: { notIn: ['CANCELLED', 'DELETED', 'DRAFT'] },
        date: { gte: twelveMonthsAgo },
      },
      select: { date: true, total: true, costTotal: true },
    });

    const monthly: Record<string, { revenue: number; cost: number; count: number }> = {};

    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthly[key] = { revenue: 0, cost: 0, count: 0 };
    }

    for (const inv of invoices) {
      const d = new Date(inv.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthly[key]) {
        monthly[key].revenue += Number(inv.total);
        monthly[key].cost += Number(inv.costTotal);
        monthly[key].count += 1;
      }
    }

    return Object.entries(monthly).map(([month, data]) => ({
      month,
      revenue: data.revenue,
      cost: data.cost,
      profit: data.revenue - data.cost,
      count: data.count,
    }));
  }),

  invoiceStatusDistribution: orgProcedure.query(async ({ ctx }) => {
    assertCan(ctx.ability, 'report:financial', 'all');

    const orgId = ctx.user.organizationId;

    const statuses = ['PAID', 'SENT', 'PARTIAL', 'OVERDUE', 'DRAFT', 'CANCELLED', 'DISPUTED'] as const;
    const counts = await Promise.all(
      statuses.map((status) =>
        ctx.db.invoice.count({
          where: { organizationId: orgId, type: 'INVOICE', deletedAt: null, status },
        }),
      ),
    );

    return statuses
      .map((status, i) => ({ status, count: counts[i] }))
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count);
  }),

  arAging: orgProcedure.query(async ({ ctx }) => {
    assertCan(ctx.ability, 'report:financial', 'all');

    const orgId = ctx.user.organizationId;
    const now = new Date();

    const overdueInvoices = await ctx.db.invoice.findMany({
      where: {
        organizationId: orgId,
        type: 'INVOICE',
        deletedAt: null,
        status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] },
        amountDue: { gt: 0 },
      },
      select: { dueDate: true, amountDue: true, total: true },
    });

    const buckets = {
      current: 0,
      days1to30: 0,
      days31to60: 0,
      days61to90: 0,
      days91plus: 0,
    };

    for (const inv of overdueInvoices) {
      const amount = Number(inv.amountDue);
      if (!inv.dueDate) {
        buckets.current += amount;
        continue;
      }
      const daysOverdue = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysOverdue <= 0) buckets.current += amount;
      else if (daysOverdue <= 30) buckets.days1to30 += amount;
      else if (daysOverdue <= 60) buckets.days31to60 += amount;
      else if (daysOverdue <= 90) buckets.days61to90 += amount;
      else buckets.days91plus += amount;
    }

    return [
      { bucket: 'Current', amount: buckets.current },
      { bucket: '1–30 Days', amount: buckets.days1to30 },
      { bucket: '31–60 Days', amount: buckets.days31to60 },
      { bucket: '61–90 Days', amount: buckets.days61to90 },
      { bucket: '90+ Days', amount: buckets.days91plus },
    ];
  }),

  revenueVsExpenses: orgProcedure.query(async ({ ctx }) => {
    assertCan(ctx.ability, 'report:financial', 'all');

    const orgId = ctx.user.organizationId;
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const [invoices, expenses] = await ctx.db.$transaction([
      ctx.db.invoice.findMany({
        where: {
          organizationId: orgId,
          type: 'INVOICE',
          deletedAt: null,
          status: { notIn: ['CANCELLED', 'DELETED', 'DRAFT'] },
          date: { gte: twelveMonthsAgo },
        },
        select: { date: true, total: true },
      }),
      ctx.db.expense.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
          date: { gte: twelveMonthsAgo },
        },
        select: { date: true, amount: true },
      }),
    ]);

    const monthly: Record<string, { revenue: number; expenses: number }> = {};

    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthly[key] = { revenue: 0, expenses: 0 };
    }

    for (const inv of invoices) {
      const d = new Date(inv.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthly[key]) monthly[key].revenue += Number(inv.total);
    }

    for (const exp of expenses) {
      const d = new Date(exp.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthly[key]) monthly[key].expenses += Number(exp.amount);
    }

    return Object.entries(monthly).map(([month, data]) => ({
      month,
      ...data,
    }));
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
