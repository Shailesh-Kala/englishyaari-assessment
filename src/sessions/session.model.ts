import { model, Schema, type InferSchemaType } from 'mongoose';

export const SessionStatus = {
  AVAILABLE: 'AVAILABLE',
  BOOKED: 'BOOKED',
  COMPLETED: 'COMPLETED',
} as const;
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

const sessionSchema = new Schema(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(SessionStatus),
      default: SessionStatus.AVAILABLE,
      required: true,
    },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

sessionSchema.index({ status: 1, startTime: 1 }); // F3: available sessions on a day
sessionSchema.index({ teacherId: 1, startTime: 1 }); // F2: overlap check per teacher
sessionSchema.index({ userId: 1, status: 1 }); // F6: a user's booked/completed sessions

export type SessionDoc = InferSchemaType<typeof sessionSchema>;
export const Session = model('Session', sessionSchema);
