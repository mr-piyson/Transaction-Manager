import type { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { ConflictError, NotFoundError } from "@/lib/error";
import { assertCan, orgProcedure, router } from "@/lib/trpc/context";
import { writeAuditLog } from "../shared/audit.service";

type TransactionClient = Prisma.TransactionClient | PrismaClient;

// ---------------------------------------------------------------------------
// Default system reasons — lazily seeded per organization
// ---------------------------------------------------------------------------

export const DEFAULT_ADJUSTMENT_REASONS = [
  {
    name: "Damaged goods",
    direction: "DECREASE",
    movementType: "DAMAGE",
    isDefault: true,
  },
  {
    name: "Lost / missing",
    direction: "DECREASE",
    movementType: "ADJUSTMENT_DOWN",
    isDefault: false,
  },
  {
    name: "Expired",
    direction: "DECREASE",
    movementType: "ADJUSTMENT_DOWN",
    isDefault: false,
  },
  {
    name: "Theft / shrinkage",
    direction: "DECREASE",
    movementType: "ADJUSTMENT_DOWN",
    isDefault: false,
  },
  {
    name: "Count correction",
    direction: "DECREASE",
    movementType: "ADJUSTMENT_DOWN",
    isDefault: false,
  },
  {
    name: "Found stock",
    direction: "INCREASE",
    movementType: "ADJUSTMENT_UP",
    isDefault: false,
  },
  {
    name: "Count surplus",
    direction: "INCREASE",
    movementType: "ADJUSTMENT_UP",
    isDefault: false,
  },
] as const;

/**
 * Ensure an organization has its default adjustment reason set.
 * Idempotent — creates missing system reasons by unique name.
 */
export async function ensureDefaultAdjustmentReasons(
  tx: TransactionClient,
  organizationId: string,
): Promise<void> {
  const existing = await tx.stockAdjustmentReason.findMany({
    where: { organizationId },
    select: { name: true },
  });
  const names = new Set(existing.map((r) => r.name));

  const missing = DEFAULT_ADJUSTMENT_REASONS.filter((r) => !names.has(r.name));
  if (missing.length === 0) return;

  await tx.stockAdjustmentReason.createMany({
    data: missing.map((r) => ({
      name: r.name,
      direction: r.direction,
      movementType: r.movementType,
      isSystem: true,
      isDefault: r.isDefault,
      organizationId,
    })),
    skipDuplicates: true,
  });
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const ADJUSTABLE_BY_DIRECTION: Record<
  "INCREASE" | "DECREASE",
  readonly string[]
> = {
  INCREASE: ["ADJUSTMENT_UP"],
  DECREASE: ["ADJUSTMENT_DOWN", "DAMAGE"],
};

const reasonBaseSchema = z.object({
  name: z.string().min(1).max(100),
  direction: z.enum(["INCREASE", "DECREASE"]),
  movementType: z.enum(["ADJUSTMENT_UP", "ADJUSTMENT_DOWN", "DAMAGE"]),
  glAccountCode: z.string().max(20).nullable().optional(),
  isActive: z.boolean().default(true),
});

const createReasonSchema = reasonBaseSchema;

const updateReasonSchema = reasonBaseSchema.partial().extend({
  id: z.string(),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const stockReasonsRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    assertCan(ctx.ability, "stock:read", "Stock");

    const orgId = ctx.user.organizationId;
    await ensureDefaultAdjustmentReasons(ctx.db, orgId);

    return ctx.db.stockAdjustmentReason.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: [{ direction: "asc" }, { name: "asc" }],
    });
  }),

  byId: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      assertCan(ctx.ability, "stock:read", "Stock");
      const reason = await ctx.db.stockAdjustmentReason.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.user.organizationId,
          deletedAt: null,
        },
      });
      if (!reason) throw new NotFoundError("StockAdjustmentReason", input.id);
      return reason;
    }),

  create: orgProcedure
    .input(createReasonSchema)
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.ability, "stock:adjust", "Stock");
      const orgId = ctx.user.organizationId;

      if (
        !ADJUSTABLE_BY_DIRECTION[input.direction].includes(input.movementType)
      ) {
        throw new ConflictError(
          `Movement type "${input.movementType}" does not match direction "${input.direction}".`,
        );
      }

      const existing = await ctx.db.stockAdjustmentReason.findFirst({
        where: { name: input.name, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      if (existing)
        throw new ConflictError(`Reason "${input.name}" already exists.`);

      return ctx.db.$transaction(async (tx) => {
        const created = await tx.stockAdjustmentReason.create({
          data: {
            ...input,
            glAccountCode: input.glAccountCode || null,
            organizationId: orgId,
          },
        });

        await writeAuditLog(
          {
            entityType: "StockAdjustmentReason",
            entityId: created.id,
            action: "CREATE",
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
    .input(updateReasonSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      assertCan(ctx.ability, "stock:adjust", "Stock");
      const orgId = ctx.user.organizationId;

      const existing = await ctx.db.stockAdjustmentReason.findFirst({
        where: { id, organizationId: orgId, deletedAt: null },
      });
      if (!existing) throw new NotFoundError("StockAdjustmentReason", id);

      // System reasons keep their seeded direction/type
      if (existing.isSystem && (data.direction || data.movementType)) {
        throw new ConflictError(
          "System reasons cannot change direction or movement type.",
        );
      }

      const direction = data.direction ?? existing.direction;
      const movementType = data.movementType ?? existing.movementType;
      if (!ADJUSTABLE_BY_DIRECTION[direction].includes(movementType)) {
        throw new ConflictError(
          `Movement type "${movementType}" does not match direction "${direction}".`,
        );
      }

      if (data.name && data.name !== existing.name) {
        const conflict = await ctx.db.stockAdjustmentReason.findFirst({
          where: {
            name: data.name,
            organizationId: orgId,
            deletedAt: null,
            NOT: { id },
          },
          select: { id: true },
        });
        if (conflict)
          throw new ConflictError(`Reason "${data.name}" already exists.`);
      }

      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.stockAdjustmentReason.update({
          where: { id },
          data: {
            ...data,
            ...(data.glAccountCode !== undefined
              ? { glAccountCode: data.glAccountCode || null }
              : {}),
          },
        });

        await writeAuditLog(
          {
            entityType: "StockAdjustmentReason",
            entityId: id,
            action: "UPDATE",
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
      assertCan(ctx.ability, "stock:adjust", "Stock");

      const existing = await ctx.db.stockAdjustmentReason.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.user.organizationId,
          deletedAt: null,
        },
        include: { movements: { take: 1, select: { id: true } } },
      });
      if (!existing) throw new NotFoundError("StockAdjustmentReason", input.id);
      if (existing.isSystem) {
        throw new ConflictError("System reasons cannot be deleted.");
      }
      if (existing.movements.length > 0) {
        throw new ConflictError(
          "Cannot delete a reason that has recorded adjustments.",
        );
      }

      return ctx.db.$transaction(async (tx) => {
        await tx.stockAdjustmentReason.update({
          where: { id: input.id },
          data: { deletedAt: new Date(), isActive: false },
        });

        await writeAuditLog(
          {
            entityType: "StockAdjustmentReason",
            entityId: input.id,
            action: "DELETE",
            organizationId: ctx.user.organizationId,
            userId: ctx.user.id,
            ipAddress: ctx.ipAddress,
          },
          tx,
        );

        return { success: true };
      });
    }),
});
