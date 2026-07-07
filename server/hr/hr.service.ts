import type { Prisma } from '@prisma/client';

type TransactionClient = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

const EMP_CODE_PREFIX = 'EMP';

function padNumber(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

export async function generateEmployeeCode(
  tx: TransactionClient,
  organizationId: string,
): Promise<string> {
  const result = await tx.$queryRawUnsafe<{ maxCode: string | null }[]>(
    `SELECT MAX("employeeCode") as "maxCode" FROM "hrms"."Employee" WHERE "organizationId" = $1 AND "deletedAt" IS NULL`,
    organizationId,
  );

  const currentMax = result[0]?.maxCode;
  let nextNum = 1;

  if (currentMax) {
    const parts = currentMax.split('-');
    const numPart = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(numPart)) {
      nextNum = numPart + 1;
    }
  }

  return `${EMP_CODE_PREFIX}-${padNumber(nextNum, 5)}`;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      if ((err as { code?: string }).code !== 'P2002') throw err;
    }
  }
  throw lastError;
}
