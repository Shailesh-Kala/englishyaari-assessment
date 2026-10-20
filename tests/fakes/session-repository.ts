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

  // Like $lookup + $unwind: attach the teacher, drop sessions whose teacher is unknown.
  const withTeacher = (list: SessionRecord[]) =>
    list.flatMap((s) => {
      const teacher = teachers.find((t) => t._id.equals(s.teacherId));
      return teacher ? [{ ...s, teacher }] : [];
    });
  const byTime =
    (pick: (s: SessionRecord) => Date | null | undefined, direction: 1 | -1) =>
    (a: SessionRecord, b: SessionRecord) =>
      direction * ((pick(a)?.getTime() ?? 0) - (pick(b)?.getTime() ?? 0));

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
        (s) => s.teacherId.equals(teacherId) && s.startTime < endTime && s.endTime > startTime,
      );
      if (overlaps) return null;
      return seed({ teacherId, startTime, endTime });
    },
    async findAvailable({ dayStart, dayEnd, now }) {
      return withTeacher(
        sessions
          .filter(
            (s) =>
              s.status === SessionStatus.AVAILABLE &&
              s.startTime >= dayStart &&
              s.startTime < dayEnd &&
              s.startTime > now,
          )
          .sort(byTime((s) => s.startTime, 1)),
      );
    },
    async findForUser(userId) {
      const mine = sessions.filter((s) => s.userId?.equals(userId));
      return {
        upcoming: withTeacher(
          mine.filter((s) => s.status === SessionStatus.BOOKED).sort(byTime((s) => s.startTime, 1)),
        ),
        completed: withTeacher(
          mine
            .filter((s) => s.status === SessionStatus.COMPLETED)
            .sort(byTime((s) => s.completedAt, -1)),
        ),
      };
    },
    async findById(id) {
      return sessions.find((s) => s._id.equals(id)) ?? null;
    },
    async bookIfAvailable({ sessionId, userId, now }) {
      const session = sessions.find((s) => s._id.equals(sessionId));
      if (!session || session.status !== SessionStatus.AVAILABLE || session.startTime <= now) {
        return null;
      }
      session.status = SessionStatus.BOOKED;
      session.userId = userId;
      return session;
    },
    async completeIfBooked({ sessionId, now }) {
      const session = sessions.find((s) => s._id.equals(sessionId));
      if (!session || session.status !== SessionStatus.BOOKED) return null;
      session.status = SessionStatus.COMPLETED;
      session.completedAt = now;
      return session;
    },
    all: () => sessions,
    seed,
  };
}
