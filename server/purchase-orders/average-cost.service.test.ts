import { describe, expect, test } from "bun:test";
import { UnprocessableError } from "@/lib/error";
import { computeWeightedAverage } from "./average-cost.service";

describe("computeWeightedAverage", () => {
  test("empty stock: average = received value ÷ received qty", () => {
    // 2 Box @ 152.500/Box = 610 m for 305.000 → 0.500000/m
    expect(computeWeightedAverage(0, 0, 610, 305).toString()).toBe("0.5");
  });

  test("weighted average across receipts", () => {
    // 100 @ 2.00 + 50 @ 3.00 → 350 / 150 = 2.333333
    expect(computeWeightedAverage(100, 2, 50, 150).toString()).toBe("2.333333");
  });

  test("existing average is preserved when receiving zero", () => {
    expect(computeWeightedAverage(10, 1.234567, 0, 0).toString()).toBe(
      "1.234567",
    );
  });

  test("non-terminating division rounds to 6 dp", () => {
    // 1 unit @ 1.00 + 2 units @ 1.00 → 3/3 = 1; use 100 ÷ 3 case:
    expect(computeWeightedAverage(0, 0, 3, 100).toString()).toBe("33.333333");
  });

  test("rounding never leaks value on exact halves", () => {
    // 1 @ 0.000001 + 1 @ 0.000001 → 0.000001 stays
    expect(computeWeightedAverage(1, 0.000001, 1, 0.000001).toString()).toBe(
      "0.000001",
    );
  });

  test("negative/zero previous stock behaves like empty stock", () => {
    expect(computeWeightedAverage(-5, 9, 10, 20).toString()).toBe("2");
  });

  test("invalid received qty path throws only on bad input", () => {
    expect(() => computeWeightedAverage(10, 1, Number.NaN, 1)).toThrow(
      UnprocessableError,
    );
  });
});
