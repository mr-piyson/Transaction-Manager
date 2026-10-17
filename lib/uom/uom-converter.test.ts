import { describe, expect, test } from "bun:test";
import { Prisma } from "@prisma/client";
import { UnprocessableError } from "@/lib/error";
import {
  assertFactor,
  baseUnitAmount,
  convertToBase,
  convertUnitPrice,
  deriveBaseUnitCost,
  formatQty,
  formatQtyWithUom,
  fromBase,
  resolveUomFactor,
  roundCost,
  roundQty,
} from "./uom-converter";

// Ethernet cable: Base Unit = Meter, Box = 305 m, Spool = 100 m.
const cable = {
  unitId: "unit_meter",
  uoms: [
    { unitId: "unit_box", factor: 305 },
    { unitId: "unit_spool", factor: 100, isActive: false },
    { unitId: "unit_retired", factor: 50, deletedAt: new Date() },
  ],
};

describe("convertToBase", () => {
  test("1 Box → 305 m", () => {
    expect(convertToBase(1, 305).toString()).toBe("305");
  });

  test("fractional quantity: 0.5 Box → 152.5 m", () => {
    expect(convertToBase(0.5, 305).toString()).toBe("152.5");
  });

  test("negative quantities are allowed (signed movements)", () => {
    expect(convertToBase(-3, 305).toString()).toBe("-915");
  });

  test("base unit passthrough (factor 1)", () => {
    expect(convertToBase("12.3456", 1).toString()).toBe("12.3456");
  });

  test("big values", () => {
    expect(convertToBase(99999999, 305).toString()).toBe("30499999695");
    expect(convertToBase("0.0001", 305).toString()).toBe("0.0305");
  });

  test("rounds to 4 dp (storage precision)", () => {
    expect(convertToBase(1, 3).toString()).toBe("3");
    expect(convertToBase(0.00015, 1).toString()).toBe("0.0002");
  });

  test("accepts Decimal input", () => {
    expect(convertToBase(new Prisma.Decimal(2), 305).toString()).toBe("610");
  });
});

describe("fromBase", () => {
  test("610 m → 2 Box", () => {
    expect(fromBase(610, 305).toString()).toBe("2");
  });

  test("3.5 m → 0.0115 Box (rounded to 4 dp)", () => {
    expect(fromBase(3.5, 305).toString()).toBe("0.0115");
  });
});

describe("baseUnitAmount", () => {
  test("152.500/Box with 305 m/Box → 0.500000 per m", () => {
    expect(baseUnitAmount(152.5, 305).toString()).toBe("0.5");
  });

  test("100 ÷ 3 rounds to 6 dp without leaking value", () => {
    expect(baseUnitAmount(100, 3).toString()).toBe("33.333333");
  });

  test("rounds up correctly at the 6th decimal", () => {
    expect(baseUnitAmount(1, 3).toString()).toBe("0.333333");
    expect(roundCost("0.3333335").toString()).toBe("0.333334");
  });
});

describe("convertUnitPrice", () => {
  test("price per Box → per m", () => {
    expect(convertUnitPrice(152.5, 305, 1).toString()).toBe("0.5");
  });

  test("price per m → per Box (round-trip)", () => {
    expect(convertUnitPrice(0.9, 1, 305).toString()).toBe("274.5");
  });

  test("same unit is a no-op", () => {
    expect(convertUnitPrice(12.345678, 1, 1).toString()).toBe("12.345678");
  });
});

describe("deriveBaseUnitCost", () => {
  test("line total ÷ base quantity", () => {
    expect(deriveBaseUnitCost(305, 610).toString()).toBe("0.5");
  });

  test("non-terminating division rounds to 6 dp", () => {
    expect(deriveBaseUnitCost(100, 3).toString()).toBe("33.333333");
  });

  test("zero or negative base quantity throws", () => {
    expect(() => deriveBaseUnitCost(100, 0)).toThrow(UnprocessableError);
    expect(() => deriveBaseUnitCost(100, -1)).toThrow(UnprocessableError);
  });
});

describe("assertFactor", () => {
  test("positive factor passes", () => {
    expect(assertFactor(305).toString()).toBe("305");
    expect(assertFactor("0.001").toString()).toBe("0.001");
  });

  test("zero factor rejected", () => {
    expect(() => assertFactor(0)).toThrow(UnprocessableError);
    expect(() => assertFactor("0")).toThrow(/greater than 0/);
  });

  test("negative factor rejected", () => {
    expect(() => assertFactor(-305)).toThrow(UnprocessableError);
  });

  test("non-numeric factor rejected", () => {
    expect(() => assertFactor(Number.NaN)).toThrow(UnprocessableError);
    expect(() => assertFactor(Number.POSITIVE_INFINITY)).toThrow(
      UnprocessableError,
    );
  });
});

describe("roundQty / roundCost", () => {
  test("quantities round to 4 dp, costs to 6 dp", () => {
    expect(roundQty("1.00004").toString()).toBe("1");
    expect(roundQty("1.00005").toString()).toBe("1.0001");
    expect(roundCost("1.0000004").toString()).toBe("1");
    expect(roundCost("1.0000005").toString()).toBe("1.000001");
  });
});

describe("resolveUomFactor", () => {
  test("base unit → 1", () => {
    expect(resolveUomFactor(cable, "unit_meter").toString()).toBe("1");
  });

  test("missing unitId → 1 (implicit base)", () => {
    expect(resolveUomFactor(cable, null).toString()).toBe("1");
    expect(resolveUomFactor(cable, undefined).toString()).toBe("1");
  });

  test("configured alternative unit → its factor", () => {
    expect(resolveUomFactor(cable, "unit_box").toString()).toBe("305");
  });

  test("unknown unit throws", () => {
    expect(() => resolveUomFactor(cable, "unit_kg")).toThrow(
      UnprocessableError,
    );
    expect(() => resolveUomFactor(cable, "unit_kg")).toThrow(
      /not configured for this item/,
    );
  });

  test("deactivated or soft-deleted unit throws", () => {
    expect(() => resolveUomFactor(cable, "unit_spool")).toThrow(
      UnprocessableError,
    );
    expect(() => resolveUomFactor(cable, "unit_retired")).toThrow(
      UnprocessableError,
    );
  });

  test("item without alternative units only accepts the base unit", () => {
    const plain = { unitId: "unit_pcs", uoms: [] };
    expect(resolveUomFactor(plain, "unit_pcs").toString()).toBe("1");
    expect(() => resolveUomFactor(plain, "unit_box")).toThrow(
      UnprocessableError,
    );
  });
});

describe("formatQty / formatQtyWithUom", () => {
  test("no trailing zeros, never exponential", () => {
    expect(formatQty(610)).toBe("610");
    expect(formatQty("152.5")).toBe("152.5");
    expect(formatQty("12345678900")).toBe("12345678900");
    expect(formatQty(0.5)).toBe("0.5");
  });

  test("base unit only", () => {
    expect(formatQtyWithUom(610, "m")).toBe("610 m");
  });

  test("with alternative unit hint", () => {
    expect(formatQtyWithUom(610, "m", { code: "Box", factor: 305 })).toBe(
      "610 m (≈ 2.00 Box)",
    );
    expect(formatQtyWithUom("152.5", "m", { code: "Box", factor: 305 })).toBe(
      "152.5 m (≈ 0.50 Box)",
    );
  });

  test("factor 1 alt unit does not duplicate the hint", () => {
    expect(formatQtyWithUom(610, "m", { code: "m", factor: 1 })).toBe("610 m");
  });
});
