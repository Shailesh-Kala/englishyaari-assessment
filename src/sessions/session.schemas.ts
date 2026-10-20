import { z } from 'zod';
import { objectIdSchema } from '../validation.js';

const dateTimeSchema = z
  .union([z.iso.datetime({ offset: true }), z.number().int().nonnegative()], {
    error: 'Must be an ISO-8601 date-time or epoch milliseconds',
  })
  .transform((value) => new Date(value));

export const createSessionSchema = z
  .object({ teacherId: objectIdSchema, startTime: dateTimeSchema, endTime: dateTimeSchema })
  .refine((session) => session.endTime > session.startTime, {
    path: ['endTime'],
    message: 'endTime must be after startTime',
  });

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const sessionIdParamsSchema = z.object({ id: objectIdSchema });

export const bookSessionSchema = z.object({ userId: objectIdSchema });

export const availableSessionsQuerySchema = z.object({
  dateTimestamp: z
    .string({ error: 'dateTimestamp is required (epoch milliseconds)' })
    .regex(/^\d+$/, 'dateTimestamp must be epoch milliseconds')
    .transform(Number),
});
