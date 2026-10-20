import { z } from 'zod';

export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Must be a 24-character hex ObjectId');

export const idParamsSchema = z.object({ id: objectIdSchema });
