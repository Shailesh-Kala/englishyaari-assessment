import { Types } from 'mongoose';
import { z } from 'zod';

export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Must be a 24-character hex ObjectId')
  // Parsed once here, so services and pipelines only ever see real ObjectIds (D-028).
  .transform((id) => new Types.ObjectId(id));

export const idParamsSchema = z.object({ id: objectIdSchema });
