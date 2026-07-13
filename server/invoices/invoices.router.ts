/**
 *
 * Invoice lifecycle router.
 *
 * INVOICE LIFECYCLE (status machine):
 *
 *   DRAFT ──────────────────────────────────► DELETED (soft)
 *     │
 *     ├─ [approve] (if workflow enabled) ──► PENDING_APPROVAL ──► APPROVED
 *     │                                                              │
 *     └─ [send] ───────────────────────────────────────────────────►┘
 *                                                                    │
 *                                                   SENT ◄──────────┘
 *                                                     │
 *                                    ┌────────────────┴────────────────┐
 *                                    │                                  │
 *                                  PARTIAL ◄── payment              OVERDUE
 *                                    │                                  │
 *                                    └──────────► PAID ◄───────────────┘
 *                                                   │
 *                                              CANCELLED (with stock reversal)
 *
 * MUTATION ATOMICITY:
 * Every mutation that touches >1 table uses db.$transaction().
 * No mutation should ever leave the DB in a partial state.
 *
 * OPTIMISTIC LOCKING:
 * Update mutations check `version` matches the client's last-known value.
 * If another user saved first, the transaction is rejected with StaleDataError.
 */

import { z } from 'zod';
import { calculateInvoiceTotals } from '@/lib/calculator';
import { ConflictError, NotFoundError, StaleDataError, UnprocessableError } from '@/lib/error';
import { type DocumentPrefix, generateSerial } from '@/lib/sequences';
import { assertCan, orgProcedure, router } from '@/lib/trpc/context';
import {
  paginatedResponse,
  paymentMethodSchema,
  toDateRangeFilter,
  toPrismaPage,
} from '@/lib/validations';
import { writeAuditLog } from '../shared/audit.service';
import { deductStockForInvoice, returnStockForCancelledInvoice, returnStockForCreditNote } from './invoices.service';
import {
  createNotification,
  NOTIFICATION_SETTINGS_KEYS,
  NOTIFICATION_TYPES,
} from '../notifications/notifications.shared';
import { addPayment, deletePayment, resolvePaymentStatus, resolveInvoiceStatus } from './payments.service';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  listInvoicesSchema,
} from './invoices.schemas';

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const invoicesRouter = router({
  // ── LIST ──────────────────────────────────────────────────────────────────
  list: orgProcedure.input(listInvoicesSchema).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'invoice:read', 'Invoice');

    const {
      search,
      type,
      status,
      paymentStatus,
      customerId,
      dateRange,
      dueDateRange,
      sortBy,
      sortOrder,
      ...pagination
    } = input;
    const { skip, take } = toPrismaPage(pagination);
    const orgId = ctx.user.organizationId;

    const where = {
      organizationId: orgId,
      deletedAt: null,
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(customerId ? { customerId } : {}),
      ...(dateRange ? { date: toDateRangeFilter(dateRange) } : {}),
      ...(dueDateRange ? { dueDate: toDateRangeFilter(dueDateRange) } : {}),
      ...(search
        ? {
            OR: [
              { serial: { contains: search, mode: 'insensitive' as const } },
              {
                customer: {
                  name: { contains: search, mode: 'insensitive' as const },
                },
              },
              {
                description: { contains: search, mode: 'insensitive' as const },
              },
            ],
          }
        : {}),
    };

    const [invoices, total] = await ctx.db.$transaction([
      ctx.db.invoice.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          serial: true,
          type: true,
          status: true,
          paymentStatus: true,
          date: true,
          dueDate: true,
          total: true,
          amountPaid: true,
          amountDue: true,
          currency: true,
          isWalkIn: true,
          customer: { select: { id: true, name: true, email: true } },
          createdAt: true,
          updatedAt: true,
          _count: { select: { lines: true, payments: true } },
        },
      }),
      ctx.db.invoice.count({ where }),
    ]);

    return paginatedResponse(invoices, total, pagination);
  }),

  // ── GET BY ID (full detail) ───────────────────────────────────────────────
  byId: orgProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'invoice:read', 'Invoice');

    const invoice = await ctx.db.invoice.findFirst({
      where: {
        id: input.id,
        organizationId: ctx.user.organizationId,
        deletedAt: null,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            taxId: true,
          },
        },
        warehouse: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        lines: {
          orderBy: { sortOrder: 'asc' },
          include: {
            item: { select: { id: true, sku: true, name: true, unit: true } },
            taxRate: { select: { id: true, name: true, rate: true } },
            department: { select: { id: true, name: true } },
          },
        },
        payments: { orderBy: { date: 'desc' } },
        parentInvoice: { select: { id: true, serial: true } },
        creditNotes: {
          select: { id: true, serial: true, status: true, total: true },
        },
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
      },
    });

    if (!invoice) throw new NotFoundError('Invoice', input.id);

    assertCan(
      ctx.ability,
      'invoice:read',
      'Invoice',
      invoice as unknown as Record<string, unknown>,
    );

    return invoice;
  }),

  // ── CREATE ────────────────────────────────────────────────────────────────
  create: orgProcedure.input(createInvoiceSchema).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'invoice:create', 'Invoice');

    const orgId = ctx.user.organizationId;
    const { lines: lineInputs, ...invoiceData } = input;

    // Validate credit note has a parent
    if (invoiceData.type === 'CREDIT_NOTE' && !invoiceData.parentInvoiceId) {
      throw new UnprocessableError('Credit notes must reference a parent invoice.');
    }

    // Validate parent invoice exists and belongs to org
    if (invoiceData.parentInvoiceId) {
      const parent = await ctx.db.invoice.findFirst({
        where: {
          id: invoiceData.parentInvoiceId,
          organizationId: orgId,
          deletedAt: null,
        },
        select: { id: true, status: true, type: true, total: true, warehouseId: true },
      });
      if (!parent) throw new NotFoundError('Parent Invoice', invoiceData.parentInvoiceId);
      if (parent.type !== 'INVOICE') {
        throw new UnprocessableError('Credit notes can only reference INVOICE type documents.');
      }

      // Validate credit note total does not exceed remaining refundable amount
      const existingCreditNotes = await ctx.db.invoice.aggregate({
        where: {
          parentInvoiceId: invoiceData.parentInvoiceId,
          type: 'CREDIT_NOTE',
          organizationId: orgId,
          deletedAt: null,
        },
        _sum: { total: true },
      });
      const totalAlreadyCredited = Number(existingCreditNotes._sum.total ?? 0);
      const parentTotal = Number(parent.total);
      const remainingRefundable = parentTotal - totalAlreadyCredited;

      // Calculate this credit note's total for validation
      const creditTotals = calculateInvoiceTotals(
        lineInputs.map((l) => ({
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountAmt: l.discountAmt,
          taxRateSnapshot: l.taxRateSnapshot ?? 0,
          purchasePrice: l.purchasePrice,
        })),
      );

      if (creditTotals.total > remainingRefundable + 0.000001) {
        throw new UnprocessableError(
          `Credit note total (${creditTotals.total.toFixed(3)}) exceeds the remaining refundable amount (${remainingRefundable.toFixed(3)}) on the parent invoice.`,
        );
      }

      // Inherit warehouse from parent if not set
      if (!invoiceData.warehouseId && parent.warehouseId) {
        invoiceData.warehouseId = parent.warehouseId;
      }
    }

    // Validate customer belongs to org
    if (invoiceData.customerId && !invoiceData.isWalkIn) {
      const customer = await ctx.db.customer.findFirst({
        where: {
          id: invoiceData.customerId,
          organizationId: orgId,
          deletedAt: null,
          isActive: true,
        },
        select: { id: true },
      });
      if (!customer) throw new NotFoundError('Customer', invoiceData.customerId);
    }

    // Validate warehouse
    if (invoiceData.warehouseId) {
      const wh = await ctx.db.warehouse.findFirst({
        where: {
          id: invoiceData.warehouseId,
          organizationId: orgId,
          isActive: true,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!wh) throw new NotFoundError('Warehouse', invoiceData.warehouseId);
    }

    // Resolve item details for each line (tax rate, purchase price)
    const enrichedLines = await Promise.all(
      lineInputs.map(async (line) => {
        if (!line.itemId) return line;
        const item = await ctx.db.item.findFirst({
          where: {
            id: line.itemId,
            organizationId: orgId,
            deletedAt: null,
            isSaleable: true,
          },
          select: {
            purchasePrice: true,
            taxRate: { select: { rate: true, name: true, id: true } },
          },
        });
        if (!item) throw new NotFoundError('Item', line.itemId);
        return {
          ...line,
          purchasePrice: line.purchasePrice ?? Number(item.purchasePrice),
          taxRateId: line.taxRateId ?? item.taxRate?.id,
          taxRateSnapshot: line.taxRateSnapshot ?? Number(item.taxRate?.rate ?? 0),
          taxRateName: line.taxRateName ?? item.taxRate?.name,
        };
      }),
    );

    // Calculate totals
    const totals = calculateInvoiceTotals(
      enrichedLines.map((l) => ({
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountAmt: l.discountAmt,
        taxRateSnapshot: l.taxRateSnapshot,
        purchasePrice: l.purchasePrice,
      })),
    );

    // Retry on serial unique constraint violation (P2002)
    let invoice: any;
    let lastError: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        invoice = await ctx.db.$transaction(async (tx) => {
          // Determine serial prefix
          const prefixMap: Record<string, string> = {
            INVOICE: 'INV',
            QUOTE: 'QTE',
            CREDIT_NOTE: 'CN',
            PROFORMA: 'PFI',
            DELIVERY_NOTE: 'DN',
          };
          const prefix = prefixMap[invoiceData.type ?? 'INVOICE'] ?? 'INV';

          const serial = await generateSerial({
            db: tx,
            organizationId: orgId,
            prefix: prefix as DocumentPrefix,
          });

          // Compute due date from org default if not supplied
          let dueDate = invoiceData.dueDate;
          if (!dueDate && invoiceData.type === 'INVOICE') {
            const org = await tx.organization.findUnique({
              where: { id: orgId },
              select: { paymentTermsDays: true },
            });
            const terms = org?.paymentTermsDays ?? 30;
            dueDate = new Date((invoiceData.date ?? new Date()).getTime() + terms * 86_400_000);
          }

          const created = await tx.invoice.create({
            data: {
              serial,
              ...invoiceData,
              dueDate,
              subtotal: totals.subtotal,
              discountTotal: totals.discountTotal,
              taxTotal: totals.taxTotal,
              total: totals.total,
              costTotal: totals.costTotal,
              amountDue: totals.total,
              organizationId: orgId,
              createdById: ctx.user.id,
              lines: {
                create: enrichedLines.map((line, idx) => ({
                  itemId: line.itemId,
                  description: line.description,
                  quantity: totals.lines[idx]?.quantity,
                  unitPrice: totals.lines[idx]?.unitPrice,
                  discountAmt: totals.lines[idx]?.discountAmt,
                  purchasePrice: totals.lines[idx]?.purchasePrice ?? 0,
                  taxAmt: totals.lines[idx]?.taxAmt,
                  total: totals.lines[idx]?.total,
                  taxRateId: line.taxRateId,
                  taxRateSnapshot: line.taxRateSnapshot,
                  taxRateName: line.taxRateName,
                  sortOrder: line.sortOrder ?? idx,
                  departmentId: line.departmentId,
                  organizationId: orgId,
                })),
              },
            },
            include: { lines: true },
          });

          await writeAuditLog(
            {
              entityType: 'Invoice',
              entityId: created.id,
              action: 'CREATE',
              diff: {
                serial: { before: null, after: serial },
                type: { before: null, after: invoiceData.type },
              },
              organizationId: orgId,
              userId: ctx.user.id,
              ipAddress: ctx.ipAddress,
            },
            tx,
          );

          return created;
        });
        return invoice;
      } catch (err: any) {
        lastError = err;
        if (err.code !== 'P2002') throw err;
      }
    }
    throw lastError;
  }),

  // ── UPDATE (DRAFT only) ───────────────────────────────────────────────────
  update: orgProcedure.input(updateInvoiceSchema).mutation(async ({ ctx, input }) => {
    const { id, version, lines: lineInputs, ...data } = input;
    const orgId = ctx.user.organizationId;

    const existing = await ctx.db.invoice.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      select: {
        id: true,
        status: true,
        version: true,
        organizationId: true,
        type: true,
      },
    });

    if (!existing) throw new NotFoundError('Invoice', id);

    assertCan(ctx.ability, 'invoice:update', 'Invoice', existing as Record<string, unknown>);

    // Only DRAFT invoices are editable (PENDING_APPROVAL must be rejected first)
    if (existing.status !== 'DRAFT') {
      throw new UnprocessableError(
        `Invoice in status "${existing.status}" cannot be edited. Cancel it first.`,
      );
    }

    // Optimistic lock check
    if (existing.version !== version) {
      throw new StaleDataError('Invoice');
    }

    const updated = await ctx.db.$transaction(async (tx) => {
      let totalsData = {};

      if (lineInputs && lineInputs.length > 0) {
        // Enrich lines with item data (sequential to stay inside tx context)
        const enrichedLines: Array<Record<string, any>> = [];
        for (const line of lineInputs) {
          if (!line.itemId) {
            enrichedLines.push(line);
            continue;
          }
          const item = await tx.item.findFirst({
            where: { id: line.itemId, organizationId: orgId },
            select: {
              purchasePrice: true,
              taxRate: { select: { rate: true, name: true, id: true } },
            },
          });
          enrichedLines.push({
            ...line,
            purchasePrice: line.purchasePrice ?? Number(item?.purchasePrice ?? 0),
            taxRateId: line.taxRateId ?? item?.taxRate?.id,
            taxRateSnapshot: line.taxRateSnapshot ?? Number(item?.taxRate?.rate ?? 0),
            taxRateName: line.taxRateName ?? item?.taxRate?.name,
          });
        }

        const totals = calculateInvoiceTotals(
          enrichedLines.map((l) => ({
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discountAmt: l.discountAmt,
            taxRateSnapshot: l.taxRateSnapshot,
            purchasePrice: l.purchasePrice,
          })),
        );

        // Replace all lines (delete old, insert new)
        await tx.invoiceLine.deleteMany({ where: { invoiceId: id } });
        await tx.invoiceLine.createMany({
          data: enrichedLines.map((line, idx) => ({
            invoiceId: id,
            itemId: line.itemId,
            description: line.description,
            quantity: totals.lines[idx]?.quantity,
            unitPrice: totals.lines[idx]?.unitPrice,
            discountAmt: totals.lines[idx]?.discountAmt,
            purchasePrice: totals.lines[idx]?.purchasePrice ?? 0,
            taxAmt: totals.lines[idx]?.taxAmt,
            total: totals.lines[idx]?.total,
            taxRateId: line.taxRateId,
            taxRateSnapshot: line.taxRateSnapshot,
            taxRateName: line.taxRateName,
            sortOrder: line.sortOrder ?? idx,
            departmentId: line.departmentId,
            organizationId: orgId,
          })),
        });

        totalsData = {
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          taxTotal: totals.taxTotal,
          total: totals.total,
          costTotal: totals.costTotal,
          amountDue: totals.total,
        };
      }

      const result = await tx.invoice.update({
        where: { id },
        data: {
          ...data,
          ...totalsData,
          version: { increment: 1 },
          updatedById: ctx.user.id,
        },
      });

      await writeAuditLog(
        {
          entityType: 'Invoice',
          entityId: id,
          action: 'UPDATE',
          organizationId: orgId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
        },
        tx,
      );

      return result;
    });

    return updated;
  }),

  // ── SEND (DRAFT → SENT + stock deduction) ────────────────────────────────
  send: orgProcedure
    .input(z.object({ id: z.string(), version: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;

      const invoice = await ctx.db.invoice.findFirst({
        where: { id: input.id, organizationId: orgId, deletedAt: null },
        include: {
          lines: {
            include: { item: { select: { type: true } } },
          },
          customer: { select: { name: true } },
        },
      });

      if (!invoice) throw new NotFoundError('Invoice', input.id);

      assertCan(
        ctx.ability,
        'invoice:send',
        'Invoice',
        invoice as unknown as Record<string, unknown>,
      );

      if (!['DRAFT', 'APPROVED'].includes(invoice.status)) {
        throw new UnprocessableError(
          `Invoice must be in DRAFT or APPROVED status to send. Current: ${invoice.status}`,
        );
      }

      if (invoice.version !== input.version) throw new StaleDataError('Invoice');

      // Require warehouse for INVOICE type (stock deduction needs it)
      if (invoice.type === 'INVOICE' && !invoice.warehouseId) {
        throw new UnprocessableError('A warehouse must be assigned before sending an invoice.');
      }

      // Require warehouse for CREDIT_NOTE type (stock return needs it)
      if (invoice.type === 'CREDIT_NOTE' && invoice.parentInvoiceId && !invoice.warehouseId) {
        throw new UnprocessableError('A warehouse must be assigned before sending a credit note.');
      }

      const notifSent = await ctx.db.organizationSetting.findFirst({
        where: {
          organizationId: orgId,
          key: NOTIFICATION_SETTINGS_KEYS[NOTIFICATION_TYPES.INVOICE_SENT],
        },
        select: { value: true },
      });

      const result = await ctx.db.$transaction(async (tx) => {
        // Deduct stock if this is an INVOICE (not QUOTE/PROFORMA)
        if (invoice.type === 'INVOICE' && invoice.warehouseId) {
          await deductStockForInvoice({
            tx,
            organizationId: orgId,
            warehouseId: invoice.warehouseId,
            userId: ctx.user.id,
            lines: invoice.lines
              .map((l) => ({
                itemId: l.itemId!,
                itemType: l.item?.type ?? 'SERVICE',
                quantity: Number(l.quantity),
                invoiceLineId: l.id,
              }))
              .filter((l) => l.itemId),
          });
        }

        // Return stock for CREDIT_NOTE (reverse the original SALE_OUTBOUND)
        if (invoice.type === 'CREDIT_NOTE' && invoice.parentInvoiceId && invoice.warehouseId) {
          await returnStockForCreditNote({
            tx,
            organizationId: orgId,
            warehouseId: invoice.warehouseId,
            userId: ctx.user.id,
            lines: invoice.lines
              .map((l) => ({
                itemId: l.itemId!,
                itemType: l.item?.type ?? 'SERVICE',
                quantity: Number(l.quantity),
                invoiceLineId: l.id,
              }))
              .filter((l) => l.itemId),
          });
        }

        // Create CreditNoteAllocation to track this credit against the parent invoice
        if (invoice.type === 'CREDIT_NOTE' && invoice.parentInvoiceId) {
          await tx.creditNoteAllocation.create({
            data: {
              creditNoteId: invoice.id,
              invoiceId: invoice.parentInvoiceId,
              amount: Number(invoice.total),
              organizationId: orgId,
            },
          });
        }

        const updated = await tx.invoice.update({
          where: { id: input.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            version: { increment: 1 },
            updatedById: ctx.user.id,
          },
        });

        // Create income record for the recognized revenue
        if (invoice.type === 'INVOICE') {
          await tx.income.create({
            data: {
              description: `INV #${invoice.serial}${invoice.customerId ? ` — ${invoice.customer?.name ?? ''}` : ''}`,
              amount: Number(invoice.total),
              date: new Date(),
              reference: invoice.serial,
              invoiceId: invoice.id,
              customerId: invoice.customerId,
              organizationId: orgId,
              createdById: ctx.user.id,
            },
          });
        }

        // Recalculate parent invoice status after credit note is sent
        if (invoice.type === 'CREDIT_NOTE' && invoice.parentInvoiceId) {
          const parentInvoice = await tx.invoice.findUnique({
            where: { id: invoice.parentInvoiceId },
            select: { id: true, total: true, dueDate: true, status: true },
          });

          if (parentInvoice) {
            // Sum all SENT credit notes against this parent
            const creditAggregate = await tx.creditNoteAllocation.aggregate({
              where: { invoiceId: parentInvoice.id, organizationId: orgId },
              _sum: { amount: true },
            });

            // Also sum credit notes directly linked via parentInvoiceId that are SENT
            const linkedCreditNotes = await tx.invoice.aggregate({
              where: {
                parentInvoiceId: parentInvoice.id,
                type: 'CREDIT_NOTE',
                status: 'SENT',
                organizationId: orgId,
                deletedAt: null,
              },
              _sum: { total: true },
            });

            const allocationCredit = Number(creditAggregate._sum.amount ?? 0);
            const linkedCredit = Number(linkedCreditNotes._sum.total ?? 0);
            const totalCreditApplied = allocationCredit + linkedCredit;

            // Sum payments on the parent
            const paymentAggregate = await tx.payment.aggregate({
              where: { invoiceId: parentInvoice.id, organizationId: orgId },
              _sum: { amount: true },
            });
            const amountPaid = Number(paymentAggregate._sum.amount ?? 0);

            const total = Number(parentInvoice.total);
            const amountDue = Math.max(0, total - amountPaid - totalCreditApplied);

            // Resolve status using credit-aware resolvers
            const paymentStatus = resolvePaymentStatus(total, amountPaid, parentInvoice.dueDate, totalCreditApplied);
            const invoiceStatus = resolveInvoiceStatus(
              parentInvoice.status,
              amountPaid,
              total,
              parentInvoice.dueDate,
              totalCreditApplied,
            );

            await tx.invoice.update({
              where: { id: parentInvoice.id },
              data: {
                amountPaid,
                amountDue,
                paymentStatus,
                status: invoiceStatus,
                updatedById: ctx.user.id,
              },
            });
          }
        }

        await writeAuditLog(
          {
            entityType: 'Invoice',
            entityId: input.id,
            action: 'STATUS_CHANGE',
            diff: { status: { before: invoice.status, after: 'SENT' } },
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        await createNotification(tx, notifSent?.value === 'true', {
          title: 'Invoice Sent',
          body: `${invoice.serial} has been sent${invoice.customer ? ` to ${invoice.customer.name}` : ''}.`,
          type: NOTIFICATION_TYPES.INVOICE_SENT,
          entityType: 'Invoice',
          entityId: input.id,
          userId: ctx.user.id,
          organizationId: orgId,
        });

        return updated;
      });

      return result;
    }),

  // ── SUBMIT FOR APPROVAL (DRAFT → PENDING_APPROVAL) ────────────────────────
  submitForApproval: orgProcedure
    .input(z.object({ id: z.string(), version: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;

      const invoice = await ctx.db.invoice.findFirst({
        where: { id: input.id, organizationId: orgId, deletedAt: null },
        select: { id: true, status: true, version: true, serial: true },
      });
      if (!invoice) throw new NotFoundError('Invoice', input.id);

      assertCan(ctx.ability, 'invoice:update', 'Invoice', invoice as Record<string, unknown>);

      if (invoice.status !== 'DRAFT')
        throw new UnprocessableError(
          `Only DRAFT invoices can be submitted for approval. Current: ${invoice.status}`,
        );
      if (invoice.version !== input.version) throw new StaleDataError('Invoice');

      const notifApprovalReq = await ctx.db.organizationSetting.findFirst({
        where: {
          organizationId: orgId,
          key: NOTIFICATION_SETTINGS_KEYS[NOTIFICATION_TYPES.APPROVAL_REQUEST],
        },
        select: { value: true },
      });

      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.invoice.update({
          where: { id: input.id },
          data: {
            status: 'PENDING_APPROVAL',
            approvalStatus: 'PENDING',
            version: { increment: 1 },
            updatedById: ctx.user.id,
          },
        });

        const workflow = await tx.approvalWorkflow.findFirst({
          where: { entityType: 'Invoice', organizationId: orgId, isActive: true },
          select: { id: true },
        });

        if (workflow) {
          await tx.approvalRequest.create({
            data: {
              entityType: 'Invoice',
              entityId: input.id,
              status: 'PENDING',
              currentStep: 1,
              workflowId: workflow.id,
              requestedById: ctx.user.id,
              organizationId: orgId,
            },
          });
        }

        await createNotification(tx, notifApprovalReq?.value === 'true', {
          title: 'Invoice Submitted for Approval',
          body: `${invoice.serial} has been submitted for approval.`,
          type: NOTIFICATION_TYPES.APPROVAL_REQUEST,
          entityType: 'Invoice',
          entityId: input.id,
          userId: ctx.user.id,
          organizationId: orgId,
        });

        await writeAuditLog(
          {
            entityType: 'Invoice',
            entityId: input.id,
            action: 'STATUS_CHANGE',
            diff: { status: { before: invoice.status, after: 'PENDING_APPROVAL' } },
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return updated;
      });
    }),

  // ── APPROVE (PENDING_APPROVAL → APPROVED) ─────────────────────────────────
  approve: orgProcedure
    .input(z.object({ id: z.string(), version: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;

      const invoice = await ctx.db.invoice.findFirst({
        where: { id: input.id, organizationId: orgId, deletedAt: null },
        select: { id: true, status: true, version: true, serial: true, createdById: true },
      });
      if (!invoice) throw new NotFoundError('Invoice', input.id);

      assertCan(ctx.ability, 'invoice:approve', 'Invoice', invoice as Record<string, unknown>);

      if (invoice.status !== 'PENDING_APPROVAL')
        throw new UnprocessableError(
          `Invoice must be PENDING_APPROVAL to approve. Current: ${invoice.status}`,
        );
      if (invoice.version !== input.version) throw new StaleDataError('Invoice');

      const notifInvoiceApproved = await ctx.db.organizationSetting.findFirst({
        where: {
          organizationId: orgId,
          key: NOTIFICATION_SETTINGS_KEYS[NOTIFICATION_TYPES.INVOICE_APPROVED],
        },
        select: { value: true },
      });

      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.invoice.update({
          where: { id: input.id },
          data: {
            status: 'APPROVED',
            approvalStatus: 'APPROVED',
            version: { increment: 1 },
            updatedById: ctx.user.id,
          },
        });

        const request = await tx.approvalRequest.findFirst({
          where: { entityType: 'Invoice', entityId: input.id, organizationId: orgId },
          select: { id: true },
        });
        if (request) {
          await tx.approvalDecision.create({
            data: {
              requestId: request.id,
              stepOrder: 1,
              status: 'APPROVED',
              decidedById: ctx.user.id,
            },
          });
          await tx.approvalRequest.update({
            where: { id: request.id },
            data: { status: 'APPROVED' },
          });
        }

        await createNotification(tx, notifInvoiceApproved?.value === 'true', {
          title: 'Invoice Approved',
          body: `${invoice.serial} has been approved.`,
          type: NOTIFICATION_TYPES.INVOICE_APPROVED,
          entityType: 'Invoice',
          entityId: input.id,
          userId: invoice.createdById,
          organizationId: orgId,
        });

        await writeAuditLog(
          {
            entityType: 'Invoice',
            entityId: input.id,
            action: 'STATUS_CHANGE',
            diff: { status: { before: invoice.status, after: 'APPROVED' } },
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return updated;
      });
    }),

  // ── REJECT (PENDING_APPROVAL → DRAFT) ─────────────────────────────────────
  reject: orgProcedure
    .input(z.object({ id: z.string(), version: z.number().int(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;

      const invoice = await ctx.db.invoice.findFirst({
        where: { id: input.id, organizationId: orgId, deletedAt: null },
        select: { id: true, status: true, version: true, serial: true, createdById: true },
      });
      if (!invoice) throw new NotFoundError('Invoice', input.id);

      assertCan(ctx.ability, 'invoice:approve', 'Invoice', invoice as Record<string, unknown>);

      if (invoice.status !== 'PENDING_APPROVAL')
        throw new UnprocessableError(
          `Invoice must be PENDING_APPROVAL to reject. Current: ${invoice.status}`,
        );
      if (invoice.version !== input.version) throw new StaleDataError('Invoice');

      const notifInvoiceRejected = await ctx.db.organizationSetting.findFirst({
        where: {
          organizationId: orgId,
          key: NOTIFICATION_SETTINGS_KEYS[NOTIFICATION_TYPES.INVOICE_REJECTED],
        },
        select: { value: true },
      });

      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.invoice.update({
          where: { id: input.id },
          data: {
            status: 'DRAFT',
            approvalStatus: 'REJECTED',
            version: { increment: 1 },
            updatedById: ctx.user.id,
          },
        });

        const request = await tx.approvalRequest.findFirst({
          where: { entityType: 'Invoice', entityId: input.id, organizationId: orgId },
          select: { id: true },
        });
        if (request) {
          await tx.approvalDecision.create({
            data: {
              requestId: request.id,
              stepOrder: 1,
              status: 'REJECTED',
              notes: input.reason,
              decidedById: ctx.user.id,
            },
          });
          await tx.approvalRequest.update({
            where: { id: request.id },
            data: { status: 'REJECTED' },
          });
        }

        await createNotification(tx, notifInvoiceRejected?.value === 'true', {
          title: 'Invoice Rejected',
          body: `${invoice.serial} was rejected.${input.reason ? ` Reason: ${input.reason}` : ''}`,
          type: NOTIFICATION_TYPES.INVOICE_REJECTED,
          entityType: 'Invoice',
          entityId: input.id,
          userId: invoice.createdById,
          organizationId: orgId,
        });

        await writeAuditLog(
          {
            entityType: 'Invoice',
            entityId: input.id,
            action: 'STATUS_CHANGE',
            diff: {
              status: { before: invoice.status, after: 'DRAFT' },
              reason: { before: null, after: input.reason },
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

  // ── CANCEL ────────────────────────────────────────────────────────────────
  cancel: orgProcedure
    .input(
      z.object({
        id: z.string(),
        version: z.number().int(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;

      const invoice = await ctx.db.invoice.findFirst({
        where: { id: input.id, organizationId: orgId, deletedAt: null },
        include: {
          lines: {
            include: { item: { select: { type: true } } },
          },
        },
      });

      if (!invoice) throw new NotFoundError('Invoice', input.id);

      assertCan(
        ctx.ability,
        'invoice:cancel',
        'Invoice',
        invoice as unknown as Record<string, unknown>,
      );

      if (['CANCELLED', 'DELETED', 'PAID'].includes(invoice.status)) {
        throw new UnprocessableError(`Invoice in status "${invoice.status}" cannot be cancelled.`);
      }

      if (invoice.version !== input.version) throw new StaleDataError('Invoice');

      // Check for existing payments
      if (Number(invoice.amountPaid) > 0) {
        throw new UnprocessableError(
          'Cannot cancel an invoice with recorded payments. Delete the payments first.',
        );
      }

      const notifCancelled = await ctx.db.organizationSetting.findFirst({
        where: {
          organizationId: orgId,
          key: NOTIFICATION_SETTINGS_KEYS[NOTIFICATION_TYPES.INVOICE_CANCELLED],
        },
        select: { value: true },
      });

      await ctx.db.$transaction(async (tx) => {
        // Return stock if invoice was SENT (stock was committed)
        if (
          ['SENT', 'PARTIAL', 'OVERDUE'].includes(invoice.status) &&
          invoice.type === 'INVOICE' &&
          invoice.warehouseId
        ) {
          await returnStockForCancelledInvoice({
            tx,
            organizationId: orgId,
            warehouseId: invoice.warehouseId,
            userId: ctx.user.id,
            lines: invoice.lines
              .map((l) => ({
                itemId: l.itemId!,
                itemType: l.item?.type ?? 'SERVICE',
                quantity: Number(l.quantity),
                invoiceLineId: l.id,
              }))
              .filter((l) => l.itemId),
          });
        }

        await tx.invoice.update({
          where: { id: input.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            paymentStatus: 'CANCELLED',
            internalNotes: input.reason
              ? `CANCELLED: ${input.reason}\n${invoice.internalNotes ?? ''}`
              : invoice.internalNotes,
            version: { increment: 1 },
            updatedById: ctx.user.id,
          },
        });

        await writeAuditLog(
          {
            entityType: 'Invoice',
            entityId: input.id,
            action: 'STATUS_CHANGE',
            diff: {
              status: { before: invoice.status, after: 'CANCELLED' },
              reason: { before: null, after: input.reason },
            },
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        await createNotification(tx, notifCancelled?.value === 'true', {
          title: 'Invoice Cancelled',
          body: `${invoice.serial} has been cancelled.${input.reason ? ` Reason: ${input.reason}` : ''}`,
          type: NOTIFICATION_TYPES.INVOICE_CANCELLED,
          entityType: 'Invoice',
          entityId: input.id,
          userId: ctx.user.id,
          organizationId: orgId,
        });
      });

      return { success: true };
    }),

  // ── CONVERT QUOTE TO INVOICE ──────────────────────────────────────────────
  convertQuote: orgProcedure
    .input(z.object({ quoteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, 'invoice:create', 'Invoice');

      const orgId = ctx.user.organizationId;

      const quote = await ctx.db.invoice.findFirst({
        where: {
          id: input.quoteId,
          organizationId: orgId,
          type: 'QUOTE',
          deletedAt: null,
        },
        include: { lines: true },
      });

      if (!quote) throw new NotFoundError('Quote', input.quoteId);

      if (!['DRAFT', 'SENT', 'APPROVED'].includes(quote.status)) {
        throw new UnprocessableError(`Only DRAFT, SENT, or APPROVED quotes can be converted.`);
      }

      // Check not already converted
      const existingConversion = await ctx.db.invoice.findFirst({
        where: {
          convertedFromId: input.quoteId,
          organizationId: orgId,
          type: 'INVOICE',
          status: { notIn: ['CANCELLED', 'DELETED'] },
        },
        select: { id: true, serial: true },
      });

      if (existingConversion) {
        throw new ConflictError(
          `This quote was already converted to invoice ${existingConversion.serial}.`,
        );
      }

      const notifConverted = await ctx.db.organizationSetting.findFirst({
        where: {
          organizationId: orgId,
          key: NOTIFICATION_SETTINGS_KEYS[NOTIFICATION_TYPES.INVOICE_CONVERTED],
        },
        select: { value: true },
      });

      const invoice = await ctx.db.$transaction(async (tx) => {
        const serial = await generateSerial({
          db: tx,
          organizationId: orgId,
          prefix: 'INV',
        });

        const org = await tx.organization.findUnique({
          where: { id: orgId },
          select: { paymentTermsDays: true },
        });
        const dueDate = new Date(
          (quote.date ?? new Date()).getTime() + (org?.paymentTermsDays ?? 30) * 86_400_000,
        );

        const created = await tx.invoice.create({
          data: {
            serial,
            type: 'INVOICE',
            status: 'DRAFT',
            date: new Date(),
            dueDate,
            convertedFromId: input.quoteId,
            customerId: quote.customerId,
            warehouseId: quote.warehouseId,
            departmentId: quote.departmentId,
            currency: quote.currency,
            exchangeRate: quote.exchangeRate,
            description: quote.description,
            notes: quote.notes,
            internalNotes: quote.internalNotes,
            termsText: quote.termsText,
            isWalkIn: quote.isWalkIn,
            subtotal: quote.subtotal,
            discountTotal: quote.discountTotal,
            taxTotal: quote.taxTotal,
            total: quote.total,
            costTotal: quote.costTotal,
            amountDue: quote.total,
            organizationId: orgId,
            createdById: ctx.user.id,
            lines: {
              create: quote.lines.map((l) => ({
                itemId: l.itemId,
                description: l.description,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                purchasePrice: l.purchasePrice,
                discountAmt: l.discountAmt,
                taxAmt: l.taxAmt,
                total: l.total,
                taxRateId: l.taxRateId,
                taxRateSnapshot: l.taxRateSnapshot,
                taxRateName: l.taxRateName,
                sortOrder: l.sortOrder,
                organizationId: orgId,
              })),
            },
          },
        });

        await createNotification(tx, notifConverted?.value === 'true', {
          title: 'Quote Converted',
          body: `Quote ${quote.serial} has been converted to invoice ${serial}.`,
          type: NOTIFICATION_TYPES.INVOICE_CONVERTED,
          entityType: 'Invoice',
          entityId: created.id,
          userId: quote.createdById,
          organizationId: orgId,
        });

        await writeAuditLog(
          {
            entityType: 'Invoice',
            entityId: created.id,
            action: 'CREATE',
            diff: { convertedFrom: { before: null, after: input.quoteId } },
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return created;
      });

      return invoice;
    }),

  // ── SOFT DELETE (DRAFT only) ──────────────────────────────────────────────
  delete: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const orgId = ctx.user.organizationId;

    const invoice = await ctx.db.invoice.findFirst({
      where: { id: input.id, organizationId: orgId, deletedAt: null },
      select: { id: true, status: true, organizationId: true },
    });

    if (!invoice) throw new NotFoundError('Invoice', input.id);

    assertCan(ctx.ability, 'invoice:delete', 'Invoice', invoice as Record<string, unknown>);

    if (invoice.status !== 'DRAFT') {
      throw new UnprocessableError('Only DRAFT invoices can be deleted. Cancel the invoice first.');
    }

    await ctx.db.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: input.id },
        data: {
          deletedAt: new Date(),
          status: 'DELETED',
          updatedById: ctx.user.id,
        },
      });

      await writeAuditLog(
        {
          entityType: 'Invoice',
          entityId: input.id,
          action: 'DELETE',
          organizationId: orgId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
        },
        tx,
      );
    });

    return { success: true };
  }),

  // ── PAYMENTS ──────────────────────────────────────────────────────────────

  addPayment: orgProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        amount: z.number().positive(),
        method: paymentMethodSchema,
        date: z.coerce.date().default(() => new Date()),
        reference: z.string().max(255).optional(),
        notes: z.string().max(2000).optional(),
        gatewayTxnId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { invoiceId, ...paymentData } = input;
      const orgId = ctx.user.organizationId;

      // Verify invoice access
      const invoice = await ctx.db.invoice.findFirst({
        where: { id: invoiceId, organizationId: orgId, deletedAt: null },
        select: { id: true, organizationId: true, serial: true },
      });
      if (!invoice) throw new NotFoundError('Invoice', invoiceId);

      assertCan(
        ctx.ability,
        'invoice:payment:create',
        'Invoice',
        invoice as Record<string, unknown>,
      );

      const notifPayment = await ctx.db.organizationSetting.findFirst({
        where: {
          organizationId: orgId,
          key: NOTIFICATION_SETTINGS_KEYS[NOTIFICATION_TYPES.PAYMENT_RECEIVED],
        },
        select: { value: true },
      });

      return ctx.db.$transaction(async (tx) => {
        const payment = await addPayment({
          tx,
          invoiceId,
          organizationId: orgId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
          ...paymentData,
        });

        await createNotification(tx, notifPayment?.value === 'true', {
          title: 'Payment Received',
          body: `${paymentData.method} payment of ${paymentData.amount} received for ${invoice.serial}.`,
          type: NOTIFICATION_TYPES.PAYMENT_RECEIVED,
          entityType: 'Invoice',
          entityId: invoiceId,
          userId: ctx.user.id,
          organizationId: orgId,
        });

        return payment;
      });
    }),

  deletePayment: orgProcedure
    .input(z.object({ paymentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;

      assertCan(ctx.ability, 'invoice:payment:delete', 'Invoice');

      const payment = await ctx.db.payment.findFirst({
        where: { id: input.paymentId, organizationId: orgId },
        select: {
          id: true,
          amount: true,
          method: true,
          invoiceId: true,
          invoice: { select: { serial: true, createdById: true } },
        },
      });
      if (!payment) throw new NotFoundError('Payment', input.paymentId);

      const notifPaymentDeleted = await ctx.db.organizationSetting.findFirst({
        where: {
          organizationId: orgId,
          key: NOTIFICATION_SETTINGS_KEYS[NOTIFICATION_TYPES.PAYMENT_DELETED],
        },
        select: { value: true },
      });

      await ctx.db.$transaction(async (tx) => {
        await deletePayment({
          tx,
          paymentId: input.paymentId,
          organizationId: orgId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
        });

        await createNotification(tx, notifPaymentDeleted?.value === 'true', {
          title: 'Payment Removed',
          body: `${payment.method} payment of ${payment.amount} removed from ${payment.invoice.serial}.`,
          type: NOTIFICATION_TYPES.PAYMENT_DELETED,
          entityType: 'Invoice',
          entityId: payment.invoiceId,
          userId: payment.invoice.createdById,
          organizationId: orgId,
        });
      });

      return { success: true };
    }),

  // ── AR AGING REPORT ───────────────────────────────────────────────────────
  arAging: orgProcedure.query(async ({ ctx }) => {
    assertCan(ctx.ability, 'report:financial', 'all');

    const today = new Date();
    const orgId = ctx.user.organizationId;

    // Get all open invoices
    const invoices = await ctx.db.invoice.findMany({
      where: {
        organizationId: orgId,
        type: 'INVOICE',
        status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] },
        deletedAt: null,
      },
      select: {
        id: true,
        serial: true,
        date: true,
        dueDate: true,
        amountDue: true,
        customer: { select: { id: true, name: true } },
      },
    });

    // Bucket by days overdue
    const buckets = {
      current: { count: 0, total: 0 },
      days1to30: { count: 0, total: 0 },
      days31to60: { count: 0, total: 0 },
      days61to90: { count: 0, total: 0 },
      over90: { count: 0, total: 0 },
    };

    for (const inv of invoices) {
      const daysOverdue = inv.dueDate
        ? Math.floor((today.getTime() - inv.dueDate.getTime()) / 86_400_000)
        : -1;
      const amt = Number(inv.amountDue);

      if (daysOverdue <= 0) {
        buckets.current.count++;
        buckets.current.total += amt;
      } else if (daysOverdue <= 30) {
        buckets.days1to30.count++;
        buckets.days1to30.total += amt;
      } else if (daysOverdue <= 60) {
        buckets.days31to60.count++;
        buckets.days31to60.total += amt;
      } else if (daysOverdue <= 90) {
        buckets.days61to90.count++;
        buckets.days61to90.total += amt;
      } else {
        buckets.over90.count++;
        buckets.over90.total += amt;
      }
    }

    const grandTotal = invoices.reduce((sum, inv) => sum + Number(inv.amountDue), 0);

    return { buckets, grandTotal, invoiceCount: invoices.length };
  }),
});
