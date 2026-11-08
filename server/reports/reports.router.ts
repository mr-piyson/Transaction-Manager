import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { orgProcedure, router } from "@/lib/trpc/context";
import { countLowStockItems } from "../shared/low-stock";

// Document statuses that must never count as recognised revenue.
const NON_REVENUE_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "CANCELLED",
  "DELETED",
] as const;

const OPEN_INVOICE_STATUSES = ["SENT", "PARTIAL", "OVERDUE"] as const;

// "Placed" = sent to a supplier. Drafts/approvals are not purchases yet.
const PLACED_PO_STATUSES = [
  "ORDERED",
  "PARTIAL_RECEIVED",
  "RECEIVED",
  "INVOICED",
  "CLOSED",
] as const;

// POs that represent a payable. Closed POs are settled.
const PAYABLE_PO_STATUSES = [
  "ORDERED",
  "PARTIAL_RECEIVED",
  "RECEIVED",
  "INVOICED",
] as const;

const PNL_ACCOUNT_TYPES = ["REVENUE", "CONTRA_REVENUE", "EXPENSE"] as const;

type ReportDb = Pick<PrismaClient, "journalLine" | "ledgerAccount">;

function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setUTCHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date): Date {
  const value = new Date(date);
  value.setUTCHours(23, 59, 59, 999);
  return value;
}

/** UTC key so month buckets don't shift with the server's timezone. */
function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

interface PnlAccountTotal {
  code: string;
  name: string;
  balance: number;
}

/**
 * Single source of truth for revenue and expenses: posted journal lines.
 * Contra-revenue is naturally negative because revenue is credit − debit.
 */
async function computePnl(
  db: ReportDb,
  orgId: string,
  range: { from?: Date; to?: Date } = {},
): Promise<{
  revenue: PnlAccountTotal[];
  expenses: PnlAccountTotal[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  monthly: Record<string, { revenue: number; expenses: number }>;
}> {
  const date =
    range.from || range.to
      ? {
          ...(range.from ? { gte: startOfDay(range.from) } : {}),
          ...(range.to ? { lte: endOfDay(range.to) } : {}),
        }
      : undefined;

  const lines = await db.journalLine.findMany({
    where: {
      organizationId: orgId,
      journalEntry: {
        status: "POSTED",
        ...(date ? { date } : {}),
      },
    },
    select: {
      accountId: true,
      debit: true,
      credit: true,
      journalEntry: { select: { date: true } },
    },
  });

  const lineAccountIds = [...new Set(lines.map((line) => line.accountId))];
  const accounts = await db.ledgerAccount.findMany({
    where: {
      organizationId: orgId,
      type: { in: [...PNL_ACCOUNT_TYPES] },
      // Keep de-activated accounts that still have posted lines, so totals
      // stay in balance after a chart-of-accounts change.
      ...(lineAccountIds.length > 0
        ? { OR: [{ isActive: true }, { id: { in: lineAccountIds } }] }
        : { isActive: true }),
    },
    select: { id: true, code: true, name: true, type: true },
    orderBy: { code: "asc" },
  });

  const accountsById = new Map(
    accounts.map((account) => [account.id, account]),
  );
  const totals = new Map<string, { debit: number; credit: number }>();
  const monthly: Record<string, { revenue: number; expenses: number }> = {};

  for (const line of lines) {
    const account = accountsById.get(line.accountId);
    if (!account) continue;

    const debit = Number(line.debit);
    const credit = Number(line.credit);
    const accountTotal = totals.get(account.id) ?? { debit: 0, credit: 0 };
    accountTotal.debit += debit;
    accountTotal.credit += credit;
    totals.set(account.id, accountTotal);

    const key = monthKey(line.journalEntry.date);
    const bucket = monthly[key] ?? { revenue: 0, expenses: 0 };
    if (account.type === "EXPENSE") bucket.expenses += debit - credit;
    else bucket.revenue += credit - debit;
    monthly[key] = bucket;
  }

  const revenue: PnlAccountTotal[] = [];
  const expenses: PnlAccountTotal[] = [];

  for (const account of accounts) {
    const accountTotal = totals.get(account.id);
    if (!accountTotal) continue;

    // Expense is debit-normal; revenue is credit-normal. A contra account
    // (debit-normal) therefore comes out negative and reduces the section.
    const balance =
      account.type === "EXPENSE"
        ? accountTotal.debit - accountTotal.credit
        : accountTotal.credit - accountTotal.debit;
    const item = { code: account.code, name: account.name, balance };

    if (account.type === "EXPENSE") expenses.push(item);
    else revenue.push(item);
  }

  const totalRevenue = revenue.reduce((sum, item) => sum + item.balance, 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + item.balance, 0);

  return {
    revenue,
    expenses,
    totalRevenue,
    totalExpenses,
    netIncome: totalRevenue - totalExpenses,
    monthly,
  };
}

export const reportsRouter = router({
  summary: orgProcedure.require("report:financial").query(async ({ ctx }) => {
    const orgId = ctx.user.organizationId;

    const [
      invoiceAgg,
      outstandingAgg,
      collectedAgg,
      creditNoteAgg,
      poAgg,
      activeContractCount,
      customerCount,
      supplierCount,
      itemCount,
    ] = await ctx.db.$transaction([
      // Issued invoices only — drafts/approvals are not revenue yet.
      ctx.db.invoice.aggregate({
        where: {
          organizationId: orgId,
          type: "INVOICE",
          deletedAt: null,
          status: { notIn: [...NON_REVENUE_STATUSES] },
        },
        _sum: { costTotal: true },
        _count: true,
      }),
      // Same statuses as AR aging so the card and the aging report agree.
      ctx.db.invoice.aggregate({
        where: {
          organizationId: orgId,
          type: "INVOICE",
          deletedAt: null,
          status: { in: [...OPEN_INVOICE_STATUSES] },
        },
        _sum: { amountDue: true },
        _count: true,
      }),
      // Cash actually received, including part-paid invoices.
      ctx.db.invoice.aggregate({
        where: {
          organizationId: orgId,
          type: "INVOICE",
          deletedAt: null,
          status: { notIn: ["CANCELLED", "DELETED"] },
        },
        _sum: { amountPaid: true },
      }),
      ctx.db.invoice.aggregate({
        where: {
          organizationId: orgId,
          type: "CREDIT_NOTE",
          deletedAt: null,
          status: { notIn: [...NON_REVENUE_STATUSES] },
        },
        _sum: { costTotal: true },
      }),
      ctx.db.purchaseOrder.aggregate({
        where: {
          organizationId: orgId,
          deletedAt: null,
          status: { in: [...PLACED_PO_STATUSES] },
        },
        _sum: { total: true, amountOwed: true },
        _count: true,
      }),
      ctx.db.contract.count({
        where: {
          organizationId: orgId,
          status: "ACTIVE",
          deletedAt: null,
        },
      }),
      ctx.db.customer.count({
        where: { organizationId: orgId, isActive: true, deletedAt: null },
      }),
      ctx.db.supplier.count({
        where: {
          organizationId: orgId,
          isActive: true,
          deletedAt: null,
          isSystem: false,
        },
      }),
      ctx.db.item.count({
        where: { organizationId: orgId, isActive: true, deletedAt: null },
      }),
    ]);

    const [pnl, lowStockCount] = await Promise.all([
      computePnl(ctx.db, orgId),
      countLowStockItems(ctx.db, orgId),
    ]);

    const costOfGoods = Math.max(
      0,
      Number(invoiceAgg._sum.costTotal ?? 0) -
        Number(creditNoteAgg._sum.costTotal ?? 0),
    );

    return {
      revenue: { total: pnl.totalRevenue, count: invoiceAgg._count },
      costOfGoods,
      grossProfit: pnl.totalRevenue - costOfGoods,
      // GL expenses already include COGS; net income must not subtract COGS twice.
      expenses: pnl.totalExpenses,
      netProfit: pnl.netIncome,
      collected: { total: Number(collectedAgg._sum.amountPaid ?? 0) },
      outstanding: {
        total: Number(outstandingAgg._sum.amountDue ?? 0),
        count: outstandingAgg._count,
      },
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

  monthlyRevenue: orgProcedure
    .require("report:financial")
    .query(async ({ ctx }) => {
      const orgId = ctx.user.organizationId;
      const now = new Date();
      const twelveMonthsAgo = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1),
      );

      const [pnl, documents] = await Promise.all([
        computePnl(ctx.db, orgId, { from: twelveMonthsAgo }),
        ctx.db.invoice.findMany({
          where: {
            organizationId: orgId,
            type: { in: ["INVOICE", "CREDIT_NOTE"] },
            deletedAt: null,
            status: { notIn: [...NON_REVENUE_STATUSES] },
            date: { gte: twelveMonthsAgo },
          },
          select: { type: true, date: true, costTotal: true },
        }),
      ]);

      const monthly: Record<
        string,
        { revenue: number; cost: number; count: number }
      > = {};

      for (let i = 0; i < 12; i++) {
        const key = monthKey(
          new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + i, 1),
          ),
        );
        monthly[key] = {
          revenue: pnl.monthly[key]?.revenue ?? 0,
          cost: 0,
          count: 0,
        };
      }

      for (const document of documents) {
        const key = monthKey(new Date(document.date));
        const bucket = monthly[key];
        if (!bucket) continue;

        // Credit notes reverse both revenue (already in the GL) and COGS.
        bucket.cost +=
          (document.type === "CREDIT_NOTE" ? -1 : 1) *
          Number(document.costTotal);
        if (document.type === "INVOICE") bucket.count += 1;
      }

      return Object.entries(monthly).map(([month, data]) => ({
        month,
        revenue: data.revenue,
        cost: data.cost,
        profit: data.revenue - data.cost,
        count: data.count,
      }));
    }),

  invoiceStatusDistribution: orgProcedure
    .require("report:financial")
    .query(async ({ ctx }) => {
      const orgId = ctx.user.organizationId;

      const statuses = [
        "PAID",
        "SENT",
        "PARTIAL",
        "OVERDUE",
        "DRAFT",
        "CANCELLED",
        "DISPUTED",
      ] as const;
      const counts = await Promise.all(
        statuses.map((status) =>
          ctx.db.invoice.count({
            where: {
              organizationId: orgId,
              type: "INVOICE",
              deletedAt: null,
              status,
            },
          }),
        ),
      );

      return statuses
        .map((status, i) => ({ status, count: counts[i] }))
        .filter((s) => s.count > 0)
        .sort((a, b) => b.count - a.count);
    }),

  arAging: orgProcedure.require("report:financial").query(async ({ ctx }) => {
    const orgId = ctx.user.organizationId;
    const now = new Date();

    const overdueInvoices = await ctx.db.invoice.findMany({
      where: {
        organizationId: orgId,
        type: "INVOICE",
        deletedAt: null,
        status: { in: ["SENT", "PARTIAL", "OVERDUE"] },
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
        (now.getTime() - new Date(inv.dueDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (daysOverdue <= 0) buckets.current += amount;
      else if (daysOverdue <= 30) buckets.days1to30 += amount;
      else if (daysOverdue <= 60) buckets.days31to60 += amount;
      else if (daysOverdue <= 90) buckets.days61to90 += amount;
      else buckets.days91plus += amount;
    }

    return [
      { bucket: "Current", amount: buckets.current },
      { bucket: "1–30 Days", amount: buckets.days1to30 },
      { bucket: "31–60 Days", amount: buckets.days31to60 },
      { bucket: "61–90 Days", amount: buckets.days61to90 },
      { bucket: "90+ Days", amount: buckets.days91plus },
    ];
  }),

  revenueVsExpenses: orgProcedure
    .require("report:financial")
    .query(async ({ ctx }) => {
      const orgId = ctx.user.organizationId;
      const now = new Date();
      const twelveMonthsAgo = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1),
      );

      const pnl = await computePnl(ctx.db, orgId, { from: twelveMonthsAgo });

      const monthly: Record<string, { revenue: number; expenses: number }> = {};

      for (let i = 0; i < 12; i++) {
        const key = monthKey(
          new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + i, 1),
          ),
        );
        monthly[key] = {
          revenue: pnl.monthly[key]?.revenue ?? 0,
          expenses: pnl.monthly[key]?.expenses ?? 0,
        };
      }

      return Object.entries(monthly).map(([month, data]) => ({
        month,
        ...data,
      }));
    }),

  salesByCustomer: orgProcedure
    .require("report:sales")
    .query(async ({ ctx }) => {
      const customers = await ctx.db.customer.findMany({
        where: { organizationId: ctx.user.organizationId, deletedAt: null },
        select: {
          id: true,
          name: true,
          invoices: {
            where: {
              organizationId: ctx.user.organizationId,
              type: "INVOICE",
              deletedAt: null,
              status: { notIn: [...NON_REVENUE_STATUSES] },
            },
            select: { total: true, taxTotal: true, status: true },
          },
        },
      });

      return customers
        .map((c) => ({
          id: c.id,
          name: c.name,
          totalSales: Number(
            c.invoices.reduce(
              (sum, inv) => sum + Number(inv.total) - Number(inv.taxTotal),
              0,
            ),
          ),
          invoiceCount: c.invoices.length,
        }))
        .sort((a, b) => b.totalSales - a.totalSales);
    }),

  topItems: orgProcedure.require("report:inventory").query(async ({ ctx }) => {
    const items = await ctx.db.item.findMany({
      where: {
        organizationId: ctx.user.organizationId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        salesPrice: true,
        invoiceLines: {
          where: {
            invoice: {
              organizationId: ctx.user.organizationId,
              type: "INVOICE",
              deletedAt: null,
              status: { notIn: [...NON_REVENUE_STATUSES] },
            },
          },
          select: { quantity: true, total: true, taxAmt: true },
        },
      },
    });

    return items
      .map((item) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        salesPrice: Number(item.salesPrice),
        totalSold: Number(
          item.invoiceLines.reduce((sum, l) => sum + Number(l.quantity), 0),
        ),
        totalRevenue: Number(
          item.invoiceLines.reduce(
            (sum, l) => sum + Number(l.total) - Number(l.taxAmt),
            0,
          ),
        ),
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 20);
  }),

  // ── TRIAL BALANCE ──────────────────────────────────────────────────────────
  trialBalance: orgProcedure
    .require("report:financial")
    .input(
      z.object({
        asOf: z.coerce.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;

      // Get all posted journal lines
      const lines = await ctx.db.journalLine.findMany({
        where: {
          organizationId: orgId,
          journalEntry: {
            status: "POSTED",
            ...(input.asOf ? { date: { lte: endOfDay(input.asOf) } } : {}),
          },
        },
        select: {
          accountId: true,
          debit: true,
          credit: true,
        },
      });

      const lineAccountIds = [...new Set(lines.map((line) => line.accountId))];

      // Include de-activated accounts that still carry posted lines, otherwise
      // their debits/credits vanish and a balanced ledger looks unbalanced.
      const accounts = await ctx.db.ledgerAccount.findMany({
        where: {
          organizationId: orgId,
          ...(lineAccountIds.length > 0
            ? { OR: [{ isActive: true }, { id: { in: lineAccountIds } }] }
            : { isActive: true }),
        },
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          normalBalance: true,
        },
        orderBy: { code: "asc" },
      });

      // Aggregate by account
      const accountTotals = new Map<
        string,
        { totalDebit: number; totalCredit: number }
      >();
      for (const line of lines) {
        const existing = accountTotals.get(line.accountId) ?? {
          totalDebit: 0,
          totalCredit: 0,
        };
        existing.totalDebit += Number(line.debit);
        existing.totalCredit += Number(line.credit);
        accountTotals.set(line.accountId, existing);
      }

      const trialBalance = accounts
        .map((account) => {
          const totals = accountTotals.get(account.id) ?? {
            totalDebit: 0,
            totalCredit: 0,
          };
          // Balance: positive = normal side, negative = unusual
          const balance =
            account.normalBalance === "DEBIT"
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
      const totalCredit = trialBalance.reduce(
        (sum, a) => sum + a.totalCredit,
        0,
      );
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
    .require("report:financial")
    .input(
      z.object({
        accountId: z.string(),
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;

      const account = await ctx.db.ledgerAccount.findFirst({
        where: { id: input.accountId, organizationId: orgId },
      });
      if (!account) return null;

      const rangeFrom = input.dateFrom ? startOfDay(input.dateFrom) : undefined;
      const rangeTo = input.dateTo ? endOfDay(input.dateTo) : undefined;

      // Opening balance of the range, so the running balance is the real
      // account balance and not a range-relative subtotal.
      const openingAgg = rangeFrom
        ? await ctx.db.journalLine.aggregate({
            where: {
              organizationId: orgId,
              accountId: input.accountId,
              journalEntry: {
                status: "POSTED",
                date: { lt: rangeFrom },
              },
            },
            _sum: { debit: true, credit: true },
          })
        : null;

      const entries = await ctx.db.journalEntry.findMany({
        where: {
          organizationId: orgId,
          status: "POSTED",
          lines: { some: { accountId: input.accountId } },
          ...(rangeFrom || rangeTo
            ? {
                date: {
                  ...(rangeFrom ? { gte: rangeFrom } : {}),
                  ...(rangeTo ? { lte: rangeTo } : {}),
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
        orderBy: { date: "asc" },
      });

      const signedBalance = (debit: number, credit: number) =>
        account.normalBalance === "DEBIT" ? debit - credit : credit - debit;

      let runningBalance = openingAgg
        ? signedBalance(
            Number(openingAgg._sum.debit ?? 0),
            Number(openingAgg._sum.credit ?? 0),
          )
        : 0;

      const transactions = entries.map((entry) => {
        // One entry can post more than one line to the same account.
        const debit = entry.lines.reduce(
          (sum, line) => sum + Number(line.debit),
          0,
        );
        const credit = entry.lines.reduce(
          (sum, line) => sum + Number(line.credit),
          0,
        );

        runningBalance += signedBalance(debit, credit);

        return {
          date: entry.date,
          entryNumber: entry.entryNumber,
          description: entry.lines[0]?.description ?? entry.description,
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
    .require("report:financial")
    .input(
      z.object({
        asOf: z.coerce.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;

      const lines = await ctx.db.journalLine.findMany({
        where: {
          organizationId: orgId,
          journalEntry: {
            status: "POSTED",
            ...(input.asOf ? { date: { lte: endOfDay(input.asOf) } } : {}),
          },
        },
        select: { accountId: true, debit: true, credit: true },
      });

      const lineAccountIds = [...new Set(lines.map((line) => line.accountId))];

      const accounts = await ctx.db.ledgerAccount.findMany({
        where: {
          organizationId: orgId,
          type: { in: ["ASSET", "LIABILITY", "EQUITY", "CONTRA_ASSET"] },
          ...(lineAccountIds.length > 0
            ? { OR: [{ isActive: true }, { id: { in: lineAccountIds } }] }
            : { isActive: true }),
        },
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
        },
        orderBy: { code: "asc" },
      });

      const accountTotals = new Map<
        string,
        { totalDebit: number; totalCredit: number }
      >();
      for (const line of lines) {
        const existing = accountTotals.get(line.accountId) ?? {
          totalDebit: 0,
          totalCredit: 0,
        };
        existing.totalDebit += Number(line.debit);
        existing.totalCredit += Number(line.credit);
        accountTotals.set(line.accountId, existing);
      }

      const assets: Array<{ code: string; name: string; balance: number }> = [];
      const liabilities: Array<{
        code: string;
        name: string;
        balance: number;
      }> = [];
      const equity: Array<{ code: string; name: string; balance: number }> = [];

      for (const account of accounts) {
        const totals = accountTotals.get(account.id) ?? {
          totalDebit: 0,
          totalCredit: 0,
        };

        // Debit-normal sections (assets, contra-assets) keep debit − credit,
        // so accumulated depreciation reduces assets instead of adding to them.
        // Credit-normal sections do the opposite; Drawings (debit-normal
        // equity) therefore reduces equity.
        const balance =
          account.type === "LIABILITY" || account.type === "EQUITY"
            ? totals.totalCredit - totals.totalDebit
            : totals.totalDebit - totals.totalCredit;

        const item = {
          code: account.code,
          name: account.name,
          balance,
        };

        if (account.type === "ASSET" || account.type === "CONTRA_ASSET") {
          assets.push(item);
        } else if (account.type === "LIABILITY") {
          liabilities.push(item);
        } else if (account.type === "EQUITY") {
          equity.push(item);
        }
      }

      // The app has no year-end closing entry, so current-period profit is
      // still sitting in revenue/expense accounts. Present it as equity;
      // without it the balance sheet can never balance.
      const pnl = await computePnl(ctx.db, orgId, { to: input.asOf });
      const netIncome = pnl.netIncome;
      const earningsAccount = equity.find((item) => item.code === "3030");
      if (earningsAccount) {
        earningsAccount.balance += netIncome;
      } else if (Math.abs(netIncome) > 0.000001) {
        equity.push({
          code: "3030",
          name: "Current Year Earnings",
          balance: netIncome,
        });
      }

      const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
      const totalLiabilities = liabilities.reduce(
        (sum, l) => sum + l.balance,
        0,
      );
      const totalEquity = equity.reduce((sum, e) => sum + e.balance, 0);

      return {
        assets,
        liabilities,
        equity,
        totalAssets,
        totalLiabilities,
        totalEquity,
        isBalanced:
          Math.abs(totalAssets - totalLiabilities - totalEquity) < 0.000001,
        asOf: input.asOf ?? new Date(),
      };
    }),

  // ── PROFIT & LOSS ──────────────────────────────────────────────────────────
  profitAndLoss: orgProcedure
    .require("report:financial")
    .input(
      z.object({
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const pnl = await computePnl(ctx.db, ctx.user.organizationId, {
        from: input.dateFrom,
        to: input.dateTo,
      });

      return {
        revenue: pnl.revenue,
        expenses: pnl.expenses,
        totalRevenue: pnl.totalRevenue,
        totalExpenses: pnl.totalExpenses,
        netIncome: pnl.netIncome,
        dateFrom: input.dateFrom ?? null,
        dateTo: input.dateTo ?? null,
      };
    }),

  // ── AP AGING (simple bucket summary) ──────────────────────────────────────
  apAging: orgProcedure.require("report:financial").query(async ({ ctx }) => {
    const orgId = ctx.user.organizationId;
    const now = new Date();

    const outstandingPOs = await ctx.db.purchaseOrder.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        status: { in: [...PAYABLE_PO_STATUSES] },
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
        (now.getTime() - new Date(po.expectedDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (daysOverdue <= 0) buckets.current += amount;
      else if (daysOverdue <= 30) buckets.days1to30 += amount;
      else if (daysOverdue <= 60) buckets.days31to60 += amount;
      else if (daysOverdue <= 90) buckets.days61to90 += amount;
      else buckets.days91plus += amount;
    }

    return [
      { bucket: "Current", amount: buckets.current },
      { bucket: "1–30 Days", amount: buckets.days1to30 },
      { bucket: "31–60 Days", amount: buckets.days31to60 },
      { bucket: "61–90 Days", amount: buckets.days61to90 },
      { bucket: "90+ Days", amount: buckets.days91plus },
    ];
  }),

  // ── AP AGING (detailed with PO list) ──────────────────────────────────────
  apAgingDetailed: orgProcedure
    .require("report:financial")
    .query(async ({ ctx }) => {
      const orgId = ctx.user.organizationId;
      const now = new Date();

      const outstandingPOs = await ctx.db.purchaseOrder.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
          status: { in: [...PAYABLE_PO_STATUSES] },
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
        orderBy: { date: "desc" },
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
          ? Math.floor(
              (now.getTime() - new Date(po.expectedDate).getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : 0;

        const poData = {
          id: po.id,
          serial: po.serial,
          total: Number(po.total),
          amountOwed: amount,
          dueDate: po.expectedDate,
          date: po.date,
          currency: po.currency,
          supplierName: po.supplier?.name ?? "—",
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

      const grandTotal = Object.values(buckets).reduce(
        (sum, b) => sum + b.amount,
        0,
      );
      const totalCount = Object.values(buckets).reduce(
        (sum, b) => sum + b.count,
        0,
      );

      return {
        buckets: [
          {
            bucket: "Current",
            amount: buckets.current.amount,
            count: buckets.current.count,
            pos: buckets.current.pos,
          },
          {
            bucket: "1–30 Days",
            amount: buckets.days1to30.amount,
            count: buckets.days1to30.count,
            pos: buckets.days1to30.pos,
          },
          {
            bucket: "31–60 Days",
            amount: buckets.days31to60.amount,
            count: buckets.days31to60.count,
            pos: buckets.days31to60.pos,
          },
          {
            bucket: "61–90 Days",
            amount: buckets.days61to90.amount,
            count: buckets.days61to90.count,
            pos: buckets.days61to90.pos,
          },
          {
            bucket: "90+ Days",
            amount: buckets.days91plus.amount,
            count: buckets.days91plus.count,
            pos: buckets.days91plus.pos,
          },
        ],
        grandTotal,
        totalCount,
      };
    }),
});
