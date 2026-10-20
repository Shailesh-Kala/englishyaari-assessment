import { Types } from 'mongoose';
import { SessionStatus } from '../../src/sessions/session.model.js';
import type {
  NewSession,
  SessionRecord,
  SessionRepository,
} from '../../src/sessions/session.repository.js';

const FIXED_DATE = new Date('2026-10-20T10:00:00.000Z');

// In-memory stand-in for sessionRepository: same contract, no database.
export function createFakeSessionRepository(): SessionRepository & { all(): SessionRecord[] } {
  const sessions: SessionRecord[] = [];

  return {
    async createIfNoOverlap({ teacherId, startTime, endTime }: NewSession) {
      const overlaps = sessions.some(
        (s) => String(s.teacherId) === teacherId && s.startTime < endTime && s.endTime > startTime,
      );
      if (overlaps) return null;
      const session: SessionRecord = {
        _id: new Types.ObjectId(String(sessions.length + 1).padStart(24, '0')),
        teacherId: new Types.ObjectId(teacherId),
        userId: null,
        startTime,
        endTime,
        status: SessionStatus.AVAILABLE,
        completedAt: null,
        createdAt: FIXED_DATE,
        updatedAt: FIXED_DATE,
      };
      sessions.push(session);
      return session;
    },
    all: () => sessions,
  };
}
