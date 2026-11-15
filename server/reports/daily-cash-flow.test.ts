import { describe, expect, test } from "bun:test";
import {
  addDaysToKey,
  buildCumulativeCashFlow,
  dateKeyInTimeZone,
  dateKeysBetween,
  resolveTimeZone,
} from "./daily-cash-flow";

describe("daily cash flow helpers", () => {
  test("resolves a valid timezone and falls back for an invalid one", () => {
    expect(resolveTimeZone("Asia/Bahrain")).toBe("Asia/Bahrain");
    expect(resolveTimeZone("Not/AZone")).toBe("Asia/Bahrain");
    expect(resolveTimeZone(null)).toBe("Asia/Bahrain");
  });

  test("uses the user's calendar day when bucketing an instant", () => {
    const lateUtc = new Date("2026-01-01T22:30:00.000Z");
    expect(dateKeyInTimeZone(lateUtc, "Asia/Bahrain")).toBe("2026-01-02");
    expect(dateKeyInTimeZone(lateUtc, "UTC")).toBe("2026-01-01");
  });

  test("shifts date keys across month and year boundaries", () => {
    expect(addDaysToKey("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDaysToKey("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDaysToKey("2026-12-31", 1)).toBe("2027-01-01");
  });

  test("builds an inclusive continuous list of days", () => {
    expect(dateKeysBetween("2026-01-30", "2026-02-02")).toEqual([
      "2026-01-30",
      "2026-01-31",
      "2026-02-01",
      "2026-02-02",
    ]);
  });

  test("cumulates income and expenses and starts the range at zero", () => {
    const days = dateKeysBetween("2026-11-01", "2026-11-03");
    const points = buildCumulativeCashFlow(
      [
        {
          date: new Date("2026-11-01T10:00:00.000Z"),
          amount: 100,
          kind: "income",
        },
        {
          date: new Date("2026-11-01T12:00:00.000Z"),
          amount: 10,
          kind: "expenses",
        },
        {
          date: new Date("2026-11-02T09:00:00.000Z"),
          amount: 10,
          kind: "expenses",
        },
        {
          date: new Date("2026-11-04T09:00:00.000Z"),
          amount: 999,
          kind: "income",
        },
      ],
      days,
      "UTC",
    );

    expect(points).toEqual([
      { date: "2026-11-01", income: 100, expenses: 10, balance: 90 },
      { date: "2026-11-02", income: 100, expenses: 20, balance: 80 },
      { date: "2026-11-03", income: 100, expenses: 20, balance: 80 },
    ]);
  });

  test("fills days without activity with the previous cumulative values", () => {
    const days = dateKeysBetween("2026-11-01", "2026-11-02");
    const points = buildCumulativeCashFlow(
      [
        {
          date: new Date("2026-11-01T10:00:00.000Z"),
          amount: 25,
          kind: "expenses",
        },
      ],
      days,
      "UTC",
    );

    expect(points[1]).toEqual({
      date: "2026-11-02",
      income: 0,
      expenses: 25,
      balance: -25,
    });
  });
});
