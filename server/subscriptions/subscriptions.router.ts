import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { ForbiddenError, NotFoundError } from "@/lib/error";
import { assertCan, orgProcedure, router } from "@/lib/trpc/context";
import { cuidSchema, paymentMethodSchema } from "@/lib/validations";
import { postExpense } from "../journals/journal-posting.service";
import { NOTIFICATION_TYPES } from "../notifications/notifications.shared";
import { writeAuditLog } from "../shared/audit.service";
import {
  addBillingCycle,
  SUBSCRIPTION_BILLING_CYCLES,
  SUBSCRIPTION_STATUSES,
} from "./subscriptions.shared";

const billingCycleSchema = z.enum(SUBSCRIPTION_BILLING_CYCLES);
const statusSchema = z.enum(SUBSCRIPTION_STATUSES);

const baseSubscriptionFields = {
  name: z.string().min(1).max(200),
  vendor: z.string().max(200).optional(),
  url: z.string().url().max(500).optional(),
  description: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
  billingCycle: billingCycleSchema.default("ANNUAL"),
  customCycleDays: z.number().int().positive().optional(),
  amount: z.number().positive(),
  currency: cuidSchema.length(3).optional(),
  method: paymentMethodSchema.default("CARD"),
  autoRenew: z.boolean().default(true),
  startDate: z.coerce.date(),
  nextRenewalDate: z.coerce.date(),
  alertDaysBefore: z.number().int().min(0).max(365).default(7),
  categoryId: z.string().optional(),
  departmentId: z.string().optional(),
};

const createSchema = z
  .object(baseSubscriptionFields)
  .superRefine((data, ctx) => {
    if (data.billingCycle === "CUSTOM" && !data.customCycleDays) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customCycleDays"],
        message: "customCycleDays is required when billingCycle is CUSTOM",
      });
    }
  });

async function assertCategoryExists(
  db: Prisma.TransactionClient,
  organizationId: string,
  categoryId: string,
) {
  const category = await db.expenseCategory.findFirst({
    where: {
      id: categoryId,
      organizationId,
      isActive: true,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!category) throw new NotFoundError("ExpenseCategory", categoryId);
}

async function getOrganizationCurrency(
  db: Prisma.TransactionClient,
  organizationId: string,
): Promise<string> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { currency: true },
  });
  return org?.currency ?? "BHD";
}

export const subscriptionsRouter = router({
  list: orgProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: statusSchema.optional(),
        categoryId: z.string().optional(),
        departmentId: z.string().optional(),
        // Convenience filter for a "renewals due soon" dashboard widget.
        dueWithinDays: z.number().int().positive().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertCan(ctx.ability, "subscription:read", "Subscription");

      const { search, status, categoryId, departmentId, dueWithinDays } = input;
      const orgId = ctx.user.organizationId;

      const where: Record<string, unknown> = {
        organizationId: orgId,
        deletedAt: null,
        ...(status ? { status } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(departmentId ? { departmentId } : {}),
        ...(dueWithinDays
          ? {
              nextRenewalDate: {
                lte: new Date(Date.now() + dueWithinDays * 86_400_000),
              },
            }
          : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                {
                  vendor: { contains: search, mode: "insensitive" as const },
                },
              ],
            }
          : {}),
      };

      return ctx.db.subscription.findMany({
        where,
        orderBy: { nextRenewalDate: "asc" },
        include: {
          category: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });
    }),

  byId: orgProcedure
    .input(z.object({ id: cuidSchema }))
    .query(async ({ ctx, input }) => {
      assertCan(ctx.ability, "subscription:read", "Subscription");

      const orgId = ctx.user.organizationId;

      const subscription = await ctx.db.subscription.findFirst({
        where: { id: input.id, organizationId: orgId, deletedAt: null },
        include: {
          category: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          updatedBy: { select: { id: true, name: true } },
          renewals: {
            orderBy: { date: "desc" },
            select: {
              id: true,
              date: true,
              amount: true,
              method: true,
              journalEntryId: true,
              createdBy: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (!subscription) throw new NotFoundError("Subscription", input.id);
      return subscription;
    }),

  departments: {
    list: orgProcedure.query(async ({ ctx }) => {
      assertCan(ctx.ability, "subscription:read", "Subscription");

      return ctx.db.department.findMany({
        where: {
          organizationId: ctx.user.organizationId,
          isActive: true,
          deletedAt: null,
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
    }),
  },

  create: orgProcedure.input(createSchema).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, "subscription:create", "Subscription");

    const orgId = ctx.user.organizationId;

    if (input.categoryId) {
      await assertCategoryExists(ctx.db, orgId, input.categoryId);
    }

    return ctx.db.$transaction(async (tx) => {
      const subscription = await tx.subscription.create({
        data: {
          name: input.name,
          vendor: input.vendor,
          url: input.url,
          description: input.description,
          notes: input.notes,
          billingCycle: input.billingCycle,
          customCycleDays: input.customCycleDays,
          amount: input.amount,
          currency:
            input.currency ?? (await getOrganizationCurrency(tx, orgId)),
          method: input.method,
          autoRenew: input.autoRenew,
          startDate: input.startDate,
          nextRenewalDate: input.nextRenewalDate,
          alertDaysBefore: input.alertDaysBefore,
          categoryId: input.categoryId,
          departmentId: input.departmentId,
          organizationId: orgId,
          createdById: ctx.user.id,
        },
      });

      await writeAuditLog(
        {
          entityType: "Subscription",
          entityId: subscription.id,
          action: "CREATE",
          diff: {
            name: { before: null, after: input.name },
            amount: { before: null, after: input.amount },
            nextRenewalDate: {
              before: null,
              after: input.nextRenewalDate,
            },
          },
          organizationId: orgId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
        },
        tx,
      );

      return subscription;
    });
  }),

  update: orgProcedure
    .input(
      z
        .object({
          id: cuidSchema,
          name: z.string().min(1).max(200).optional(),
          vendor: z.string().max(200).nullable().optional(),
          url: z.string().url().max(500).nullable().optional(),
          description: z.string().max(2000).nullable().optional(),
          notes: z.string().max(2000).nullable().optional(),
          billingCycle: billingCycleSchema.optional(),
          customCycleDays: z.number().int().positive().nullable().optional(),
          amount: z.number().positive().optional(),
          currency: cuidSchema.length(3).optional(),
          method: paymentMethodSchema.optional(),
          autoRenew: z.boolean().optional(),
          status: statusSchema.optional(),
          nextRenewalDate: z.coerce.date().optional(),
          alertDaysBefore: z.number().int().min(0).max(365).optional(),
          categoryId: z.string().nullable().optional(),
          departmentId: z.string().nullable().optional(),
        })
        .superRefine((data, ctx) => {
          if (data.billingCycle === "CUSTOM" && data.customCycleDays === null) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["customCycleDays"],
              message:
                "customCycleDays is required when billingCycle is CUSTOM",
            });
          }
        }),
    )
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, "subscription:update", "Subscription");

      const { id, ...data } = input;
      const orgId = ctx.user.organizationId;

      const existing = await ctx.db.subscription.findFirst({
        where: { id, organizationId: orgId, deletedAt: null },
        select: { id: true, name: true, amount: true, nextRenewalDate: true },
      });
      if (!existing) throw new NotFoundError("Subscription", id);

      if (data.categoryId) {
        await assertCategoryExists(ctx.db, orgId, data.categoryId);
      }

      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.subscription.update({
          where: { id },
          data: { ...data, updatedById: ctx.user.id },
        });

        await writeAuditLog(
          {
            entityType: "Subscription",
            entityId: id,
            action: "UPDATE",
            diff: {
              name: {
                before: existing.name,
                after: data.name ?? existing.name,
              },
              amount: {
                before: Number(existing.amount),
                after: data.amount ?? Number(existing.amount),
              },
              nextRenewalDate: {
                before: existing.nextRenewalDate,
                after: data.nextRenewalDate ?? existing.nextRenewalDate,
              },
            },
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return updated;
      });
    }),

  delete: orgProcedure
    .input(z.object({ id: cuidSchema }))
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, "subscription:delete", "Subscription");

      const orgId = ctx.user.organizationId;

      const existing = await ctx.db.subscription.findFirst({
        where: { id: input.id, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      if (!existing) throw new NotFoundError("Subscription", input.id);

      await ctx.db.$transaction(async (tx) => {
        await tx.subscription.update({
          where: { id: input.id },
          data: { deletedAt: new Date(), status: "CANCELLED" },
        });

        await writeAuditLog(
          {
            entityType: "Subscription",
            entityId: input.id,
            action: "DELETE",
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );
      });

      return { success: true };
    }),

  /**
   * Records a renewal: creates a real Expense (GL-posted through the
   * existing postExpense() service) and advances nextRenewalDate by one
   * billing cycle. This is the ONLY place nextRenewalDate changes — the
   * cron job never mutates it, it only alerts.
   */
  renew: orgProcedure
    .input(
      z.object({
        id: cuidSchema,
        amount: z.number().positive().optional(), // override list price if it changed
        date: z.coerce.date().optional(),
        notes: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, "subscription:renew", "Subscription");

      const orgId = ctx.user.organizationId;

      const subscription = await ctx.db.subscription.findFirst({
        where: { id: input.id, organizationId: orgId, deletedAt: null },
        select: {
          id: true,
          name: true,
          amount: true,
          method: true,
          billingCycle: true,
          customCycleDays: true,
          nextRenewalDate: true,
          categoryId: true,
          departmentId: true,
          status: true,
        },
      });
      if (!subscription) throw new NotFoundError("Subscription", input.id);

      if (
        subscription.status === "CANCELLED" ||
        subscription.status === "EXPIRED"
      ) {
        throw new ForbiddenError(
          "renew",
          "this subscription. It is cancelled or expired — reactivate it first.",
        );
      }

      const renewalAmount = input.amount ?? Number(subscription.amount);
      const renewalDate = input.date ?? new Date();

      return ctx.db.$transaction(async (tx) => {
        // 1. Create the Expense that represents this renewal charge.
        const expense = await tx.expense.create({
          data: {
            description: `Subscription renewal: ${subscription.name}`,
            amount: renewalAmount,
            method: subscription.method,
            date: renewalDate,
            notes: input.notes,
            categoryId: subscription.categoryId,
            departmentId: subscription.departmentId,
            subscriptionId: subscription.id,
            organizationId: orgId,
            createdById: ctx.user.id,
          },
        });

        // 2. Resolve the GL expense account from the category, same as the
        //    expense router does, and post Dr Expense / Cr Cash-or-Bank.
        let expenseAccountCode: string | undefined;
        if (subscription.categoryId) {
          const category = await tx.expenseCategory.findUnique({
            where: { id: subscription.categoryId },
            select: { account: { select: { code: true } } },
          });
          expenseAccountCode = category?.account?.code;
        }

        const journalEntry = await postExpense({
          tx,
          organizationId: orgId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
          expenseId: expense.id,
          amount: renewalAmount,
          method: subscription.method,
          description: expense.description,
          expenseAccountCode,
        });

        if (journalEntry) {
          await tx.expense.update({
            where: { id: expense.id },
            data: { journalEntryId: journalEntry.id },
          });
        }

        // 3. Advance the subscription to its next cycle.
        const nextRenewalDate = addBillingCycle(
          subscription.nextRenewalDate,
          subscription.billingCycle,
          subscription.customCycleDays,
        );

        const updatedSubscription = await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            nextRenewalDate,
            lastRenewedAt: renewalDate,
            updatedById: ctx.user.id,
          },
        });

        // 4. Clear any pending "renewal due" alerts for the cycle just paid,
        //    so the next cycle's alert isn't deduped away by this one.
        await tx.notification.updateMany({
          where: {
            type: NOTIFICATION_TYPES.SUBSCRIPTION_RENEWAL_DUE,
            entityType: "Subscription",
            entityId: subscription.id,
            status: { in: ["UNREAD", "READ"] },
          },
          data: { status: "DISMISSED" },
        });

        await writeAuditLog(
          {
            entityType: "Subscription",
            entityId: subscription.id,
            action: "RENEW",
            diff: {
              nextRenewalDate: {
                before: subscription.nextRenewalDate,
                after: nextRenewalDate,
              },
              amount: { before: null, after: renewalAmount },
            },
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return { subscription: updatedSubscription, expense, journalEntry };
      });
    }),
});
