import { describe, expect, test } from "bun:test";
import { isLowStock } from "./low-stock";

describe("isLowStock", () => {
  const base = { reorderPoint: 10, totalStock: 5 };

  test("stock below the reorder point is low", () => {
    expect(isLowStock(base)).toBe(true);
  });

  test("stock exactly at the reorder point is low", () => {
    expect(isLowStock({ ...base, totalStock: 10 })).toBe(true);
  });

  test("stock above the reorder point is healthy", () => {
    expect(isLowStock({ ...base, totalStock: 11 })).toBe(false);
  });

  test("an unconfigured reorder point never counts as low", () => {
    expect(isLowStock({ reorderPoint: 0, totalStock: 0 })).toBe(false);
  });

  test("service items are excluded", () => {
    expect(isLowStock({ ...base, type: "SERVICE" })).toBe(false);
  });

  test("inactive and deleted items are excluded", () => {
    expect(isLowStock({ ...base, isActive: false })).toBe(false);
    expect(isLowStock({ ...base, deletedAt: new Date() })).toBe(false);
  });
});
