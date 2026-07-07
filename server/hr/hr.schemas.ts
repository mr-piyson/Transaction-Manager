import { z } from 'zod';
import {
  currencyCodeSchema,
  offsetPaginationSchema,
  sortOrderSchema,
} from '@/lib/validations';

export const employeeStatusSchema = z.enum([
  'ACTIVE',
  'ON_LEAVE',
  'TERMINATED',
  'RESIGNED',
  'SUSPENDED',
]);

export const leaveStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
]);

export const payrollStatusSchema = z.enum([
  'DRAFT',
  'PROCESSING',
  'COMPLETED',
  'CANCELLED',
]);

export const performanceRatingSchema = z.enum([
  'EXCEEDS_EXPECTATIONS',
  'MEETS_EXPECTATIONS',
  'NEEDS_IMPROVEMENT',
  'BELOW_EXPECTATIONS',
]);

export const candidateStatusSchema = z.enum([
  'NEW',
  'SCREENING',
  'INTERVIEW',
  'OFFERED',
  'HIRED',
  'REJECTED',
  'WITHDRAWN',
]);

export const trainingStatusSchema = z.enum([
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

export const offerStatusSchema = z.enum([
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
  'EXPIRED',
]);

export const interviewStageSchema = z.enum([
  'PHONE_SCREEN',
  'TECHNICAL',
  'MANAGERIAL',
  'HR',
  'FINAL',
]);

export const interviewResultSchema = z.enum([
  'PENDING',
  'PASSED',
  'FAILED',
  'CANCELLED',
]);

export const grievanceStatusSchema = z.enum([
  'OPEN',
  'INVESTIGATING',
  'RESOLVED',
  'CLOSED',
  'ESCALATED',
]);

export const disciplinaryActionTypeSchema = z.enum([
  'VERBAL_WARNING',
  'WRITTEN_WARNING',
  'SUSPENSION',
  'TERMINATION',
]);

export const assetStatusSchema = z.enum([
  'ASSIGNED',
  'RETURNED',
  'LOST',
  'DAMAGED',
]);

export const hrListSchema = z.object({
  ...offsetPaginationSchema.shape,
  search: z.string().optional(),
  sortBy: z.string().default('createdAt'),
  sortOrder: sortOrderSchema,
});

export const dateRangeFilterSchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .optional();
