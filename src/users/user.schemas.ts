import { z } from 'zod';

// 10 digits starting 6–9, optionally prefixed by +91, 91 or 0. Spaces and hyphens are ignored.
const INDIAN_MOBILE = /^(?:\+91|91|0)?[6-9]\d{9}$/;

export const createUserSchema = z.object({
  fullName: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  phone: z
    .string()
    .transform((value) => value.replace(/[\s-]/g, ''))
    .pipe(
      z
        .string()
        .regex(
          INDIAN_MOBILE,
          'Phone must be an Indian mobile number: 10 digits starting with 6–9, optional +91, 91 or 0 prefix',
        ),
    )
    .transform((value) => `+91${value.slice(-10)}`),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
