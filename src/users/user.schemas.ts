import { z } from 'zod';

export const createUserSchema = z.object({
  fullName: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  phone: z
    .string()
    .trim()
    .regex(/^\+?\d{7,15}$/, 'Phone must be 7–15 digits with an optional leading +'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
