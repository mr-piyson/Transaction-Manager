import * as z from 'zod';

export const setupSchema = z.object({
  language: z.string().min(1),
  currency: z.string().min(1),
  orgName: z.string().min(2, 'Organization name is required'),
  website: z.url('Must be a valid URL').optional().or(z.literal('')),
  adminFirstName: z.string().min(2, 'First name is required'),
  adminLastName: z.string().optional(),
  adminEmail: z.email('Invalid email address'),
  adminPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export type SetupData = z.infer<typeof setupSchema>;

/** Maps each step index to the form fields it owns. */
export const STEP_FIELDS: (keyof SetupData)[][] = [
  ['language', 'currency'],
  ['orgName', 'website'],
  ['adminFirstName', 'adminEmail', 'adminPassword'],
];

export const STEP_META = [
  { id: 'language', title: 'Language & Region' },
  { id: 'organization', title: 'Organization' },
  { id: 'admin', title: 'Admin Account' },
];
