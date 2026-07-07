import { z } from 'zod';
import { currencyCodeSchema } from '@/lib/validations';

export const setupSchema = z.object({
  language: z.enum(['en', 'ar']),
  currency: currencyCodeSchema,
  orgName: z.string().min(2, 'Organization name is required'),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  website: z.string(),
  adminFirstName: z.string().min(2, 'First name is required'),
  adminLastName: z.string(),
  adminEmail: z.string().email('Invalid email address'),
  adminPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export type SetupData = z.infer<typeof setupSchema>;

export const STEP_FIELDS: (keyof SetupData)[][] = [
  ['language', 'currency'],
  ['orgName', 'slug', 'website'],
  ['adminFirstName', 'adminLastName', 'adminEmail', 'adminPassword'],
];

export const STEP_META = [
  { id: 'language', title: 'Language & Region' },
  { id: 'organization', title: 'Organization' },
  { id: 'admin', title: 'Admin Account' },
];
