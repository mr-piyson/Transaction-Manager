const DEFAULT_TIMEZONE = "Asia/Bahrain";

const dayFormatterCache = new Map<string, Intl.DateTimeFormat>();

export function resolveTimeZone(value: string | null | undefined): string {
  const candidate = value?.trim() || DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(
      new Date(),
    );
    return candidate;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function getDayFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = dayFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    dayFormatterCache.set(timeZone, formatter);
  }
  return formatter;
}

/** ISO calendar key (YYYY-MM-DD) for an instant in the given timezone. */
export function dateKeyInTimeZone(date: Date, timeZone: string): string {
  const parts = getDayFormatter(timeZone).formatToParts(date);
  const lookup = new Map(parts.map((part) => [part.type, part.value]));
  return `${lookup.get("year")}-${lookup.get("month")}-${lookup.get("day")}`;
}

/** Shift a YYYY-MM-DD key by a number of calendar days. */
export function addDaysToKey(key: string, delta: number): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + delta))
    .toISOString()
    .slice(0, 10);
}

/** Inclusive list of YYYY-MM-DD keys between two date keys. */
export function dateKeysBetween(from: string, to: string): string[] {
  const keys: string[] = [];
  for (let cursor = from; cursor <= to; cursor = addDaysToKey(cursor, 1)) {
    keys.push(cursor);
  }
  return keys;
}

export interface CashMovement {
  date: Date;
  amount: number;
  kind: "income" | "expenses";
}

export interface CashFlowPoint {
  date: string;
  income: number;
  expenses: number;
  balance: number;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Turns dated cash movements into one continuous, cumulative series.
 * Values start at zero on the first day of the range.
 */
export function buildCumulativeCashFlow(
  movements: CashMovement[],
  days: string[],
  timeZone: string,
): CashFlowPoint[] {
  const range = new Set(days);
  const buckets = new Map<string, { income: number; expenses: number }>();

  for (const movement of movements) {
    const key = dateKeyInTimeZone(movement.date, timeZone);
    if (!range.has(key)) continue;

    const bucket = buckets.get(key) ?? { income: 0, expenses: 0 };
    bucket[movement.kind] += movement.amount;
    buckets.set(key, bucket);
  }

  let income = 0;
  let expenses = 0;

  return days.map((date) => {
    const bucket = buckets.get(date) ?? { income: 0, expenses: 0 };
    income += bucket.income;
    expenses += bucket.expenses;

    return {
      date,
      income: roundMoney(income),
      expenses: roundMoney(expenses),
      balance: roundMoney(income - expenses),
    };
  });
}
