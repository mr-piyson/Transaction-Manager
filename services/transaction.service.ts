import { Prisma, TransactionType, TransactionStatus } from "@prisma/client";
import { MoneyUtil } from "../utils/money";
import db from "@/lib/database";

export interface CreateTransactionDTO {
  type: TransactionType;
  amount: number;
  currency?: string;
  description: string;
  reference?: string;
  invoiceId?: string;
}

export class TransactionService {
  /**
   * Create new transaction
   */
  static async create(tenantId: string, userId: string, data: CreateTransactionDTO) {
    // Validate amount
    if (!MoneyUtil.isValid(data.amount)) {
      throw new Error("Invalid transaction amount");
    }

    if (!MoneyUtil.isPositive(data.amount)) {
      throw new Error("Transaction amount must be positive");
    }

    // If invoice is specified, verify it belongs to tenant
    if (data.invoiceId) {
      const invoice = await db.invoice.findFirst({
        where: { id: data.invoiceId, tenantId },
      });

      if (!invoice) {
        throw new Error("Invoice not found");
      }
    }

    return db.transaction.create({
      data: {
        type: data.type,
        amount: MoneyUtil.round(data.amount).toString(),
        currency: data.currency || "USD",
        description: data.description,
        reference: data.reference,
        invoiceId: data.invoiceId,
        status: "PENDING",
        tenantId,
        createdById: userId,
      },
      include: {
        invoice: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Get transaction by ID
   */
  static async getById(id: string, tenantId: string) {
    const transaction = await db.transaction.findFirst({
      where: { id, tenantId },
      include: {
        invoice: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    return transaction;
  }

  /**
   * List transactions with pagination and filters
   */
  static async list(
    tenantId: string,
    filters: {
      type?: TransactionType;
      status?: TransactionStatus;
      dateFrom?: Date;
      dateTo?: Date;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { type, status, dateFrom, dateTo, search, page = 1, limit = 20 } = filters;

    const where: Prisma.TransactionWhereInput = {
      tenantId,
      ...(type && { type }),
      ...(status && { status }),
      ...(dateFrom && { createdAt: { gte: dateFrom } }),
      ...(dateTo && { createdAt: { lte: dateTo } }),
      ...(search && {
        OR: [{ description: { contains: search, mode: "insensitive" } }, { reference: { contains: search, mode: "insensitive" } }],
      }),
    };

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.transaction.count({ where }),
    ]);

    return { transactions, total, page, limit };
  }

  /**
   * Update transaction status
   */
  static async updateStatus(id: string, tenantId: string, status: TransactionStatus) {
    const transaction = await db.transaction.findFirst({
      where: { id, tenantId },
    });

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    const updateData: any = { status };

    if (status === "COMPLETED" && !transaction.processedAt) {
      updateData.processedAt = new Date();
    }

    return db.transaction.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Delete transaction
   */
  static async delete(id: string, tenantId: string) {
    const transaction = await db.transaction.findFirst({
      where: { id, tenantId },
    });

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    if (transaction.status === "COMPLETED") {
      throw new Error("Cannot delete completed transaction");
    }

    return db.transaction.delete({
      where: { id },
    });
  }

  /**
   * Get transaction statistics
   */
  static async getStats(tenantId: string, period?: { from: Date; to: Date }) {
    const where: Prisma.TransactionWhereInput = {
      tenantId,
      status: "COMPLETED",
      ...(period && {
        processedAt: {
          gte: period.from,
          lte: period.to,
        },
      }),
    };

    const [income, expense, total] = await Promise.all([
      db.transaction.aggregate({
        where: { ...where, type: "INCOME" },
        _sum: { amount: true },
        _count: true,
      }),
      db.transaction.aggregate({
        where: { ...where, type: "EXPENSE" },
        _sum: { amount: true },
        _count: true,
      }),
      db.transaction.count({ where: { tenantId } }),
    ]);

    const totalIncome = income._sum.amount || 0;
    const totalExpense = expense._sum.amount || 0;
    const netIncome = MoneyUtil.subtract(totalIncome, totalExpense);

    return {
      total,
      income: {
        amount: totalIncome.toString(),
        count: income._count,
      },
      expense: {
        amount: totalExpense.toString(),
        count: expense._count,
      },
      netIncome: netIncome.toString(),
    };
  }

  /**
   * Get transaction summary by month
   */
  static async getMonthlySummary(tenantId: string, year: number) {
    const transactions = await db.transaction.findMany({
      where: {
        tenantId,
        status: "COMPLETED",
        processedAt: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      },
      select: {
        type: true,
        amount: true,
        processedAt: true,
      },
    });

    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      income: "0",
      expense: "0",
      net: "0",
    }));

    transactions.forEach(t => {
      if (t.processedAt) {
        const month = t.processedAt.getMonth();
        const amount = MoneyUtil.round(t.amount);

        if (t.type === "INCOME") {
          monthlyData[month].income = MoneyUtil.add(monthlyData[month].income, amount).toString();
        } else if (t.type === "EXPENSE") {
          monthlyData[month].expense = MoneyUtil.add(monthlyData[month].expense, amount).toString();
        }
      }
    });

    monthlyData.forEach(data => {
      data.net = MoneyUtil.subtract(data.income, data.expense).toString();
    });

    return monthlyData;
  }
}
