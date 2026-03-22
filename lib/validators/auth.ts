import z from 'zod';

export const SignInSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

export const SignUpSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    email: z.email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z
      .string()
      .min(6, 'Password must be at least 6 characters'),
    image: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SignInInput = z.infer<typeof SignInSchema>;
export type SignUpInput = z.infer<typeof SignUpSchema>;
