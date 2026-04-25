/**
 * invoices.ts
 * Full invoice lifecycle: DRAFT → SENT → PARTIAL → PAID → CANCELLED.
 * Covers INVOICE, QUOTE (convertible), and CREDIT_NOTE.
 * All multi-table mutations use prisma.$transaction.
 */

import { z } from 'zod';
import { protectedProcedure, adminProcedure, t } from '@/lib/trpc/server';
import { TRPCError } from '@trpc/server';
import {
  assertOwnership,
  computeInvoiceTotals,
  deductStockForInvoice,
  nextSerial,
  paginationInput,
  recomputeGroupTotals,
  requireOrgId,
  reverseStockForInvoice,
  syncInvoicePaymentStatus,
} from './_shared';
import { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const invoiceLineInput = z.object({
  itemId: z.string().optional(),
  groupId: z.string().optional(),
  description: z.string().optional(),
  quantity: z.string().default('1'), // Decimal stored as string
  unitPrice: z.number().int().min(0),
  discountAmt: z.number().int().min(0).default(0),
  taxAmt: z.number().int().min(0).default(0),
  taxRateId: z.string().optional(),
  purchasePrice: z.number().int().min(0).default(0), // snapshot at invoice time
  sortOrder: z.number().int().default(0),
});

const lineGroupInput = z.object({
  title: z.string().min(1),
  showLineDetails: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeLineTotal(
  unitPrice: number,
  quantity: string,
  discountAmt: number,
  taxAmt: number,
): bigint {
  const qty = parseFloat(quantity);
  const lineSubtotal = Math.round(unitPrice * qty);
  return BigInt(lineSubtotal - discountAmt + taxAmt);
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const invoiceRouter = t.router({
  // =========================================================================
  // LIST & GET
  // =========================================================================

  list: protectedProcedure
    .input(
      paginationInput.extend({
        search: z.string().optional(),
        type: z.enum(['INVOICE', 'QUOTE', 'CREDIT_NOTE']).optional(),
        status: z.enum(['DRAFT', 'SENT', 'PARTIAL', 'PAID', 'CANCELLED', 'DELETED']).optional(),
        paymentStatus: z.enum(['PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
        customerId: z.string().optional(),
        jobId: z.string().optional(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);
      const { page, pageSize, search, type, status, paymentStatus, customerId, jobId, from, to } =
        input;

      const where: any = {
        organizationId: orgId,
        status: { not: 'DELETED' },
        ...(type && { type }),
        ...(status && { status }),
        ...(paymentStatus && { paymentStatus }),
        ...(customerId && { customerId }),
        ...(jobId && { jobId }),
        ...(from || to ? { date: { ...(from && { gte: from }), ...(to && { lte: to }) } } : {}),
        ...(search && {
          OR: [
            { serial: { contains: search, mode: 'insensitive' } },
            { customer: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }),
      };

      const [items, total] = await ctx.prisma.$transaction([
        ctx.prisma.invoice.findMany({
          where,
          orderBy: { date: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            serial: true,
            type: true,
            status: true,
            paymentStatus: true,
            date: true,
            dueDate: true,
            subtotal: true,
            total: true,
            amountPaid: true,
            amountDue: true,
            isWalkIn: true,
            customer: { select: { id: true, name: true } },
            job: { select: { id: true, title: true } },
          },
        }),
        ctx.prisma.invoice.count({ where }),
      ]);

      return { items, total, page, pageSize };
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const orgId = requireOrgId(ctx.organizationId);

    const invoice = await ctx.prisma.invoice.findUnique({
      where: { id: input.id },
      include: {
        customer: true,
        job: { select: { id: true, title: true } },
        lineGroups: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lines: {
              orderBy: { sortOrder: 'asc' },
              include: { item: { select: { id: true, name: true, sku: true, unit: true } } },
            },
          },
        },
        // Ungrouped lines
        lines: {
          where: { groupId: null },
          orderBy: { sortOrder: 'asc' },
          include: { item: { select: { id: true, name: true, sku: true, unit: true } } },
        },
        payments: { orderBy: { date: 'desc' } },
        parentInvoice: { select: { id: true, serial: true } },
        creditNotes: { select: { id: true, serial: true, total: true, status: true } },
      },
    });

    assertOwnership(invoice, orgId, 'Invoice');
    return invoice;
  }),

  // =========================================================================
  // CREATE
  // =========================================================================

  create: protectedProcedure
    .input(
      z.object({
        type: z.enum(['INVOICE', 'QUOTE', 'CREDIT_NOTE']).default('INVOICE'),
        customerId: z.string().optional(),
        jobId: z.string().optional(),
        isWalkIn: z.boolean().default(false),
        date: z.coerce.date().optional(),
        dueDate: z.coerce.date().optional(),
        parentInvoiceId: z.string().optional(), // for credit notes
        notes: z.string().optional(),
        termsText: z.string().optional(),
        warehouseId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      if (!input.isWalkIn && !input.customerId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Either a customer or walk-in must be specified',
        });
      }

      if (input.type === 'CREDIT_NOTE' && !input.parentInvoiceId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Credit notes must reference a parent invoice',
        });
      }

      // Fetch org defaults for payment terms
      const org = await ctx.prisma.organization.findUniqueOrThrow({
        where: { id: orgId },
        select: { paymentTermsDays: true, defaultTermsText: true },
      });

      const prefix = input.type === 'QUOTE' ? 'QTE' : input.type === 'CREDIT_NOTE' ? 'CN' : 'INV';

      return ctx.prisma.$transaction(async (tx) => {
        const serial = await nextSerial(tx, orgId, prefix as 'INV' | 'QTE' | 'CN');

        const invoiceDate = input.date ?? new Date();
        const dueDate =
          input.dueDate ??
          (input.type === 'INVOICE'
            ? new Date(invoiceDate.getTime() + (org.paymentTermsDays ?? 30) * 86400000)
            : undefined);

        return tx.invoice.create({
          data: {
            serial,
            type: input.type,
            status: 'DRAFT',
            paymentStatus: 'PENDING',
            organizationId: orgId,
            customerId: input.customerId,
            jobId: input.jobId,
            parentInvoiceId: input.parentInvoiceId,
            isWalkIn: input.isWalkIn,
            date: invoiceDate,
            dueDate,
            notes: input.notes,
            termsText: input.termsText ?? org.defaultTermsText,
            warehouseId: input.warehouseId,
            subtotal: BigInt(0),
            discountTotal: BigInt(0),
            taxTotal: BigInt(0),
            total: BigInt(0),
            amountPaid: BigInt(0),
            amountDue: BigInt(0),
            createdById: ctx.user.id,
          },
        });
      });
    }),

  // =========================================================================
  // UPDATE HEADER (DRAFT only)
  // =========================================================================

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        customerId: z.string().optional(),
        jobId: z.string().optional(),
        date: z.coerce.date().optional(),
        dueDate: z.coerce.date().optional(),
        notes: z.string().optional(),
        termsText: z.string().optional(),
        warehouseId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);
      const { id, ...rest } = input;

      const existing = await ctx.prisma.invoice.findUnique({
        where: { id },
        select: { organizationId: true, status: true },
      });
      if (!existing) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'invoice not found' });
      }
      assertOwnership(existing, orgId, 'Invoice');

      if (existing.status !== 'DRAFT') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only DRAFT invoices can be edited' });
      }

      return ctx.prisma.invoice.update({ where: { id }, data: rest });
    }),

  // =========================================================================
  // LINE GROUPS
  // =========================================================================

  addLineGroup: protectedProcedure
    .input(z.object({ invoiceId: z.string() }).merge(lineGroupInput))
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);
      const { invoiceId, ...groupData } = input;

      const invoice = await ctx.prisma.invoice.findUnique({
        where: { id: invoiceId },
        select: { organizationId: true, status: true },
      });
      if (!invoice) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'invoice not found' });
      }
      assertOwnership(invoice, orgId, 'Invoice');
      if (invoice.status !== 'DRAFT')
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invoice is not editable' });

      return ctx.prisma.invoiceLineGroup.create({
        data: {
          title: groupData.title,
          showLineDetails: groupData.showLineDetails,
          sortOrder: groupData.sortOrder,
          invoiceId,
          organizationId: ctx.organizationId,
          subtotal: BigInt(0),
          discountTotal: BigInt(0),
          taxTotal: BigInt(0),
          total: BigInt(0),
        },
      });
    }),

  updateLineGroup: protectedProcedure
    .input(z.object({ id: z.string(), invoiceId: z.string() }).merge(lineGroupInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);
      const { id, invoiceId, ...rest } = input;

      const group = await ctx.prisma.invoiceLineGroup.findUnique({
        where: { id },
        select: {
          invoice: {
            select: {
              organizationId: true,
            },
          },
        },
      });
      if (!group?.invoice) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'one of the Line group or the invoice not exists',
        });
      }
      assertOwnership(group?.invoice, orgId, 'InvoiceLineGroup');

      return ctx.prisma.invoiceLineGroup.update({ where: { id }, data: rest });
    }),

  deleteLineGroup: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      const group = await ctx.prisma.invoiceLineGroup.findUnique({
        where: { id: input.id },
        include: { invoice: { select: { status: true, organizationId: true } } },
      });
      if (!group) throw new TRPCError({ code: 'NOT_FOUND', message: 'Group not found' });
      if (group.invoice.organizationId !== orgId) throw new TRPCError({ code: 'FORBIDDEN' });
      if (group.invoice.status !== 'DRAFT')
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invoice is not editable' });

      // Delete all lines within the group first
      await ctx.prisma.invoiceLine.deleteMany({ where: { groupId: input.id } });

      return ctx.prisma.$transaction(async (tx) => {
        await tx.invoiceLineGroup.delete({ where: { id: input.id } });
        const totals = await computeInvoiceTotals(tx, group.invoiceId);
        return tx.invoice.update({ where: { id: group.invoiceId }, data: totals });
      });
    }),

  // =========================================================================
  // LINES — Add / Update / Delete
  // =========================================================================

  addLine: protectedProcedure
    .input(z.object({ invoiceId: z.string() }).merge(invoiceLineInput))
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);
      const { invoiceId, unitPrice, discountAmt, taxAmt, quantity, ...rest } = input;

      const invoice = await ctx.prisma.invoice.findUnique({
        where: { id: invoiceId },
        select: { organizationId: true, status: true },
      });
      if (!invoice) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invoice is not exist' });
      }
      assertOwnership(invoice, orgId, 'Invoice');
      if (invoice.status !== 'DRAFT')
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invoice is not editable' });

      // Snapshot tax rate name at creation time
      let taxRateSnapshot: string | undefined;
      let taxRateValueSnapshot: Prisma.Decimal | undefined;
      if (rest.taxRateId) {
        const taxRate = await ctx.prisma.taxRate.findUnique({
          where: { id: rest.taxRateId },
          select: { name: true, rate: true },
        });
        taxRateSnapshot = taxRate?.name;
        taxRateValueSnapshot = taxRate?.rate;
      }

      const lineTotal = computeLineTotal(unitPrice, quantity, discountAmt ?? 0, taxAmt ?? 0);

      return ctx.prisma.$transaction(async (tx) => {
        await tx.invoiceLine.create({
          data: {
            ...rest,
            invoiceId,
            organizationId: orgId,
            unitPrice: BigInt(unitPrice),
            discountAmt: BigInt(discountAmt ?? 0),
            taxAmt: BigInt(taxAmt ?? 0),
            quantity,
            total: lineTotal,
            purchasePrice: BigInt(rest.purchasePrice ?? 0),
            taxRateName: taxRateSnapshot,
            taxRateValue: taxRateValueSnapshot,
          },
        });

        // Recompute group totals if grouped
        if (rest.groupId) await recomputeGroupTotals(tx, rest.groupId);

        // Recompute invoice totals
        const totals = await computeInvoiceTotals(tx, invoiceId);
        return tx.invoice.update({ where: { id: invoiceId }, data: totals });
      });
    }),

  updateLine: protectedProcedure
    .input(z.object({ id: z.string(), invoiceId: z.string() }).merge(invoiceLineInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);
      const { id, invoiceId, unitPrice, discountAmt, taxAmt, quantity, ...rest } = input;

      const line = await ctx.prisma.invoiceLine.findUnique({
        where: { id },
        select: {
          organizationId: true,
          groupId: true,
          unitPrice: true,
          quantity: true,
          discountAmt: true,
          taxAmt: true,
        },
      });
      if (!line || line.organizationId !== orgId)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Line not found' });

      const newUnitPrice = unitPrice ?? Number(line.unitPrice);
      const newQty = quantity ?? String(line.quantity);
      const newDiscount = discountAmt ?? Number(line.discountAmt);
      const newTax = taxAmt ?? Number(line.taxAmt);
      const lineTotal = computeLineTotal(newUnitPrice, newQty, newDiscount, newTax);

      return ctx.prisma.$transaction(async (tx) => {
        await tx.invoiceLine.update({
          where: { id },
          data: {
            ...rest,
            ...(unitPrice !== undefined && { unitPrice: BigInt(unitPrice) }),
            ...(discountAmt !== undefined && { discountAmt: BigInt(discountAmt) }),
            ...(taxAmt !== undefined && { taxAmt: BigInt(taxAmt) }),
            ...(quantity !== undefined && { quantity }),
            total: lineTotal,
          },
        });

        if (line.groupId) await recomputeGroupTotals(tx, line.groupId);

        const totals = await computeInvoiceTotals(tx, invoiceId);
        return tx.invoice.update({ where: { id: invoiceId }, data: totals });
      });
    }),

  deleteLine: protectedProcedure
    .input(z.object({ id: z.string(), invoiceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      const line = await ctx.prisma.invoiceLine.findUnique({
        where: { id: input.id },
        select: { organizationId: true, groupId: true },
      });
      if (!line || line.organizationId !== orgId)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Line not found' });

      return ctx.prisma.$transaction(async (tx) => {
        await tx.invoiceLine.delete({ where: { id: input.id } });
        if (line.groupId) await recomputeGroupTotals(tx, line.groupId);
        const totals = await computeInvoiceTotals(tx, input.invoiceId);
        return tx.invoice.update({ where: { id: input.invoiceId }, data: totals });
      });
    }),

  // =========================================================================
  // CONFIRM (DRAFT → SENT)
  // Deducts stock, sets dueDate, freezes totals — all in one $transaction
  // =========================================================================

  confirm: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        warehouseId: z.string(), // warehouse to deduct stock from
        dueDate: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      const invoice = await ctx.prisma.invoice.findUnique({
        where: { id: input.id },
        select: {
          organizationId: true,
          status: true,
          type: true,
          total: true,
          dueDate: true,
          customerId: true,
        },
      });
      if (!invoice) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invoice is not exists',
        });
      }
      assertOwnership(invoice, orgId, 'Invoice');

      if (invoice.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only DRAFT invoices can be confirmed',
        });
      }

      if (invoice.total === BigInt(0)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot confirm an invoice with zero total',
        });
      }

      // Fetch org payment terms for due date default
      const org = await ctx.prisma.organization.findUniqueOrThrow({
        where: { id: orgId },
        select: { paymentTermsDays: true },
      });

      return ctx.prisma.$transaction(async (tx) => {
        // 1. Recompute invoice totals one final time
        const totals = await computeInvoiceTotals(tx, input.id);

        // 2. Set dueDate
        const now = new Date();
        const dueDate =
          input.dueDate ??
          invoice.dueDate ??
          new Date(now.getTime() + (org.paymentTermsDays ?? 30) * 86400000);

        // 3. Deduct stock for PRODUCT lines (only for INVOICE type, not QUOTE)
        if (invoice.type === 'INVOICE') {
          await deductStockForInvoice(tx, input.id, input.warehouseId, ctx.user.id, orgId);
        }

        // 4. Update invoice status + totals
        return tx.invoice.update({
          where: { id: input.id },
          data: {
            ...totals,
            status: 'SENT',
            dueDate,
            amountDue: totals.total,
          },
        });
      });
    }),

  // =========================================================================
  // CONVERT QUOTE → INVOICE
  // =========================================================================

  convertQuote: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      const quote = await ctx.prisma.invoice.findUnique({
        where: { id: input.id },
        select: { organizationId: true, type: true, status: true },
      });
      if (!quote) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Quotation is not exists',
        });
      }
      assertOwnership(quote, orgId, 'Quote');

      if (quote.type !== 'QUOTE') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only quotes can be converted' });
      }
      if (quote.status !== 'DRAFT') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only DRAFT quotes can be converted' });
      }

      return ctx.prisma.$transaction(async (tx) => {
        const serial = await nextSerial(tx, orgId, 'INV');
        return tx.invoice.update({
          where: { id: input.id },
          data: { type: 'INVOICE', serial },
        });
      });
    }),

  // =========================================================================
  // CANCEL
  // =========================================================================

  cancel: adminProcedure
    .input(z.object({ id: z.string(), warehouseId: z.string(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      const invoice = await ctx.prisma.invoice.findUnique({
        where: { id: input.id },
        select: { organizationId: true, status: true, type: true },
      });
      if (!invoice) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invoice is not exists',
        });
      }
      assertOwnership(invoice, orgId, 'Invoice');

      if (['PAID', 'CANCELLED', 'DELETED'].includes(invoice.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot cancel a ${invoice.status} invoice`,
        });
      }

      return ctx.prisma.$transaction(async (tx) => {
        // Reverse stock if invoice was already sent
        if (['SENT', 'PARTIAL'].includes(invoice.status) && invoice.type === 'INVOICE') {
          await reverseStockForInvoice(tx, input.id, input.warehouseId, ctx.user.id, orgId);
        }

        return tx.invoice.update({
          where: { id: input.id },
          data: { status: 'CANCELLED', paymentStatus: 'CANCELLED', notes: input.reason },
        });
      });
    }),

  // =========================================================================
  // CREDIT NOTE
  // =========================================================================

  createCreditNote: protectedProcedure
    .input(
      z.object({
        parentInvoiceId: z.string(),
        warehouseId: z.string(),
        notes: z.string().optional(),
        lines: z
          .array(
            z.object({
              parentLineId: z.string(),
              quantity: z.string(),
              reason: z.string().optional(),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      const parent = await ctx.prisma.invoice.findUnique({
        where: { id: input.parentInvoiceId },
        include: {
          lines: true,
          customer: { select: { id: true } },
        },
      });
      if (!parent) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invoice Parent is not exist',
        });
      }
      assertOwnership(parent, orgId, 'Invoice');

      if (!['SENT', 'PARTIAL', 'PAID'].includes(parent.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Can only credit a SENT, PARTIAL, or PAID invoice',
        });
      }

      return ctx.prisma.$transaction(async (tx) => {
        const serial = await nextSerial(tx, orgId, 'CN');

        // Build credit note lines mirroring the parent lines selected
        const creditLines = [];
        for (const ref of input.lines) {
          const parentLine = parent.lines.find((l) => l.id === ref.parentLineId);
          if (!parentLine) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Line ${ref.parentLineId} not found on parent invoice`,
            });
          }

          const qty = parseFloat(ref.quantity);
          const unitPrice = Number(parentLine.unitPrice);
          const discountAmt = Number(parentLine.discountAmt);
          const taxAmt = Math.round(
            Number(parentLine.taxAmt) * (qty / Number(parentLine.quantity)),
          );
          const lineTotal = computeLineTotal(unitPrice, ref.quantity, discountAmt, taxAmt);

          creditLines.push({
            itemId: parentLine.itemId ?? undefined,
            description: ref.reason ?? parentLine.description ?? undefined,
            quantity: ref.quantity,
            unitPrice: BigInt(unitPrice),
            discountAmt: BigInt(discountAmt),
            taxAmt: BigInt(taxAmt),
            total: lineTotal,
            taxRateId: parentLine.taxRateId ?? undefined,
            taxRateName: parentLine.taxRateName ?? undefined,
            taxRateValue: parentLine.taxRateSnapshot ?? undefined,
            purchasePrice: parentLine.purchasePrice,
            organizationId: orgId,
          });
        }

        const subtotal = creditLines.reduce(
          (s, l) =>
            s +
            (BigInt(l.unitPrice) * BigInt(Math.round(parseFloat(l.quantity) * 1000))) /
              BigInt(1000),
          BigInt(0),
        );
        const taxTotal = creditLines.reduce((s, l) => s + l.taxAmt, BigInt(0));
        const total = creditLines.reduce((s, l) => s + l.total, BigInt(0));

        const creditNote = await tx.invoice.create({
          data: {
            serial,
            createdById: ctx.user.id,
            type: 'CREDIT_NOTE',
            status: 'SENT',
            paymentStatus: 'PAID', // CN is immediately settled
            organizationId: orgId,
            customerId: parent.customerId,
            parentInvoiceId: parent.id,
            date: new Date(),
            notes: input.notes,
            subtotal,
            discountTotal: BigInt(0),
            taxTotal,
            total,
            amountPaid: total,
            amountDue: BigInt(0),
            lines: { create: creditLines },
          },
        });

        // Return stock for physical items
        await reverseStockForInvoice(tx, creditNote.id, input.warehouseId, ctx.user.id, orgId);

        return creditNote;
      });
    }),

  // =========================================================================
  // PAYMENTS
  // =========================================================================

  addPayment: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        amount: z.number().int().min(1),
        method: z.enum(['CASH', 'TRANSFER', 'CARD', 'CHEQUE', 'OTHER']),
        date: z.coerce.date().optional(),
        reference: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);
      const { invoiceId, amount, ...rest } = input;

      const invoice = await ctx.prisma.invoice.findUnique({
        where: { id: invoiceId },
        select: { organizationId: true, status: true, amountDue: true, type: true },
      });
      if (!invoice) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'invoice is not exist',
        });
      }
      assertOwnership(invoice, orgId, 'Invoice');

      if (!['SENT', 'PARTIAL', 'OVERDUE'].includes(invoice.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot record payment on a ${invoice.status} invoice`,
        });
      }

      if (invoice.type !== 'INVOICE') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Payments can only be recorded on invoices',
        });
      }

      const bigAmount = BigInt(amount);
      if (bigAmount > invoice.amountDue) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Payment exceeds outstanding balance',
        });
      }

      return ctx.prisma.$transaction(async (tx) => {
        await tx.payment.create({
          data: {
            invoiceId,
            amount: bigAmount,
            date: rest.date ?? new Date(),
            method: rest.method,
            reference: rest.reference,
            notes: rest.notes,
            organizationId: orgId,
          },
        });

        await syncInvoicePaymentStatus(tx, invoiceId);
      });
    }),

  deletePayment: adminProcedure
    .input(z.object({ paymentId: z.string(), invoiceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      const payment = await ctx.prisma.payment.findUnique({
        where: { id: input.paymentId },
        select: { organizationId: true },
      });
      if (!payment || payment.organizationId !== orgId)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Payment not found' });

      return ctx.prisma.$transaction(async (tx) => {
        await tx.payment.delete({ where: { id: input.paymentId } });
        await syncInvoicePaymentStatus(tx, input.invoiceId);
      });
    }),
});
