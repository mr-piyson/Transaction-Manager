/**
 * src/server/lib/errors/index.ts
 *
 * Typed error hierarchy for the ERP backend.
 *
 * WHY CUSTOM ERRORS INSTEAD OF PLAIN TRPCError?
 * 1. Consistent error codes/messages across modules without repetition.
 * 2. Easy instanceof checks in tests and error boundaries.
 * 3. tRPC's formatError hook maps them to structured client-facing payloads.
 * 4. Keeps business logic readable — throw new NotFoundError("Invoice") rather
 *    than new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" }).
 *
 * All errors carry an optional `meta` bag for contextual debugging data that
 * is stripped before reaching the client in production.
 */

import { TRPCError } from '@trpc/server';
import type { TRPC_ERROR_CODE_KEY } from '@trpc/server/rpc';

// ---------------------------------------------------------------------------
// Base
// ---------------------------------------------------------------------------

interface ErrorMeta {
  /** Raw entity identifier that triggered the error. */
  entityId?: string;
  /** Entity type e.g. "Invoice", "Customer". */
  entityType?: string;
  /** Additional context for debugging. */
  [key: string]: unknown;
}

export class AppError extends TRPCError {
  public readonly meta: ErrorMeta;

  constructor(code: TRPC_ERROR_CODE_KEY, message: string, meta: ErrorMeta = {}) {
    super({ code, message });
    this.meta = meta;
    this.name = 'AppError';
  }
}

// ---------------------------------------------------------------------------
// 404
// ---------------------------------------------------------------------------

export class NotFoundError extends AppError {
  constructor(entity: string, id?: string) {
    super('NOT_FOUND', id ? `${entity} with id "${id}" not found.` : `${entity} not found.`, {
      entityType: entity,
      entityId: id,
    });
    this.name = 'NotFoundError';
  }
}

// ---------------------------------------------------------------------------
// 403
// ---------------------------------------------------------------------------

export class ForbiddenError extends AppError {
  constructor(action: string, entity: string) {
    super('FORBIDDEN', `You do not have permission to ${action} ${entity}.`, {
      action,
      entityType: entity,
    });
    this.name = 'ForbiddenError';
  }
}

// ---------------------------------------------------------------------------
// 401
// ---------------------------------------------------------------------------

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required.') {
    super('UNAUTHORIZED', message);
    this.name = 'UnauthorizedError';
  }
}

// ---------------------------------------------------------------------------
// 409 — business-rule violations
// ---------------------------------------------------------------------------

export class ConflictError extends AppError {
  constructor(message: string, meta: ErrorMeta = {}) {
    super('CONFLICT', message, meta);
    this.name = 'ConflictError';
  }
}

// ---------------------------------------------------------------------------
// 422 — validation / domain invariant failures
// ---------------------------------------------------------------------------

export class UnprocessableError extends AppError {
  constructor(message: string, meta: ErrorMeta = {}) {
    super('UNPROCESSABLE_CONTENT', message, meta);
    this.name = 'UnprocessableError';
  }
}

// ---------------------------------------------------------------------------
// 412 — optimistic lock / version mismatch
// ---------------------------------------------------------------------------

export class StaleDataError extends AppError {
  constructor(entity: string) {
    super(
      'PRECONDITION_FAILED',
      `${entity} was modified by another user. Please refresh and try again.`,
      { entityType: entity },
    );
    this.name = 'StaleDataError';
  }
}

// ---------------------------------------------------------------------------
// 500 — unexpected server errors
// ---------------------------------------------------------------------------

export class InternalError extends AppError {
  constructor(message = 'An unexpected error occurred.', meta: ErrorMeta = {}) {
    super('INTERNAL_SERVER_ERROR', message, meta);
    this.name = 'InternalError';
  }
}

// ---------------------------------------------------------------------------
// Helper — wraps unknown catches for consistent downstream handling
// ---------------------------------------------------------------------------

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof Error) return new InternalError(err.message, { originalStack: err.stack });
  return new InternalError('Unknown error', { raw: String(err) });
}
