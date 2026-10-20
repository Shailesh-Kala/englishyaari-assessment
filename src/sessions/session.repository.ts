import mongoose, { type Types } from 'mongoose';
import { Teacher } from '../teachers/teacher.model.js';
import { Session, SessionStatus, type SessionDoc } from './session.model.js';
import type { CreateSessionInput } from './session.schemas.js';

export type NewSession = CreateSessionInput;
export type SessionRecord = SessionDoc & { _id: Types.ObjectId };
export type TeacherSummary = { _id: Types.ObjectId; fullName: string; specialization: string };
export type SessionWithTeacher = SessionRecord & { teacher: TeacherSummary };

export type SessionRepository = {
  /** Returns null when the teacher already has a session overlapping [startTime, endTime). */
  createIfNoOverlap(input: NewSession): Promise<SessionRecord | null>;
  findById(id: string): Promise<SessionRecord | null>;
  /**
   * Atomically books the session only if it is still AVAILABLE and starts after `now`.
   * Returns null if another request got there first (or the rules no longer hold).
   */
  bookIfAvailable(booking: {
    sessionId: string;
    userId: string;
    now: Date;
  }): Promise<SessionRecord | null>;
  /** Atomically completes the session only if it is still BOOKED; null otherwise. */
  completeIfBooked(completion: { sessionId: string; now: Date }): Promise<SessionRecord | null>;
  /** AVAILABLE sessions starting in [dayStart, dayEnd) and strictly after `now`, by startTime. */
  findAvailable(range: { dayStart: Date; dayEnd: Date; now: Date }): Promise<SessionWithTeacher[]>;
};

const joinTeacher = [
  {
    $lookup: {
      from: Teacher.collection.name,
      localField: 'teacherId',
      foreignField: '_id',
      as: 'teacher',
      pipeline: [{ $project: { fullName: 1, specialization: 1 } }],
    },
  },
  { $unwind: '$teacher' },
];

export const sessionRepository: SessionRepository = {
  async createIfNoOverlap({ teacherId, startTime, endTime }) {
    let created: SessionRecord | null = null;
    // Mongoose retries the callback on transient errors such as WriteConflict.
    await mongoose.connection.transaction(async (session) => {
      created = null; // the callback re-runs on retry
      // Writing the teacher doc first makes concurrent creates for this teacher conflict,
      // so one aborts and retries, and its retry then sees the winner's session (D-008).
      await Teacher.updateOne({ _id: teacherId }, { $inc: { sessionLockVersion: 1 } }, { session });

      const overlapping = await Session.exists({
        teacherId,
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
      }).session(session);
      if (overlapping) return;

      const [doc] = await Session.create([{ teacherId, startTime, endTime }], { session });
      created = doc!.toObject();
    });
    return created;
  },

  async findById(id) {
    return Session.findById(id).lean<SessionRecord>();
  },

  async bookIfAvailable({ sessionId, userId, now }) {
    return Session.findOneAndUpdate(
      { _id: sessionId, status: SessionStatus.AVAILABLE, startTime: { $gt: now } },
      { $set: { status: SessionStatus.BOOKED, userId } },
      { returnDocument: 'after' },
    ).lean<SessionRecord>();
  },

  async completeIfBooked({ sessionId, now }) {
    return Session.findOneAndUpdate(
      { _id: sessionId, status: SessionStatus.BOOKED },
      { $set: { status: SessionStatus.COMPLETED, completedAt: now } },
      { returnDocument: 'after' },
    ).lean<SessionRecord>();
  },

  async findAvailable({ dayStart, dayEnd, now }) {
    return Session.aggregate<SessionWithTeacher>([
      {
        $match: {
          status: SessionStatus.AVAILABLE,
          startTime: { $gte: dayStart, $lt: dayEnd, $gt: now },
        },
      },
      { $sort: { startTime: 1 } },
      ...joinTeacher,
    ]);
  },
};
