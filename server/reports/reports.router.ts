import { z } from 'zod';
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
      incomeAgg,
    ] = await ctx.db.$transaction([
      ctx.db.invoice.aggregate({
        where: {
          organizationId: orgId,
          type: 'INVOICE',
          deletedAt: null,
          status: { notIn: ['CANCELLED', 'DELETED'] },
        },
        _sum: { total: true, amountDue: true, costTotal: true },
        _count: true,
      }),
      ctx.db.invoice.count({
        where: {
          organizationId: orgId,
          type: 'INVOICE',
          deletedAt: null,
          status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] },
        },
      }),
      ctx.db.purchaseOrder.aggregate({
        where: {
          organizationId: orgId,
          deletedAt: null,
          status: { notIn: ['CANCELLED', 'CLOSED'] },
        },
        _sum: { total: true, amountOwed: true },
        _count: true,
      }),
      ctx.db.contract.count({
        where: { organizationId: orgId, deletedAt: null },
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
      ctx.db.income.aggregate({
        where: { organizationId: orgId, deletedAt: null },
        _sum: { amount: true },
      }),
    ]);

    const hasIncomeData = incomeAgg._sum.amount !== null;
    const totalRevenue = hasIncomeData
      ? Number(incomeAgg._sum.amount)
      : Number(invoiceAgg._sum.total ?? 0);
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
      purchases: {
        total: Number(poAgg._sum.total ?? 0),
        count: poAgg._count,
        owed: Number(poAgg._sum.amountOwed ?? 0),
      },
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

    const statuses = [
      'PAID',
      'SENT',
      'PARTIAL',
      'OVERDUE',
      'DRAFT',
      'CANCELLED',
      'DISPUTED',
    ] as const;
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
      const daysOverdue = Math.floor(
        (now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24),
      );
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

    const [invoices, expenses, incomes] = await ctx.db.$transaction([
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
      ctx.db.income.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
          date: { gte: twelveMonthsAgo },
        },
        select: { date: true, amount: true },
      }),
    ]);

    const useIncome = incomes.length > 0;

    const monthly: Record<string, { revenue: number; expenses: number }> = {};

    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthly[key] = { revenue: 0, expenses: 0 };
    }

    if (useIncome) {
      for (const inc of incomes) {
        const d = new Date(inc.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (monthly[key]) monthly[key].revenue += Number(inc.amount);
      }
    } else {
      for (const inv of invoices) {
        const d = new Date(inv.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (monthly[key]) monthly[key].revenue += Number(inv.total);
      }
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

  // ── TRIAL BALANCE ──────────────────────────────────────────────────────────
  trialBalance: orgProcedure
    .input(
      z.object({
        asOf: z.coerce.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'report:financial', 'all');

      const orgId = ctx.user.organizationId;

      // Get all posted journal lines
      const lines = await ctx.db.journalLine.findMany({
        where: {
          organizationId: orgId,
          journalEntry: {
            status: 'POSTED',
            ...(input.asOf ? { date: { lte: input.asOf } } : {}),
          },
        },
        select: {
          accountId: true,
          debit: true,
          credit: true,
        },
      });

      // Get all active accounts
      const accounts = await ctx.db.ledgerAccount.findMany({
        where: { organizationId: orgId, isActive: true },
        select: { id: true, code: true, name: true, type: true, normalBalance: true },
        orderBy: { code: 'asc' },
      });

      // Aggregate by account
      const accountTotals = new Map<string, { totalDebit: number; totalCredit: number }>();
      for (const line of lines) {
        const existing = accountTotals.get(line.accountId) ?? { totalDebit: 0, totalCredit: 0 };
        existing.totalDebit += Number(line.debit);
        existing.totalCredit += Number(line.credit);
        accountTotals.set(line.accountId, existing);
      }

      const trialBalance = accounts
        .map((account) => {
          const totals = accountTotals.get(account.id) ?? { totalDebit: 0, totalCredit: 0 };
          // Balance: positive = normal side, negative = unusual
          const balance =
            account.normalBalance === 'DEBIT'
              ? totals.totalDebit - totals.totalCredit
              : totals.totalCredit - totals.totalDebit;
          return {
            accountId: account.id,
            code: account.code,
            name: account.name,
            type: account.type,
            normalBalance: account.normalBalance,
            totalDebit: totals.totalDebit,
            totalCredit: totals.totalCredit,
            balance,
          };
        })
        .filter((a) => a.totalDebit > 0 || a.totalCredit > 0);

      const totalDebit = trialBalance.reduce((sum, a) => sum + a.totalDebit, 0);
      const totalCredit = trialBalance.reduce((sum, a) => sum + a.totalCredit, 0);
      const isBalanced = Math.abs(totalDebit - totalCredit) < 0.000001;

      return {
        accounts: trialBalance,
        totalDebit,
        totalCredit,
        isBalanced,
        asOf: input.asOf ?? new Date(),
      };
    }),

  // ── GENERAL LEDGER ─────────────────────────────────────────────────────────
  generalLedger: orgProcedure
    .input(
      z.object({
        accountId: z.string(),
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'report:financial', 'all');

      const orgId = ctx.user.organizationId;

      const account = await ctx.db.ledgerAccount.findFirst({
        where: { id: input.accountId, organizationId: orgId },
      });
      if (!account) return null;

      const entries = await ctx.db.journalEntry.findMany({
        where: {
          organizationId: orgId,
          status: 'POSTED',
          lines: { some: { accountId: input.accountId } },
          ...(input.dateFrom || input.dateTo
            ? {
                date: {
                  ...(input.dateFrom ? { gte: input.dateFrom } : {}),
                  ...(input.dateTo ? { lte: input.dateTo } : {}),
                },
              }
            : {}),
        },
        include: {
          lines: {
            where: { accountId: input.accountId },
            select: { debit: true, credit: true, description: true },
          },
        },
        orderBy: { date: 'asc' },
      });

      let runningBalance = 0;
      const transactions = entries.map((entry) => {
        const line = entry.lines[0];
        const debit = Number(line?.debit ?? 0);
        const credit = Number(line?.credit ?? 0);

        if (account.normalBalance === 'DEBIT') {
          runningBalance += debit - credit;
        } else {
          runningBalance += credit - debit;
        }

        return {
          date: entry.date,
          entryNumber: entry.entryNumber,
          description: line?.description ?? entry.description,
          reference: entry.reference,
          debit,
          credit,
          balance: runningBalance,
        };
      });

      return {
        account: {
          id: account.id,
          code: account.code,
          name: account.name,
          type: account.type,
          normalBalance: account.normalBalance,
        },
        transactions,
        closingBalance: runningBalance,
      };
    }),

  // ── BALANCE SHEET ──────────────────────────────────────────────────────────
  balanceSheet: orgProcedure
    .input(
      z.object({
        asOf: z.coerce.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'report:financial', 'all');

      const orgId = ctx.user.organizationId;

      const lines = await ctx.db.journalLine.findMany({
        where: {
          organizationId: orgId,
          journalEntry: {
            status: 'POSTED',
            ...(input.asOf ? { date: { lte: input.asOf } } : {}),
          },
        },
        select: { accountId: true, debit: true, credit: true },
      });

      const accounts = await ctx.db.ledgerAccount.findMany({
        where: {
          organizationId: orgId,
          isActive: true,
          type: { in: ['ASSET', 'LIABILITY', 'EQUITY', 'CONTRA_ASSET'] },
        },
        select: { id: true, code: true, name: true, type: true, normalBalance: true },
        orderBy: { code: 'asc' },
      });

      const accountTotals = new Map<string, { totalDebit: number; totalCredit: number }>();
      for (const line of lines) {
        const existing = accountTotals.get(line.accountId) ?? { totalDebit: 0, totalCredit: 0 };
        existing.totalDebit += Number(line.debit);
        existing.totalCredit += Number(line.credit);
        accountTotals.set(line.accountId, existing);
      }

      const assets: Array<{ code: string; name: string; balance: number }> = [];
      const liabilities: Array<{ code: string; name: string; balance: number }> = [];
      const equity: Array<{ code: string; name: string; balance: number }> = [];

      for (const account of accounts) {
        const totals = accountTotals.get(account.id) ?? { totalDebit: 0, totalCredit: 0 };
        const balance =
          account.normalBalance === 'DEBIT'
            ? totals.totalDebit - totals.totalCredit
            : totals.totalCredit - totals.totalDebit;

        const item = { code: account.code, name: account.name, balance: Math.abs(balance) };

        if (account.type === 'ASSET' || account.type === 'CONTRA_ASSET') {
          assets.push(item);
        } else if (account.type === 'LIABILITY') {
          liabilities.push(item);
        } else if (account.type === 'EQUITY') {
          equity.push(item);
        }
      }

      const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
      const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
      const totalEquity = equity.reduce((sum, e) => sum + e.balance, 0);

      return {
        assets,
        liabilities,
        equity,
        totalAssets,
        totalLiabilities,
        totalEquity,
        isBalanced: Math.abs(totalAssets - totalLiabilities - totalEquity) < 0.000001,
        asOf: input.asOf ?? new Date(),
      };
    }),

  // ── PROFIT & LOSS ──────────────────────────────────────────────────────────
  profitAndLoss: orgProcedure
    .input(
      z.object({
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'report:financial', 'all');

      const orgId = ctx.user.organizationId;

      const lines = await ctx.db.journalLine.findMany({
        where: {
          organizationId: orgId,
          journalEntry: {
            status: 'POSTED',
            ...(input.dateFrom || input.dateTo
              ? {
                  date: {
                    ...(input.dateFrom ? { gte: input.dateFrom } : {}),
                    ...(input.dateTo ? { lte: input.dateTo } : {}),
                  },
                }
              : {}),
          },
        },
        select: { accountId: true, debit: true, credit: true },
      });

      const accounts = await ctx.db.ledgerAccount.findMany({
        where: {
          organizationId: orgId,
          isActive: true,
          type: { in: ['REVENUE', 'EXPENSE', 'CONTRA_REVENUE'] },
        },
        select: { id: true, code: true, name: true, type: true, normalBalance: true },
        orderBy: { code: 'asc' },
      });

      const accountTotals = new Map<string, { totalDebit: number; totalCredit: number }>();
      for (const line of lines) {
        const existing = accountTotals.get(line.accountId) ?? { totalDebit: 0, totalCredit: 0 };
        existing.totalDebit += Number(line.debit);
        existing.totalCredit += Number(line.credit);
        accountTotals.set(line.accountId, existing);
      }

      const revenue: Array<{ code: string; name: string; balance: number }> = [];
      const expenses: Array<{ code: string; name: string; balance: number }> = [];

      for (const account of accounts) {
        const totals = accountTotals.get(account.id) ?? { totalDebit: 0, totalCredit: 0 };
        const balance =
          account.normalBalance === 'DEBIT'
            ? totals.totalDebit - totals.totalCredit
            : totals.totalCredit - totals.totalDebit;

        const item = { code: account.code, name: account.name, balance: Math.abs(balance) };

        if (account.type === 'REVENUE' || account.type === 'CONTRA_REVENUE') {
          revenue.push(item);
        } else if (account.type === 'EXPENSE') {
          expenses.push(item);
        }
      }

      const totalRevenue = revenue.reduce((sum, r) => sum + r.balance, 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + e.balance, 0);
      const netIncome = totalRevenue - totalExpenses;

      return {
        revenue,
        expenses,
        totalRevenue,
        totalExpenses,
        netIncome,
        dateFrom: input.dateFrom ?? null,
        dateTo: input.dateTo ?? null,
      };
    }),

  // ── AP AGING (simple bucket summary) ──────────────────────────────────────
  apAging: orgProcedure.query(async ({ ctx }) => {
    assertCan(ctx.ability, 'report:financial', 'all');

    const orgId = ctx.user.organizationId;
    const now = new Date();

    const outstandingPOs = await ctx.db.purchaseOrder.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        status: { notIn: ['CANCELLED', 'CLOSED'] },
        amountOwed: { gt: 0 },
      },
      select: { expectedDate: true, amountOwed: true, total: true },
    });

    const buckets = {
      current: 0,
      days1to30: 0,
      days31to60: 0,
      days61to90: 0,
      days91plus: 0,
    };

    for (const po of outstandingPOs) {
      const amount = Number(po.amountOwed);
      if (!po.expectedDate) {
        buckets.current += amount;
        continue;
      }
      const daysOverdue = Math.floor(
        (now.getTime() - new Date(po.expectedDate).getTime()) / (1000 * 60 * 60 * 24),
      );
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

  // ── AP AGING (detailed with PO list) ──────────────────────────────────────
  apAgingDetailed: orgProcedure.query(async ({ ctx }) => {
    assertCan(ctx.ability, 'report:financial', 'all');

    const orgId = ctx.user.organizationId;
    const now = new Date();

    const outstandingPOs = await ctx.db.purchaseOrder.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        status: { notIn: ['CANCELLED', 'CLOSED'] },
        amountOwed: { gt: 0 },
      },
      select: {
        id: true,
        serial: true,
        total: true,
        amountOwed: true,
        expectedDate: true,
        date: true,
        currency: true,
        supplier: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    });

    const buckets = {
      current: { amount: 0, count: 0, pos: [] as any[] },
      days1to30: { amount: 0, count: 0, pos: [] as any[] },
      days31to60: { amount: 0, count: 0, pos: [] as any[] },
      days61to90: { amount: 0, count: 0, pos: [] as any[] },
      days91plus: { amount: 0, count: 0, pos: [] as any[] },
    };

    for (const po of outstandingPOs) {
      const amount = Number(po.amountOwed);
      const daysOverdue = po.expectedDate
        ? Math.floor((now.getTime() - new Date(po.expectedDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      const poData = {
        id: po.id,
        serial: po.serial,
        total: Number(po.total),
        amountOwed: amount,
        dueDate: po.expectedDate,
        date: po.date,
        currency: po.currency,
        supplierName: po.supplier?.name ?? '—',
        daysOverdue: Math.max(0, daysOverdue),
      };

      if (daysOverdue <= 0) {
        buckets.current.amount += amount;
        buckets.current.count += 1;
        buckets.current.pos.push(poData);
      } else if (daysOverdue <= 30) {
        buckets.days1to30.amount += amount;
        buckets.days1to30.count += 1;
        buckets.days1to30.pos.push(poData);
      } else if (daysOverdue <= 60) {
        buckets.days31to60.amount += amount;
        buckets.days31to60.count += 1;
        buckets.days31to60.pos.push(poData);
      } else if (daysOverdue <= 90) {
        buckets.days61to90.amount += amount;
        buckets.days61to90.count += 1;
        buckets.days61to90.pos.push(poData);
      } else {
        buckets.days91plus.amount += amount;
        buckets.days91plus.count += 1;
        buckets.days91plus.pos.push(poData);
      }
    }

    const grandTotal = Object.values(buckets).reduce((sum, b) => sum + b.amount, 0);
    const totalCount = Object.values(buckets).reduce((sum, b) => sum + b.count, 0);

    return {
      buckets: [
        { bucket: 'Current', amount: buckets.current.amount, count: buckets.current.count, pos: buckets.current.pos },
        { bucket: '1–30 Days', amount: buckets.days1to30.amount, count: buckets.days1to30.count, pos: buckets.days1to30.pos },
        { bucket: '31–60 Days', amount: buckets.days31to60.amount, count: buckets.days31to60.count, pos: buckets.days31to60.pos },
        { bucket: '61–90 Days', amount: buckets.days61to90.amount, count: buckets.days61to90.count, pos: buckets.days61to90.pos },
        { bucket: '90+ Days', amount: buckets.days91plus.amount, count: buckets.days91plus.count, pos: buckets.days91plus.pos },
      ],
      grandTotal,
      totalCount,
    };
  }),
});
