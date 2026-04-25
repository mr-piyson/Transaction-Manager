/**
 * purchase-orders.ts
 * Purchase order management: DRAFT → ORDERED → PARTIAL_RECEIVED → RECEIVED → CANCELLED.
 * Receiving POs atomically upserts Stock + creates StockMovement rows.
 */

import { z } from 'zod';
import { protectedProcedure, adminProcedure, t } from '@/lib/trpc/server';
import { TRPCError } from '@trpc/server';
import { assertOwnership, nextSerial, requireOrgId, syncPOPaymentStatus } from './_shared';
import { Prisma } from '@prisma/client';

const PO_STATUSES = ['DRAFT', 'ORDERED', 'PARTIAL_RECEIVED', 'RECEIVED', 'CANCELLED'] as const;

const purchaseLineInput = z.object({
  itemId: z.string(),
  description: z.string().optional(),
  quantity: z.number().int().min(1),
  unitCost: z.number().int().min(0), // fils
  taxAmt: z.number().int().min(0).default(0),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computePOTotals(lines: { quantity: number; unitCost: number; taxAmt: number }[]) {
  let subtotal = BigInt(0);
  let taxTotal = BigInt(0);

  for (const l of lines) {
    subtotal += BigInt(l.unitCost) * BigInt(l.quantity);
    taxTotal += BigInt(l.taxAmt);
  }

  return { subtotal, taxTotal, total: subtotal + taxTotal };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const purchaseOrderRouter = t.router({
  // -------------------------------------------------------------------------
  // List
  // -------------------------------------------------------------------------
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.enum(PO_STATUSES).optional(),
        supplierId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);
      const { search, status, supplierId } = input;

      const where: any = {
        organizationId: orgId,
        ...(status && { status }),
        ...(supplierId && { supplierId }),
        ...(search && {
          OR: [
            { serial: { contains: search, mode: 'insensitive' } },
            { supplier: { name: { contains: search, mode: 'insensitive' } } },
            { notes: { contains: search, mode: 'insensitive' } },
          ],
        }),
      };

      return await ctx.prisma.purchaseOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          serial: true,
          status: true,
          orderDate: true,
          expectedDate: true,
          total: true,
          amountPaid: true,
          amountOwed: true,
          supplier: { select: { id: true, name: true } },
          _count: { select: { lines: true } },
        },
      });
    }),

  // -------------------------------------------------------------------------
  // Get single with lines
  // -------------------------------------------------------------------------
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const orgId = requireOrgId(ctx.organizationId);

    const po = await ctx.prisma.purchaseOrder.findUnique({
      where: { id: input.id },
      include: {
        supplier: true,
        lines: {
          include: {
            item: { select: { id: true, name: true, sku: true, unit: true } },
          },
        },
        payments: { orderBy: { date: 'desc' } },
        warehouse: { select: { id: true, name: true } },
      },
    });

    assertOwnership(po, orgId, 'PurchaseOrder');
    return po;
  }),

  // -------------------------------------------------------------------------
  // Create PO (DRAFT)
  // -------------------------------------------------------------------------
  create: protectedProcedure
    .input(
      z.object({
        supplierId: z.string(),
        warehouseId: z.string(),
        orderDate: z.coerce.date().optional(),
        expectedDate: z.coerce.date().optional(),
        notes: z.string().optional(),
        lines: z.array(purchaseLineInput).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      // Validate supplier + warehouse ownership
      const [supplier, warehouse] = await Promise.all([
        ctx.prisma.supplier.findUnique({
          where: { id: input.supplierId },
          select: { organizationId: true },
        }),
        ctx.prisma.warehouse.findUnique({
          where: { id: input.warehouseId },
          select: { organizationId: true },
        }),
      ]);
      assertOwnership(supplier, orgId, 'Supplier');
      assertOwnership(warehouse, orgId, 'Warehouse');

      const totals = computePOTotals(input.lines);

      return ctx.prisma.$transaction(async (tx) => {
        const serial = await nextSerial(tx, orgId, 'PO');

        return tx.purchaseOrder.create({
          data: {
            serial,
            organizationId: orgId,
            supplierId: input.supplierId,
            warehouseId: input.warehouseId,
            //   orderDate: input.orderDate ?? new Date(),
            createdById: ctx.user.id,
            expectedDate: input.expectedDate,
            notes: input.notes,
            status: 'DRAFT',
            subtotal: totals.subtotal,
            taxTotal: totals.taxTotal,
            total: totals.total,
            amountPaid: BigInt(0),
            amountOwed: totals.total,
            lines: {
              create: input.lines.map((l) => ({
                itemId: l.itemId,
                description: l.description,
                quantity: l.quantity,
                unitCost: BigInt(l.unitCost),
                taxAmt: BigInt(l.taxAmt),
                total: BigInt(l.unitCost) * BigInt(l.quantity) + BigInt(l.taxAmt),
                receivedQty: 0,
              })),
            },
          },
          include: { lines: true },
        });
      });
    }),

  // -------------------------------------------------------------------------
  // Update PO (DRAFT only)
  // -------------------------------------------------------------------------
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        supplierId: z.string().optional(),
        warehouseId: z.string().optional(),
        expectedDate: z.coerce.date().optional(),
        notes: z.string().optional(),
        lines: z.array(purchaseLineInput.extend({ id: z.string().optional() })).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);
      const { id, lines, ...rest } = input;

      const existing = await ctx.prisma.purchaseOrder.findUnique({
        where: { id },
        select: { organizationId: true, status: true },
      });
      if (!existing) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'PO is not exist',
        });
      }
      assertOwnership(existing, orgId, 'PurchaseOrder');

      if (existing.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only DRAFT purchase orders can be edited',
        });
      }

      return ctx.prisma.$transaction(async (tx) => {
        if (lines) {
          // Replace all lines
          await tx.purchaseLine.deleteMany({ where: { purchaseOrderId: id } });

          const totals = computePOTotals(lines);

          return tx.purchaseOrder.update({
            where: { id },
            data: {
              ...rest,
              subtotal: totals.subtotal,
              taxTotal: totals.taxTotal,
              total: totals.total,
              amountOwed: totals.total,
              lines: {
                create: lines.map((l) => ({
                  itemId: l.itemId,
                  description: l.description,
                  quantity: l.quantity,
                  unitCost: BigInt(l.unitCost),
                  taxAmt: BigInt(l.taxAmt),
                  total: BigInt(l.unitCost) * BigInt(l.quantity) + BigInt(l.taxAmt),
                  receivedQty: 0,
                })),
              },
            },
            include: { lines: true },
          });
        }

        return tx.purchaseOrder.update({ where: { id }, data: rest });
      });
    }),

  // -------------------------------------------------------------------------
  // Advance PO status (DRAFT → ORDERED)
  // -------------------------------------------------------------------------
  markOrdered: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      const po = await ctx.prisma.purchaseOrder.findUnique({
        where: { id: input.id },
        select: { organizationId: true, status: true },
      });
      if (!po) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'PO is not exist',
        });
      }
      assertOwnership(po, orgId, 'PurchaseOrder');

      if (po.status !== 'DRAFT') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only DRAFT POs can be ordered' });
      }

      return ctx.prisma.purchaseOrder.update({
        where: { id: input.id },
        data: { status: 'ORDERED' },
      });
    }),

  // -------------------------------------------------------------------------
  // Receive PO lines — atomic: stock upsert + movements + status update
  // -------------------------------------------------------------------------
  receive: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        /**
         * Quantities received per line. Partial receive is supported.
         * Pass only the lines that arrived.
         */
        receivedLines: z.array(
          z.object({
            lineId: z.string(),
            receivedQty: z.number().int().min(1),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      const po = await ctx.prisma.purchaseOrder.findUnique({
        where: { id: input.id },
        include: { lines: { include: { item: true } } },
      });
      if (po === null) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'PO is not exist',
        });
      }
      assertOwnership(po, orgId, 'PurchaseOrder');

      if (!['ORDERED', 'PARTIAL_RECEIVED'].includes(po.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'PO must be ORDERED or PARTIAL_RECEIVED to receive goods',
        });
      }

      return ctx.prisma.$transaction(async (tx) => {
        for (const recv of input.receivedLines) {
          const line = po.lines.find((l) => l.id === recv.lineId);
          if (!line) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: `Line ${recv.lineId} not found` });
          }

          const remaining = line.quantity.minus(line.receivedQty);
          if (new Prisma.Decimal(recv.receivedQty).gt(remaining)) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Cannot receive ${recv.receivedQty} units for "${line.item?.name}" — only ${remaining} remaining`,
            });
          }

          // 1. Update receivedQty on the line
          await tx.purchaseLine.update({
            where: { id: recv.lineId },
            data: { receivedQty: { increment: recv.receivedQty } },
          });

          // 2. Upsert Stock
          await tx.stock.upsert({
            where: {
              itemId_warehouseId: {
                itemId: line.itemId,
                warehouseId: po.warehouseId,
                //  warehouseId: po.warehouseId,
              },
            },
            create: {
              itemId: line.itemId,
              warehouseId: po.warehouseId,
              quantity: recv.receivedQty,
              organizationId: orgId,
            },
            update: { quantity: { increment: recv.receivedQty } },
          });

          // 3. Create StockMovement
          await tx.stockMovement.create({
            data: {
              type: 'PURCHASE_INBOUND',
              quantity: recv.receivedQty,
              itemId: line.itemId,
              toWarehouseId: po.warehouseId,
              purchaseLineId: recv.lineId,
              userId: ctx.user.id,
              organizationId: orgId,
              notes: `Received from PO ${po.serial}`,
            },
          });
        }

        // 4. Recompute PO status based on updated lines
        const freshLines = await tx.purchaseLine.findMany({
          where: { purchaseOrderId: input.id },
          select: { quantity: true, receivedQty: true },
        });

        const allReceived = freshLines.every((l) => l.receivedQty >= l.quantity);
        const anyReceived = freshLines.some((l) => new Prisma.Decimal(l.receivedQty).gt(0));

        const newStatus = allReceived ? 'RECEIVED' : anyReceived ? 'PARTIAL_RECEIVED' : po.status;

        return tx.purchaseOrder.update({
          where: { id: input.id },
          data: { status: newStatus },
        });
      });
    }),

  // -------------------------------------------------------------------------
  // Cancel PO
  // -------------------------------------------------------------------------
  cancel: adminProcedure
    .input(z.object({ id: z.string(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);

      const po = await ctx.prisma.purchaseOrder.findUnique({
        where: { id: input.id },
        select: { organizationId: true, status: true },
      });
      if (!po) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'PO is not exist',
        });
      }
      assertOwnership(po, orgId, 'PurchaseOrder');

      if (po.status === 'RECEIVED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot cancel a fully received PO',
        });
      }

      return ctx.prisma.purchaseOrder.update({
        where: { id: input.id },
        data: { status: 'CANCELLED', notes: input.reason },
      });
    }),

  // =========================================================================
  // PURCHASE PAYMENTS
  // =========================================================================

  addPayment: protectedProcedure
    .input(
      z.object({
        purchaseOrderId: z.string(),
        amount: z.number().int().min(1),
        method: z.enum(['CASH', 'TRANSFER', 'CARD', 'CHEQUE', 'OTHER']),
        date: z.coerce.date().optional(),
        reference: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = requireOrgId(ctx.organizationId);
      const { purchaseOrderId, amount, ...rest } = input;

      const po = await ctx.prisma.purchaseOrder.findUnique({
        where: { id: purchaseOrderId },
        select: { organizationId: true, status: true, total: true, amountOwed: true },
      });
      if (!po) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'PO is not exists',
        });
      }

      assertOwnership(po, orgId, 'PurchaseOrder');

      if (po.status === 'CANCELLED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot add payment to cancelled PO' });
      }

      const bigAmount = BigInt(amount);
      if (bigAmount > po.amountOwed) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Payment amount exceeds outstanding balance`,
        });
      }

      return ctx.prisma.$transaction(async (tx) => {
        await tx.purchasePayment.create({
          data: {
            purchaseOrderId,
            amount: bigAmount,
            date: rest.date ?? new Date(),
            method: rest.method,
            reference: rest.reference,
            notes: rest.notes,
            organizationId: orgId,
          },
        });

        await syncPOPaymentStatus(tx, purchaseOrderId);
      });
    }),
});
