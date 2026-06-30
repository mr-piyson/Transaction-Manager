import { z } from 'zod';
import { calculateInvoiceTotals } from '@/lib/calculator';
import { NotFoundError, StaleDataError, UnprocessableError } from '@/lib/error';
import { generateSerial } from '@/lib/sequences';
import { assertCan, orgProcedure, router } from '@/lib/trpc/context';
import {
  currencyCodeSchema,
  offsetPaginationSchema,
  paginatedResponse,
  sortOrderSchema,
  toPrismaPage,
} from '@/lib/validations';
import { writeAuditLog } from './audit.service';
import {
  createNotification,
  NOTIFICATION_SETTINGS_KEYS,
  NOTIFICATION_TYPES,
} from './notifications.shared';

const purchaseLineInputSchema = z.object({
  itemId: z.string(),
  description: z.string().max(1000).optional(),
  quantity: z.number().positive(),
  unitCost: z.number().min(0),
  taxAmt: z.number().min(0).default(0),
  taxRateId: z.string().optional(),
  taxRateSnapshot: z.number().min(0).optional(),
  taxRateName: z.string().optional(),
});

const purchaseOrderBaseSchema = z.object({
  date: z.coerce.date().default(() => new Date()),
  expectedDate: z.coerce.date().optional(),
  supplierId: z.string(),
  warehouseId: z.string(),
  departmentId: z.string().optional(),
  currency: currencyCodeSchema.default('BHD'),
  exchangeRate: z.number().positive().default(1),
  notes: z.string().max(5000).optional(),
  internalNotes: z.string().max(5000).optional(),
  lines: z.array(purchaseLineInputSchema).min(1, 'At least one line is required'),
});

const createPurchaseOrderSchema = purchaseOrderBaseSchema;

const updatePurchaseOrderSchema = purchaseOrderBaseSchema.partial().extend({
  id: z.string(),
  version: z.number().int(),
  lines: z.array(purchaseLineInputSchema).min(1).optional(),
});

const listPurchaseOrdersSchema = z.object({
  ...offsetPaginationSchema.shape,
  search: z.string().optional(),
  status: z
    .enum([
      'DRAFT',
      'PENDING_APPROVAL',
      'APPROVED',
      'ORDERED',
      'PARTIAL_RECEIVED',
      'RECEIVED',
      'INVOICED',
      'CANCELLED',
      'CLOSED',
    ])
    .optional(),
  supplierId: z.string().optional(),
  sortBy: z.enum(['date', 'serial', 'total', 'createdAt', 'expectedDate']).default('date'),
  sortOrder: sortOrderSchema,
});

export const purchaseOrdersRouter = router({
  list: orgProcedure.input(listPurchaseOrdersSchema).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'po:read', 'PurchaseOrder');

    const { search, status, supplierId, sortBy, sortOrder, ...pagination } = input;
    const { skip, take } = toPrismaPage(pagination);
    const orgId = ctx.user.organizationId;

    const where: Record<string, unknown> = {
      organizationId: orgId,
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(supplierId ? { supplierId } : {}),
      ...(search
        ? {
            OR: [
              { serial: { contains: search, mode: 'insensitive' as const } },
              { supplier: { name: { contains: search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };

    const [orders, total] = await ctx.db.$transaction([
      ctx.db.purchaseOrder.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          serial: true,
          status: true,
          version: true,
          date: true,
          expectedDate: true,
          total: true,
          amountOwed: true,
          currency: true,
          supplier: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true } },
          createdAt: true,
          _count: { select: { lines: true, payments: true } },
        },
      }),
      ctx.db.purchaseOrder.count({ where }),
    ]);

    return paginatedResponse(orders, total, pagination);
  }),

  byId: orgProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'po:read', 'PurchaseOrder');

    const order = await ctx.db.purchaseOrder.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId, deletedAt: null },
      include: {
        supplier: { select: { id: true, name: true, email: true, phone: true } },
        warehouse: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        lines: {
          orderBy: { id: 'asc' },
          include: {
            item: { select: { id: true, sku: true, name: true, unit: true } },
            taxRate: { select: { id: true, name: true, rate: true } },
          },
        },
        payments: { orderBy: { date: 'desc' } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!order) throw new NotFoundError('PurchaseOrder', input.id);
    return order;
  }),

  stockMovements: orgProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'stock:read', 'StockMovement');
    return ctx.db.stockMovement.findMany({
      where: {
        purchaseLine: { purchaseOrderId: input.id },
        organizationId: ctx.user.organizationId,
      },
      include: {
        item: { select: { id: true, sku: true, name: true } },
        toWarehouse: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }),

  create: orgProcedure.input(createPurchaseOrderSchema).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'po:create', 'PurchaseOrder');

    const orgId = ctx.user.organizationId;
    const { lines: lineInputs, ...orderData } = input;

    const supplier = await ctx.db.supplier.findFirst({
      where: { id: orderData.supplierId, organizationId: orgId, deletedAt: null, isActive: true },
      select: { id: true },
    });
    if (!supplier) throw new NotFoundError('Supplier', orderData.supplierId);

    const warehouse = await ctx.db.warehouse.findFirst({
      where: { id: orderData.warehouseId, organizationId: orgId, deletedAt: null, isActive: true },
      select: { id: true },
    });
    if (!warehouse) throw new NotFoundError('Warehouse', orderData.warehouseId);

    const enrichedLines = await Promise.all(
      lineInputs.map(async (line) => {
        const item = await ctx.db.item.findFirst({
          where: { id: line.itemId, organizationId: orgId, deletedAt: null },
          select: { taxRate: { select: { rate: true, name: true, id: true } } },
        });
        if (!item) throw new NotFoundError('Item', line.itemId);
        return {
          ...line,
          taxRateId: line.taxRateId ?? item.taxRate?.id,
          taxRateSnapshot: line.taxRateSnapshot ?? Number(item.taxRate?.rate ?? 0),
          taxRateName: line.taxRateName ?? item.taxRate?.name,
        };
      }),
    );

    const totals = calculateInvoiceTotals(
      enrichedLines.map((l) => ({
        quantity: l.quantity,
        unitPrice: l.unitCost,
        taxRateSnapshot: l.taxRateSnapshot,
      })),
    );

    const order = await ctx.db.$transaction(async (tx) => {
      const serial = await generateSerial({
        db: tx,
        organizationId: orgId,
        prefix: 'PO',
      });

      const created = await tx.purchaseOrder.create({
        data: {
          serial,
          ...orderData,
          subtotal: totals.subtotal,
          taxTotal: totals.taxTotal,
          total: totals.total,
          amountOwed: totals.total,
          organizationId: orgId,
          createdById: ctx.user.id,
          lines: {
            create: enrichedLines.map((line, idx) => ({
              itemId: line.itemId,
              description: line.description,
              quantity: totals.lines[idx]?.quantity ?? line.quantity,
              unitCost: line.unitCost,
              taxAmt: totals.lines[idx]?.taxAmt ?? 0,
              total: totals.lines[idx]?.total ?? 0,
              taxRateId: line.taxRateId,
              taxRateSnapshot: line.taxRateSnapshot,
              taxRateName: line.taxRateName,
            })),
          },
        },
        include: { lines: true },
      });

      await writeAuditLog(
        {
          entityType: 'PurchaseOrder',
          entityId: created.id,
          action: 'CREATE',
          diff: { serial: { before: null, after: serial } },
          organizationId: orgId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
        },
        tx,
      );

      return created;
    });

    return order;
  }),

  update: orgProcedure.input(updatePurchaseOrderSchema).mutation(async ({ ctx, input }) => {
    const { id, version, lines: lineInputs, ...data } = input;
    const orgId = ctx.user.organizationId;

    const existing = await ctx.db.purchaseOrder.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      select: { id: true, status: true, version: true },
    });
    if (!existing) throw new NotFoundError('PurchaseOrder', id);
    assertCan(ctx.ability, 'po:update', 'PurchaseOrder', existing as Record<string, unknown>);
    if (!['DRAFT', 'PENDING_APPROVAL'].includes(existing.status)) {
      throw new UnprocessableError(`PO in status "${existing.status}" cannot be edited.`);
    }
    if (existing.version !== version) throw new StaleDataError('PurchaseOrder');

    return ctx.db.$transaction(async (tx) => {
      let totalsData = {};

      if (lineInputs && lineInputs.length > 0) {
        const enrichedLines = await Promise.all(
          lineInputs.map(async (line) => {
            const item = await tx.item.findFirst({
              where: { id: line.itemId, organizationId: orgId },
              select: { taxRate: { select: { rate: true, name: true, id: true } } },
            });
            return {
              ...line,
              taxRateId: line.taxRateId ?? item?.taxRate?.id,
              taxRateSnapshot: line.taxRateSnapshot ?? Number(item?.taxRate?.rate ?? 0),
              taxRateName: line.taxRateName ?? item?.taxRate?.name,
            };
          }),
        );

        const totals = calculateInvoiceTotals(
          enrichedLines.map((l) => ({
            quantity: l.quantity,
            unitPrice: l.unitCost,
            taxRateSnapshot: l.taxRateSnapshot,
          })),
        );

        await tx.purchaseLine.deleteMany({ where: { purchaseOrderId: id } });
        await tx.purchaseLine.createMany({
          data: enrichedLines.map((line, idx) => ({
            purchaseOrderId: id,
            itemId: line.itemId,
            description: line.description,
            quantity: totals.lines[idx]?.quantity ?? line.quantity,
            unitCost: line.unitCost,
            taxAmt: totals.lines[idx]?.taxAmt ?? 0,
            total: totals.lines[idx]?.total ?? 0,
            taxRateId: line.taxRateId,
            taxRateSnapshot: line.taxRateSnapshot,
            taxRateName: line.taxRateName,
          })),
        });

        totalsData = {
          subtotal: totals.subtotal,
          taxTotal: totals.taxTotal,
          total: totals.total,
          amountOwed: totals.total,
        };
      }

      const result = await tx.purchaseOrder.update({
        where: { id },
        data: { ...data, ...totalsData, version: { increment: 1 }, updatedById: ctx.user.id },
      });

      await writeAuditLog(
        {
          entityType: 'PurchaseOrder',
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
  }),

  submitForApproval: orgProcedure
    .input(z.object({ id: z.string(), version: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;

      const po = await ctx.db.purchaseOrder.findFirst({
        where: { id: input.id, organizationId: orgId, deletedAt: null },
        select: { id: true, status: true, version: true, serial: true },
      });
      if (!po) throw new NotFoundError('PurchaseOrder', input.id);
      assertCan(ctx.ability, 'po:update', 'PurchaseOrder', po as Record<string, unknown>);
      if (po.status !== 'DRAFT')
        throw new UnprocessableError(`Only DRAFT POs can be submitted. Current: ${po.status}`);
      if (po.version !== input.version) throw new StaleDataError('PurchaseOrder');

      const notifApprovalReq = await ctx.db.organizationSetting.findFirst({
        where: {
          organizationId: orgId,
          key: NOTIFICATION_SETTINGS_KEYS[NOTIFICATION_TYPES.APPROVAL_REQUEST],
        },
        select: { value: true },
      });

      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.purchaseOrder.update({
          where: { id: input.id },
          data: {
            status: 'PENDING_APPROVAL',
            approvalStatus: 'PENDING',
            version: { increment: 1 },
            updatedById: ctx.user.id,
          },
        });

        await createNotification(tx, notifApprovalReq?.value === 'true', {
          title: 'PO Submitted for Approval',
          body: `${po.serial} has been submitted for approval.`,
          type: NOTIFICATION_TYPES.APPROVAL_REQUEST,
          entityType: 'PurchaseOrder',
          entityId: input.id,
          userId: ctx.user.id,
          organizationId: orgId,
        });

        await writeAuditLog(
          {
            entityType: 'PurchaseOrder',
            entityId: input.id,
            action: 'STATUS_CHANGE',
            diff: { status: { before: po.status, after: 'PENDING_APPROVAL' } },
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return updated;
      });
    }),

  approve: orgProcedure
    .input(z.object({ id: z.string(), version: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;

      const po = await ctx.db.purchaseOrder.findFirst({
        where: { id: input.id, organizationId: orgId, deletedAt: null },
        select: { id: true, status: true, version: true, serial: true, createdById: true },
      });
      if (!po) throw new NotFoundError('PurchaseOrder', input.id);
      assertCan(ctx.ability, 'po:approve', 'PurchaseOrder', po as Record<string, unknown>);
      if (po.status !== 'PENDING_APPROVAL')
        throw new UnprocessableError(
          `PO must be PENDING_APPROVAL to approve. Current: ${po.status}`,
        );
      if (po.version !== input.version) throw new StaleDataError('PurchaseOrder');

      const notifApproved = await ctx.db.organizationSetting.findFirst({
        where: {
          organizationId: orgId,
          key: NOTIFICATION_SETTINGS_KEYS[NOTIFICATION_TYPES.PO_APPROVED],
        },
        select: { value: true },
      });

      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.purchaseOrder.update({
          where: { id: input.id },
          data: {
            status: 'APPROVED',
            approvalStatus: 'APPROVED',
            version: { increment: 1 },
            updatedById: ctx.user.id,
          },
        });

        await createNotification(tx, notifApproved?.value === 'true', {
          title: 'PO Approved',
          body: `${po.serial} has been approved.`,
          type: NOTIFICATION_TYPES.PO_APPROVED,
          entityType: 'PurchaseOrder',
          entityId: input.id,
          userId: po.createdById,
          organizationId: orgId,
        });

        await writeAuditLog(
          {
            entityType: 'PurchaseOrder',
            entityId: input.id,
            action: 'STATUS_CHANGE',
            diff: { status: { before: po.status, after: 'APPROVED' } },
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return updated;
      });
    }),

  reject: orgProcedure
    .input(z.object({ id: z.string(), version: z.number().int(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;

      const po = await ctx.db.purchaseOrder.findFirst({
        where: { id: input.id, organizationId: orgId, deletedAt: null },
        select: { id: true, status: true, version: true, serial: true, createdById: true },
      });
      if (!po) throw new NotFoundError('PurchaseOrder', input.id);
      assertCan(ctx.ability, 'po:approve', 'PurchaseOrder', po as Record<string, unknown>);
      if (po.status !== 'PENDING_APPROVAL')
        throw new UnprocessableError(
          `PO must be PENDING_APPROVAL to reject. Current: ${po.status}`,
        );
      if (po.version !== input.version) throw new StaleDataError('PurchaseOrder');

      const notifRejected = await ctx.db.organizationSetting.findFirst({
        where: {
          organizationId: orgId,
          key: NOTIFICATION_SETTINGS_KEYS[NOTIFICATION_TYPES.PO_REJECTED],
        },
        select: { value: true },
      });

      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.purchaseOrder.update({
          where: { id: input.id },
          data: {
            status: 'DRAFT',
            approvalStatus: 'REJECTED',
            version: { increment: 1 },
            updatedById: ctx.user.id,
          },
        });

        await createNotification(tx, notifRejected?.value === 'true', {
          title: 'PO Rejected',
          body: `${po.serial} was rejected.${input.reason ? ` Reason: ${input.reason}` : ''}`,
          type: NOTIFICATION_TYPES.PO_REJECTED,
          entityType: 'PurchaseOrder',
          entityId: input.id,
          userId: po.createdById,
          organizationId: orgId,
        });

        await writeAuditLog(
          {
            entityType: 'PurchaseOrder',
            entityId: input.id,
            action: 'STATUS_CHANGE',
            diff: {
              status: { before: po.status, after: 'DRAFT' },
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

  order: orgProcedure
    .input(z.object({ id: z.string(), version: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;

      const po = await ctx.db.purchaseOrder.findFirst({
        where: { id: input.id, organizationId: orgId, deletedAt: null },
      });
      if (!po) throw new NotFoundError('PurchaseOrder', input.id);
      assertCan(ctx.ability, 'po:approve', 'PurchaseOrder', po as Record<string, unknown>);
      if (po.status !== 'APPROVED')
        throw new UnprocessableError(`PO must be APPROVED before ordering. Current: ${po.status}`);
      if (po.version !== input.version) throw new StaleDataError('PurchaseOrder');

      const notifOrdered = await ctx.db.organizationSetting.findFirst({
        where: {
          organizationId: orgId,
          key: NOTIFICATION_SETTINGS_KEYS[NOTIFICATION_TYPES.PO_ORDERED],
        },
        select: { value: true },
      });

      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.purchaseOrder.update({
          where: { id: input.id },
          data: { status: 'ORDERED', version: { increment: 1 }, updatedById: ctx.user.id },
        });

        await createNotification(tx, notifOrdered?.value === 'true', {
          title: 'PO Ordered',
          body: `${po.serial} has been ordered.`,
          type: NOTIFICATION_TYPES.PO_ORDERED,
          entityType: 'PurchaseOrder',
          entityId: input.id,
          userId: ctx.user.id,
          organizationId: orgId,
        });

        await writeAuditLog(
          {
            entityType: 'PurchaseOrder',
            entityId: input.id,
            action: 'STATUS_CHANGE',
            diff: { status: { before: po.status, after: 'ORDERED' } },
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return updated;
      });
    }),

  receive: orgProcedure
    .input(z.object({ id: z.string(), version: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;

      const po = await ctx.db.purchaseOrder.findFirst({
        where: { id: input.id, organizationId: orgId, deletedAt: null },
        include: { lines: true },
      });
      if (!po) throw new NotFoundError('PurchaseOrder', input.id);
      assertCan(ctx.ability, 'po:receive', 'PurchaseOrder', po as Record<string, unknown>);
      if (!['ORDERED', 'PARTIAL_RECEIVED'].includes(po.status))
        throw new UnprocessableError(`PO must be ORDERED to receive.`);
      if (po.version !== input.version) throw new StaleDataError('PurchaseOrder');

      const notifReceived = await ctx.db.organizationSetting.findFirst({
        where: {
          organizationId: orgId,
          key: NOTIFICATION_SETTINGS_KEYS[NOTIFICATION_TYPES.PO_RECEIVED],
        },
        select: { value: true },
      });

      return ctx.db.$transaction(async (tx) => {
        let allFullyReceived = true;

        for (const line of po.lines) {
          const orderedQty = Number(line.quantity);
          const alreadyReceived = Number(line.receivedQty);
          const toReceive = orderedQty - alreadyReceived;

          if (toReceive <= 0) continue;

          await tx.purchaseLine.update({
            where: { id: line.id },
            data: { receivedQty: orderedQty },
          });

          await tx.stockMovement.create({
            data: {
              type: 'PURCHASE_INBOUND',
              quantity: toReceive,
              itemId: line.itemId,
              purchaseLineId: line.id,
              toWarehouseId: po.warehouseId,
              userId: ctx.user.id,
              organizationId: orgId,
            },
          });

          await tx.stock.upsert({
            where: { itemId_warehouseId: { itemId: line.itemId, warehouseId: po.warehouseId } },
            create: {
              itemId: line.itemId,
              warehouseId: po.warehouseId,
              organizationId: orgId,
              quantity: toReceive,
            },
            update: { quantity: { increment: toReceive }, version: { increment: 1 } },
          });

          if (alreadyReceived + toReceive < orderedQty) allFullyReceived = false;
        }

        const newStatus = allFullyReceived ? 'RECEIVED' : 'PARTIAL_RECEIVED';

        const updated = await tx.purchaseOrder.update({
          where: { id: input.id },
          data: {
            status: newStatus,
            receivedAt: new Date(),
            version: { increment: 1 },
            updatedById: ctx.user.id,
          },
        });

        // Create expense record for the cost of received items
        const receivedCost = po.lines.reduce((sum, line) => {
          const orderedQty = Number(line.quantity);
          const alreadyReceived = Number(line.receivedQty);
          const toReceive = orderedQty - alreadyReceived;
          if (toReceive <= 0) return sum;
          return sum + Number(line.unitCost) * toReceive;
        }, 0);

        if (receivedCost > 0) {
          await tx.expense.create({
            data: {
              description: `PO #${po.serial} — Inventory received`,
              amount: receivedCost,
              date: new Date(),
              reference: po.serial,
              organizationId: orgId,
              createdById: ctx.user.id,
            },
          });
        }

        await writeAuditLog(
          {
            entityType: 'PurchaseOrder',
            entityId: input.id,
            action: 'STATUS_CHANGE',
            diff: { status: { before: po.status, after: newStatus } },
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        const statusLabel = newStatus === 'RECEIVED' ? 'fully received' : 'partially received';
        await createNotification(tx, notifReceived?.value === 'true', {
          title: 'PO Received',
          body: `${po.serial} has been ${statusLabel}.`,
          type: NOTIFICATION_TYPES.PO_RECEIVED,
          entityType: 'PurchaseOrder',
          entityId: input.id,
          userId: ctx.user.id,
          organizationId: orgId,
        });

        return updated;
      });
    }),

  cancel: orgProcedure
    .input(z.object({ id: z.string(), version: z.number().int(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;

      const po = await ctx.db.purchaseOrder.findFirst({
        where: { id: input.id, organizationId: orgId, deletedAt: null },
      });
      if (!po) throw new NotFoundError('PurchaseOrder', input.id);
      assertCan(ctx.ability, 'po:delete', 'PurchaseOrder', po as Record<string, unknown>);
      if (['CANCELLED', 'CLOSED', 'RECEIVED', 'INVOICED'].includes(po.status)) {
        throw new UnprocessableError(`PO in status "${po.status}" cannot be cancelled.`);
      }
      if (po.version !== input.version) throw new StaleDataError('PurchaseOrder');

      const notifCancelled = await ctx.db.organizationSetting.findFirst({
        where: {
          organizationId: orgId,
          key: NOTIFICATION_SETTINGS_KEYS[NOTIFICATION_TYPES.PO_CANCELLED],
        },
        select: { value: true },
      });

      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.purchaseOrder.update({
          where: { id: input.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            version: { increment: 1 },
            updatedById: ctx.user.id,
          },
        });

        await createNotification(tx, notifCancelled?.value === 'true', {
          title: 'PO Cancelled',
          body: `${po.serial} has been cancelled.${input.reason ? ` Reason: ${input.reason}` : ''}`,
          type: NOTIFICATION_TYPES.PO_CANCELLED,
          entityType: 'PurchaseOrder',
          entityId: input.id,
          userId: ctx.user.id,
          organizationId: orgId,
        });

        await writeAuditLog(
          {
            entityType: 'PurchaseOrder',
            entityId: input.id,
            action: 'STATUS_CHANGE',
            diff: { status: { before: po.status, after: 'CANCELLED' } },
            organizationId: orgId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return updated;
      });
    }),

  delete: orgProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.purchaseOrder.findFirst({
      where: { id: input.id, organizationId: ctx.user.organizationId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!existing) throw new NotFoundError('PurchaseOrder', input.id);
    assertCan(ctx.ability, 'po:delete', 'PurchaseOrder', existing as Record<string, unknown>);
    if (existing.status !== 'DRAFT') throw new UnprocessableError('Only DRAFT POs can be deleted.');

    await ctx.db.$transaction(async (tx) => {
      await tx.purchaseOrder.update({
        where: { id: input.id },
        data: { deletedAt: new Date(), status: 'CANCELLED' },
      });
      await writeAuditLog(
        {
          entityType: 'PurchaseOrder',
          entityId: input.id,
          action: 'DELETE',
          organizationId: ctx.user.organizationId,
          userId: ctx.user.id,
          ipAddress: ctx.ipAddress,
        },
        tx,
      );
    });

    return { success: true };
  }),
});
