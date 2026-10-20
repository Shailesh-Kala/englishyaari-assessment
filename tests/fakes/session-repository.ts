import { Types } from 'mongoose';
import { SessionStatus } from '../../src/sessions/session.model.js';
import type {
  NewSession,
  SessionRecord,
  SessionRepository,
  TeacherSummary,
} from '../../src/sessions/session.repository.js';

const FIXED_DATE = new Date('2026-10-20T10:00:00.000Z');

// In-memory stand-in for sessionRepository: same contract, no database.
// `teachers` plays the part of the teachers collection for the $lookup-style joins.
export function createFakeSessionRepository(teachers: TeacherSummary[] = []): SessionRepository & {
  all(): SessionRecord[];
  seed(overrides: Partial<SessionRecord>): SessionRecord;
} {
  const sessions: SessionRecord[] = [];

  function seed(overrides: Partial<SessionRecord>) {
    const session: SessionRecord = {
      _id: new Types.ObjectId(String(sessions.length + 1).padStart(24, '0')),
      teacherId: new Types.ObjectId(),
      userId: null,
      startTime: new Date('2026-10-21T04:30:00.000Z'),
      endTime: new Date('2026-10-21T05:30:00.000Z'),
      status: SessionStatus.AVAILABLE,
      completedAt: null,
      createdAt: FIXED_DATE,
      updatedAt: FIXED_DATE,
      ...overrides,
    };
    sessions.push(session);
    return session;
  }

  return {
    async createIfNoOverlap({ teacherId, startTime, endTime }: NewSession) {
      const overlaps = sessions.some(
        (s) => String(s.teacherId) === teacherId && s.startTime < endTime && s.endTime > startTime,
      );
      if (overlaps) return null;
      return seed({ teacherId: new Types.ObjectId(teacherId), startTime, endTime });
    },
    async findAvailable({ dayStart, dayEnd, now }) {
      return sessions
        .filter(
          (s) =>
            s.status === SessionStatus.AVAILABLE &&
            s.startTime >= dayStart &&
            s.startTime < dayEnd &&
            s.startTime > now,
        )
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
        .flatMap((s) => {
          const teacher = teachers.find((t) => t._id.equals(s.teacherId));
          return teacher ? [{ ...s, teacher }] : []; // like $unwind dropping unmatched rows
        });
    },
    async findById(id) {
      return sessions.find((s) => String(s._id) === id) ?? null;
    },
    async bookIfAvailable({ sessionId, userId, now }) {
      const session = sessions.find((s) => String(s._id) === sessionId);
      if (!session || session.status !== SessionStatus.AVAILABLE || session.startTime <= now) {
        return null;
      }
      session.status = SessionStatus.BOOKED;
      session.userId = new Types.ObjectId(userId);
      return session;
    },
    all: () => sessions,
    seed,
  };
}
