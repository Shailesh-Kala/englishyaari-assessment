import mongoose, { type Types } from 'mongoose';
import { Teacher } from '../teachers/teacher.model.js';
import { Session, type SessionDoc } from './session.model.js';
import type { CreateSessionInput } from './session.schemas.js';

export type NewSession = CreateSessionInput;
export type SessionRecord = SessionDoc & { _id: Types.ObjectId };

export type SessionRepository = {
  /** Returns null when the teacher already has a session overlapping [startTime, endTime). */
  createIfNoOverlap(input: NewSession): Promise<SessionRecord | null>;
};

export const sessionRepository: SessionRepository = {
  async createIfNoOverlap({ teacherId, startTime, endTime }) {
    let created: SessionRecord | null = null;
    // Mongoose retries the callback on transient errors such as WriteConflict.
    await mongoose.connection.transaction(async (session) => {
      // Writing the teacher doc first makes concurrent creates for this teacher conflict,
      // so one aborts and retries, and its retry then sees the winner's session (D-008).
      await Teacher.updateOne({ _id: teacherId }, { $inc: { sessionLockVersion: 1 } }, { session });

      const overlapping = await Session.exists({
        teacherId,
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
      }).session(session);
      if (overlapping) {
        created = null;
        return;
      }

      const [doc] = await Session.create([{ teacherId, startTime, endTime }], { session });
      created = doc!.toObject();
    });
    return created;
  },
};
