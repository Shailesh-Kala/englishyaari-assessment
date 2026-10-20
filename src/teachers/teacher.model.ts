import { model, Schema, type InferSchemaType } from 'mongoose';

// Keeps the default `__v`: session creation bumps it to serialise concurrent creates (D-008).
const teacherSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    specialization: { type: String, required: true, trim: true },
    experience: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

export type TeacherDoc = InferSchemaType<typeof teacherSchema>;
export const Teacher = model('Teacher', teacherSchema);
