/**
 * src/server/modules/invoices/router.ts
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
import { generateSerial } from '@/lib/sequences';
import { assertCan, orgProcedure, router } from '@/lib/trpc/context';
import {
  currencyCodeSchema,
  dateRangeSchema,
  decimalSchema,
  offsetPaginationSchema,
  paginatedResponse,
  paymentMethodSchema,
  sortOrderSchema,
  toDateRangeFilter,
  toPrismaPage,
} from '@/lib/validations';
import { writeAuditLog } from './audit.service';
import { deductStockForInvoice, returnStockForCancelledInvoice } from './invoices.service';
import { addPayment, deletePayment } from './payments.service';

// ---------------------------------------------------------------------------
// Shared line schema
// ---------------------------------------------------------------------------

const invoiceLineInputSchema = z.object({
  id: z.string().cuid().optional(), // Present on update (existing line)
  itemId: z.string().cuid().optional(),
  description: z.string().max(1000).optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  discountAmt: z.number().min(0).default(0),
  purchasePrice: z.number().min(0).optional(),
  taxRateId: z.string().cuid().optional(),
  taxRateSnapshot: z.number().min(0).optional(),
  taxRateName: z.string().optional(),
  sortOrder: z.number().int().default(0),
  departmentId: z.string().cuid().optional(),
});

// ---------------------------------------------------------------------------
// Invoice schemas
// ---------------------------------------------------------------------------

const invoiceBaseSchema = z.object({
  type: z.enum(['QUOTE', 'INVOICE', 'CREDIT_NOTE', 'PROFORMA', 'DELIVERY_NOTE']).default('INVOICE'),
  date: z.coerce.date().default(() => new Date()),
  dueDate: z.coerce.date().optional(),
  customerId: z.string().cuid().optional(),
  warehouseId: z.string().cuid().optional(),
  departmentId: z.string().cuid().optional(),
  currency: currencyCodeSchema.default('BHD'),
  exchangeRate: z.number().positive().default(1),
  description: z.string().max(2000).optional(),
  notes: z.string().max(5000).optional(),
  termsText: z.string().max(10000).optional(),
  internalNotes: z.string().max(5000).optional(),
  isWalkIn: z.boolean().default(false),
  parentInvoiceId: z.string().cuid().optional(), // Required for CREDIT_NOTE
  lines: z.array(invoiceLineInputSchema).min(1, 'At least one line is required'),
});

const createInvoiceSchema = invoiceBaseSchema;

const updateInvoiceSchema = invoiceBaseSchema.partial().extend({
  id: z.string().cuid(),
  version: z.number().int(), // Optimistic lock
  lines: z.array(invoiceLineInputSchema).min(1).optional(),
});

const listInvoicesSchema = z.object({
  ...offsetPaginationSchema.shape,
  search: z.string().optional(),
  type: z.enum(['QUOTE', 'INVOICE', 'CREDIT_NOTE', 'PROFORMA', 'DELIVERY_NOTE']).optional(),
  status: z
    .enum([
      'DRAFT',
      'PENDING_APPROVAL',
      'APPROVED',
      'SENT',
      'PARTIAL',
      'PAID',
      'OVERDUE',
      'CANCELLED',
      'DELETED',
    ])
    .optional(),
  paymentStatus: z.enum(['PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  customerId: z.string().cuid().optional(),
  dateRange: dateRangeSchema,
  dueDateRange: dateRangeSchema,
  sortBy: z.enum(['date', 'dueDate', 'total', 'serial', 'createdAt']).default('date'),
  sortOrder: sortOrderSchema,
});

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
  byId: orgProcedure.input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
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
        select: { id: true, status: true, type: true },
      });
      if (!parent) throw new NotFoundError('Parent Invoice', invoiceData.parentInvoiceId);
      if (parent.type !== 'INVOICE') {
        throw new UnprocessableError('Credit notes can only reference INVOICE type documents.');
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

    const invoice = await ctx.db.$transaction(async (tx) => {
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
        db: tx as never,
        organizationId: orgId,
        prefix: prefix as 'INV',
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

    // Only DRAFT invoices are fully editable
    if (!['DRAFT', 'PENDING_APPROVAL'].includes(existing.status)) {
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
        // Enrich lines with item data
        const enrichedLines = await Promise.all(
          lineInputs.map(async (line) => {
            if (!line.itemId) return line;
            const item = await tx.item.findFirst({
              where: { id: line.itemId, organizationId: orgId },
              select: {
                purchasePrice: true,
                taxRate: { select: { rate: true, name: true, id: true } },
              },
            });
            return {
              ...line,
              purchasePrice: line.purchasePrice ?? Number(item?.purchasePrice ?? 0),
              taxRateId: line.taxRateId ?? item?.taxRate?.id,
              taxRateSnapshot: line.taxRateSnapshot ?? Number(item?.taxRate?.rate ?? 0),
              taxRateName: line.taxRateName ?? item?.taxRate?.name,
            };
          }),
        );

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
    .input(z.object({ id: z.string().cuid(), version: z.number().int() }))
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

        const updated = await tx.invoice.update({
          where: { id: input.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            version: { increment: 1 },
            updatedById: ctx.user.id,
          },
        });

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

        return updated;
      });

      return result;
    }),

  // ── CANCEL ────────────────────────────────────────────────────────────────
  cancel: orgProcedure
    .input(
      z.object({
        id: z.string().cuid(),
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
      });

      return { success: true };
    }),

  // ── CONVERT QUOTE TO INVOICE ──────────────────────────────────────────────
  convertQuote: orgProcedure
    .input(z.object({ quoteId: z.string().cuid() }))
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

      const invoice = await ctx.db.$transaction(async (tx) => {
        const serial = await generateSerial({
          db: tx as never,
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
            termsText: quote.termsText,
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
  delete: orgProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;

      const invoice = await ctx.db.invoice.findFirst({
        where: { id: input.id, organizationId: orgId, deletedAt: null },
        select: { id: true, status: true, organizationId: true },
      });

      if (!invoice) throw new NotFoundError('Invoice', input.id);

      assertCan(ctx.ability, 'invoice:delete', 'Invoice', invoice as Record<string, unknown>);

      if (invoice.status !== 'DRAFT') {
        throw new UnprocessableError(
          'Only DRAFT invoices can be deleted. Cancel the invoice first.',
        );
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
        invoiceId: z.string().cuid(),
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
        select: { id: true, organizationId: true },
      });
      if (!invoice) throw new NotFoundError('Invoice', invoiceId);

      assertCan(
        ctx.ability,
        'invoice:payment:create',
        'Invoice',
        invoice as Record<string, unknown>,
      );

      return ctx.db.$transaction(async (tx) => {
        return addPayment({
          tx,
          invoiceId,
          organizationId: orgId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
          ...paymentData,
        });
      });
    }),

  deletePayment: orgProcedure
    .input(z.object({ paymentId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;

      assertCan(ctx.ability, 'invoice:payment:delete', 'Invoice');

      await ctx.db.$transaction(async (tx) => {
        await deletePayment({
          tx,
          paymentId: input.paymentId,
          organizationId: orgId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
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
