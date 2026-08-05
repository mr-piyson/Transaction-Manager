import { z } from "zod";
import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
	UnprocessableError,
} from "@/lib/error";
import { assertCan, orgProcedure, router } from "@/lib/trpc/context";
import { writeAuditLog } from "../shared/audit.service";
import { postExpense } from "../journals/journal-posting.service";
import { reversePostedEntry } from "../journals/journal.service";

const PAYMENT_METHODS = [
	"CASH",
	"BANK_TRANSFER",
	"CARD",
	"CHEQUE",
	"ONLINE",
	"OTHER",
] as const;

export const expensesRouter = router({
	list: orgProcedure
		.input(
			z.object({
				search: z.string().optional(),
				categoryId: z.string().optional(),
				dateFrom: z.coerce.date().optional(),
				dateTo: z.coerce.date().optional(),
				limit: z.number().int().positive().max(500).default(50),
				cursor: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			assertCan(ctx.ability, "expense:read", "Expense");

			const { search, categoryId, dateFrom, dateTo, limit, cursor } = input;
			const orgId = ctx.user.organizationId;

			const where: Record<string, unknown> = {
				organizationId: orgId,
				deletedAt: null,
				...(categoryId ? { categoryId } : {}),
				...(dateFrom || dateTo
					? {
							date: {
								...(dateFrom ? { gte: dateFrom } : {}),
								...(dateTo ? { lte: dateTo } : {}),
							},
						}
					: {}),
				...(search
					? {
							OR: [
								{
									description: {
										contains: search,
										mode: "insensitive" as const,
									},
								},
								{
									reference: { contains: search, mode: "insensitive" as const },
								},
							],
						}
					: {}),
			};

			const expenses = await ctx.db.expense.findMany({
				where,
				take: limit + 1,
				cursor: cursor ? { id: cursor } : undefined,
				orderBy: { date: "desc" },
				include: {
					category: { select: { id: true, name: true } },
					department: { select: { id: true, name: true } },
					purchaseOrder: { select: { id: true, serial: true } },
					createdBy: { select: { id: true, name: true } },
				},
			});

			let nextCursor: string | undefined;
			if (expenses.length > limit) {
				const nextItem = expenses.pop();
				nextCursor = nextItem?.id;
			}

			return { items: expenses, nextCursor };
		}),

	byId: orgProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			assertCan(ctx.ability, "expense:read", "Expense");

			const orgId = ctx.user.organizationId;

			const expense = await ctx.db.expense.findFirst({
				where: { id: input.id, organizationId: orgId, deletedAt: null },
				include: {
					category: { select: { id: true, name: true } },
					department: { select: { id: true, name: true } },
					item: { select: { id: true, sku: true, name: true } },
					purchaseOrder: {
						select: {
							id: true,
							serial: true,
							supplier: { select: { id: true, name: true } },
						},
					},
					createdBy: { select: { id: true, name: true } },
				},
			});

			if (!expense) throw new NotFoundError("Expense", input.id);

			const journalEntry = expense.journalEntryId
				? await ctx.db.journalEntry.findFirst({
						where: { id: expense.journalEntryId, organizationId: orgId },
						select: {
							id: true,
							entryNumber: true,
							status: true,
							date: true,
							postedAt: true,
						},
					})
				: null;

			return { ...expense, journalEntry };
		}),

	create: orgProcedure
		.input(
			z.object({
				description: z.string().min(1).max(1000),
				amount: z.number().positive(),
				method: z.enum(PAYMENT_METHODS).default("CASH"),
				date: z.coerce.date().default(() => new Date()),
				reference: z.string().max(500).optional(),
				notes: z.string().max(2000).optional(),
				categoryId: z.string().optional(),
				departmentId: z.string().optional(),
				itemId: z.string().optional(),
				// Auto-populated by the procurement workflow, never a general selector.
				purchaseOrderId: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertCan(ctx.ability, "expense:create", "Expense");

			const orgId = ctx.user.organizationId;

			if (input.categoryId) {
				const category = await ctx.db.expenseCategory.findFirst({
					where: {
						id: input.categoryId,
						organizationId: orgId,
						isActive: true,
						deletedAt: null,
					},
					select: { id: true },
				});
				if (!category)
					throw new NotFoundError("ExpenseCategory", input.categoryId);
			}

			if (input.purchaseOrderId) {
				const po = await ctx.db.purchaseOrder.findFirst({
					where: { id: input.purchaseOrderId, organizationId: orgId },
					select: { id: true },
				});
				if (!po)
					throw new NotFoundError("PurchaseOrder", input.purchaseOrderId);
			}

			return ctx.db.$transaction(async (tx) => {
				const expense = await tx.expense.create({
					data: {
						description: input.description,
						amount: input.amount,
						method: input.method,
						date: input.date,
						reference: input.reference,
						notes: input.notes,
						categoryId: input.categoryId,
						departmentId: input.departmentId,
						itemId: input.itemId,
						purchaseOrderId: input.purchaseOrderId,
						organizationId: orgId,
						createdById: ctx.user.id,
					},
				});

				// Resolve expense account code from category
				let expenseAccountCode: string | undefined;
				if (input.categoryId) {
					const category = await tx.expenseCategory.findUnique({
						where: { id: input.categoryId },
						select: { account: { select: { code: true } } },
					});
					expenseAccountCode = category?.account?.code;
				}

				// Double-entry journal: Dr Expense Account / Cr Cash/Bank
				const journalEntry = await postExpense({
					tx,
					organizationId: orgId,
					userId: ctx.user.id,
					ipAddress: ctx.ipAddress,
					expenseId: expense.id,
					amount: input.amount,
					method: input.method,
					description: input.description,
					expenseAccountCode,
				});

				if (journalEntry) {
					await tx.expense.update({
						where: { id: expense.id },
						data: { journalEntryId: journalEntry.id },
					});
				}

				await writeAuditLog(
					{
						entityType: "Expense",
						entityId: expense.id,
						action: "CREATE",
						diff: {
							description: { before: null, after: input.description },
							amount: { before: null, after: input.amount },
						},
						organizationId: orgId,
						userId: ctx.user.id,
						ipAddress: ctx.ipAddress,
					},
					tx,
				);

				return expense;
			});
		}),

	update: orgProcedure
		.input(
			z.object({
				id: z.string(),
				description: z.string().min(1).max(1000).optional(),
				amount: z.number().positive().optional(),
				method: z.enum(PAYMENT_METHODS).optional(),
				date: z.coerce.date().optional(),
				reference: z.string().max(500).nullable().optional(),
				notes: z.string().max(2000).nullable().optional(),
				categoryId: z.string().nullable().optional(),
				departmentId: z.string().nullable().optional(),
				itemId: z.string().nullable().optional(),
				purchaseOrderId: z.string().nullable().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertCan(ctx.ability, "expense:update", "Expense");

			const { id, ...data } = input;
			const orgId = ctx.user.organizationId;

			const existing = await ctx.db.expense.findFirst({
				where: { id, organizationId: orgId, deletedAt: null },
				select: {
					id: true,
					description: true,
					amount: true,
					method: true,
					date: true,
					reference: true,
					notes: true,
					categoryId: true,
					journalEntryId: true,
				},
			});
			if (!existing) throw new NotFoundError("Expense", id);

			if (data.categoryId) {
				const category = await ctx.db.expenseCategory.findFirst({
					where: {
						id: data.categoryId,
						organizationId: orgId,
						isActive: true,
						deletedAt: null,
					},
					select: { id: true },
				});
				if (!category)
					throw new NotFoundError("ExpenseCategory", data.categoryId);
			}

			if (data.purchaseOrderId) {
				const po = await ctx.db.purchaseOrder.findFirst({
					where: { id: data.purchaseOrderId, organizationId: orgId },
					select: { id: true },
				});
				if (!po) throw new NotFoundError("PurchaseOrder", data.purchaseOrderId);
			}

			// Fields that change the accounting picture (amount, method, date,
			// category) force a new journal entry. Non-accounting fields
			// (description, notes, reference) never touch the posted JE.
			const accountingChanged = [
				["amount", Number(existing.amount)],
				["method", existing.method],
				["date", existing.date.getTime()],
				["categoryId", existing.categoryId ?? null],
			].some(([key, prev]) => {
				const next = data[key as keyof typeof data];
				if (next === undefined) return false;
				return key === "date"
					? (next as Date).getTime() !== (prev as number)
					: next !== prev;
			});

			return ctx.db.$transaction(async (tx) => {
				let newJournalEntryId: string | null = null;

				if (accountingChanged) {
					// Handle the existing journal entry for this expense
					if (existing.journalEntryId) {
						const je = await tx.journalEntry.findFirst({
							where: { id: existing.journalEntryId, organizationId: orgId },
							select: { id: true, status: true },
						});
						if (je?.status === "DRAFT") {
							await tx.journalEntry.deleteMany({ where: { id: je.id } });
						} else if (je?.status === "POSTED") {
							await reversePostedEntry(
								tx,
								je.id,
								orgId,
								ctx.user.id,
								"Expense edited",
							);
						}
						// VOID entries are left as-is; a fresh posting is created below.
					}

					// Resolve the effective category and its expense account
					const effectiveCategoryId =
						data.categoryId !== undefined
							? data.categoryId
							: existing.categoryId;
					let expenseAccountCode: string | undefined;
					if (effectiveCategoryId) {
						const category = await tx.expenseCategory.findUnique({
							where: { id: effectiveCategoryId },
							select: { account: { select: { code: true } } },
						});
						expenseAccountCode = category?.account?.code;
					}

					const journalEntry = await postExpense({
						tx,
						organizationId: orgId,
						userId: ctx.user.id,
						ipAddress: ctx.ipAddress,
						expenseId: id,
						amount: data.amount ?? Number(existing.amount),
						method: data.method ?? existing.method,
						description: data.description ?? existing.description,
						expenseAccountCode,
					});

					if (journalEntry) newJournalEntryId = journalEntry.id;
				}

				const updated = await tx.expense.update({
					where: { id },
					data: {
						...data,
						...(newJournalEntryId ? { journalEntryId: newJournalEntryId } : {}),
					},
				});

				await writeAuditLog(
					{
						entityType: "Expense",
						entityId: id,
						action: "UPDATE",
						diff: {
							description: {
								before: existing.description,
								after: data.description ?? existing.description,
							},
							amount: {
								before: Number(existing.amount),
								after: data.amount ?? Number(existing.amount),
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
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			assertCan(ctx.ability, "expense:delete", "Expense");

			const expense = await ctx.db.expense.findFirst({
				where: {
					id: input.id,
					organizationId: ctx.user.organizationId,
					deletedAt: null,
				},
				select: { id: true },
			});
			if (!expense) throw new NotFoundError("Expense", input.id);

			await ctx.db.$transaction(async (tx) => {
				await tx.expense.update({
					where: { id: input.id },
					data: { deletedAt: new Date() },
				});

				await writeAuditLog(
					{
						entityType: "Expense",
						entityId: input.id,
						action: "DELETE",
						organizationId: ctx.user.organizationId,
						userId: ctx.user.id,
						ipAddress: ctx.ipAddress,
					},
					tx,
				);
			});

			return { success: true };
		}),

	// ── SUPER_ADMIN: permanent deletion of the expense + its journal entry ──
	hardDeleteInfo: orgProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			if (ctx.user.platformRole !== "SUPER_ADMIN")
				throw new ForbiddenError(
					"hard delete",
					"this expense. This action is restricted to platform super admins",
				);
			const orgId = ctx.user.organizationId;

			const expense = await ctx.db.expense.findFirst({
				where: { id: input.id, organizationId: orgId },
				select: { id: true, journalEntryId: true },
			});
			if (!expense) throw new NotFoundError("Expense", input.id);

			const [auditLogs, tags, notifications, attachments] = await Promise.all([
				ctx.db.auditLog.count({
					where: { entityType: "Expense", entityId: input.id },
				}),
				ctx.db.tagging.count({
					where: { entityType: "Expense", entityId: input.id },
				}),
				ctx.db.notification.count({
					where: { entityType: "Expense", entityId: input.id },
				}),
				ctx.db.attachment.count({
					where: { entityType: "Expense", entityId: input.id },
				}),
			]);

			return {
				id: input.id,
				journalEntries: expense.journalEntryId ? 1 : 0,
				auditLogs,
				tags,
				notifications,
				attachments,
			};
		}),

	hardDelete: orgProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (ctx.user.platformRole !== "SUPER_ADMIN")
				throw new ForbiddenError(
					"hard delete",
					"this expense. This action is restricted to platform super admins",
				);
			const orgId = ctx.user.organizationId;

			const expense = await ctx.db.expense.findFirst({
				where: { id: input.id, organizationId: orgId },
				select: { id: true, journalEntryId: true },
			});
			if (!expense) throw new NotFoundError("Expense", input.id);

			await ctx.db.$transaction(async (tx) => {
				// Journal lines cascade off the JournalEntry row.
				if (expense.journalEntryId) {
					await tx.journalEntry.deleteMany({
						where: { id: expense.journalEntryId },
					});
				}
				await tx.auditLog.deleteMany({
					where: { entityType: "Expense", entityId: input.id },
				});
				await tx.tagging.deleteMany({
					where: { entityType: "Expense", entityId: input.id },
				});
				await tx.notification.deleteMany({
					where: { entityType: "Expense", entityId: input.id },
				});
				await tx.attachment.deleteMany({
					where: { entityType: "Expense", entityId: input.id },
				});
				await tx.expense.deleteMany({ where: { id: input.id } });
			});

			return { success: true };
		}),

	// ── Expense categories (no create path existed anywhere before) ───────────
	categories: router({
		list: orgProcedure.query(async ({ ctx }) => {
			assertCan(ctx.ability, "expense:read", "Expense");

			return ctx.db.expenseCategory.findMany({
				where: { organizationId: ctx.user.organizationId, deletedAt: null },
				orderBy: { name: "asc" },
				include: {
					account: { select: { id: true, code: true, name: true } },
					_count: { select: { expenses: true } },
				},
			});
		}),

		create: orgProcedure
			.input(
				z.object({
					name: z.string().min(1).max(200),
					accountId: z.string().optional(),
				}),
			)
			.mutation(async ({ ctx, input }) => {
				assertCan(ctx.ability, "expense:create", "Expense");

				const orgId = ctx.user.organizationId;

				const existing = await ctx.db.expenseCategory.findFirst({
					where: { name: input.name, organizationId: orgId, deletedAt: null },
					select: { id: true },
				});
				if (existing)
					throw new ConflictError(
						`Expense category "${input.name}" already exists.`,
					);

				if (input.accountId) {
					const account = await ctx.db.ledgerAccount.findFirst({
						where: {
							id: input.accountId,
							organizationId: orgId,
							isActive: true,
						},
						select: { id: true },
					});
					if (!account)
						throw new NotFoundError("LedgerAccount", input.accountId);
				}

				return ctx.db.$transaction(async (tx) => {
					const created = await tx.expenseCategory.create({
						data: {
							name: input.name,
							accountId: input.accountId,
							organizationId: orgId,
						},
					});

					await writeAuditLog(
						{
							entityType: "ExpenseCategory",
							entityId: created.id,
							action: "CREATE",
							diff: { name: { before: null, after: input.name } },
							organizationId: orgId,
							userId: ctx.user.id,
							ipAddress: ctx.ipAddress,
						},
						tx,
					);

					return created;
				});
			}),

		update: orgProcedure
			.input(
				z.object({
					id: z.string(),
					name: z.string().min(1).max(200).optional(),
					accountId: z.string().nullable().optional(),
					isActive: z.boolean().optional(),
				}),
			)
			.mutation(async ({ ctx, input }) => {
				assertCan(ctx.ability, "expense:update", "Expense");

				const { id, ...data } = input;
				const orgId = ctx.user.organizationId;

				const existing = await ctx.db.expenseCategory.findFirst({
					where: { id, organizationId: orgId, deletedAt: null },
					select: { id: true, name: true },
				});
				if (!existing) throw new NotFoundError("ExpenseCategory", id);

				if (data.name && data.name !== existing.name) {
					const dup = await ctx.db.expenseCategory.findFirst({
						where: {
							name: data.name,
							organizationId: orgId,
							deletedAt: null,
							id: { not: id },
						},
						select: { id: true },
					});
					if (dup)
						throw new ConflictError(
							`Expense category "${data.name}" already exists.`,
						);
				}

				if (data.accountId) {
					const account = await ctx.db.ledgerAccount.findFirst({
						where: {
							id: data.accountId,
							organizationId: orgId,
							isActive: true,
						},
						select: { id: true },
					});
					if (!account)
						throw new NotFoundError("LedgerAccount", data.accountId);
				}

				return ctx.db.$transaction(async (tx) => {
					const updated = await tx.expenseCategory.update({
						where: { id },
						data,
					});

					await writeAuditLog(
						{
							entityType: "ExpenseCategory",
							entityId: id,
							action: "UPDATE",
							diff: {
								name: {
									before: existing.name,
									after: data.name ?? existing.name,
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
			.input(z.object({ id: z.string() }))
			.mutation(async ({ ctx, input }) => {
				assertCan(ctx.ability, "expense:delete", "Expense");

				const orgId = ctx.user.organizationId;

				const existing = await ctx.db.expenseCategory.findFirst({
					where: { id: input.id, organizationId: orgId, deletedAt: null },
					select: { id: true },
				});
				if (!existing) throw new NotFoundError("ExpenseCategory", input.id);

				await ctx.db.$transaction(async (tx) => {
					await tx.expenseCategory.update({
						where: { id: input.id },
						data: { deletedAt: new Date(), isActive: false },
					});

					await writeAuditLog(
						{
							entityType: "ExpenseCategory",
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
	}),
});
