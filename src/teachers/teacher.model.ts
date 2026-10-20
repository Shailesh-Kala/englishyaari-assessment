import { model, Schema, type InferSchemaType } from 'mongoose';

const teacherSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    specialization: { type: String, required: true, trim: true },
    experience: { type: Number, required: true, min: 0 },
    // Bumped inside every session-create transaction so concurrent creates for one teacher
    // conflict and retry, which makes overlapping sessions impossible (D-008, D-023).
    sessionLockVersion: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

export type TeacherDoc = InferSchemaType<typeof teacherSchema>;
export const Teacher = model('Teacher', teacherSchema);
