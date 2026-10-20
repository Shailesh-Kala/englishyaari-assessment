import type { Types } from 'mongoose';
import { AppError } from '../errors.js';
import type { TeacherRepository } from '../teachers/teacher.repository.js';
import type { UserRepository } from '../users/user.repository.js';
import { istDayRange } from './ist-day.js';
import { SessionStatus } from './session.model.js';
import type { SessionRepository } from './session.repository.js';
import type { CreateSessionInput } from './session.schemas.js';

type Deps = {
  sessionRepo: SessionRepository;
  teacherRepo: TeacherRepository;
  userRepo: Pick<UserRepository, 'exists'>;
  clock: () => Date;
};

function sessionNotAvailable() {
  return new AppError(409, 'SESSION_NOT_AVAILABLE', 'Session is not available for booking');
}

function sessionNotBooked() {
  return new AppError(409, 'SESSION_NOT_BOOKED', 'Only booked sessions can be completed');
}

export function createSessionService({ sessionRepo, teacherRepo, userRepo, clock }: Deps) {
  return {
    async create(input: CreateSessionInput) {
      if (!(await teacherRepo.exists(input.teacherId))) {
        throw new AppError(404, 'TEACHER_NOT_FOUND', 'Teacher not found');
      }
      const session = await sessionRepo.createIfNoOverlap(input);
      if (!session) {
        throw new AppError(
          409,
          'SESSION_OVERLAP',
          'Teacher already has a session that overlaps this time',
        );
      }
      return session;
    },

    async book(sessionId: Types.ObjectId, userId: Types.ObjectId) {
      if (!(await userRepo.exists(userId))) {
        throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
      }
      const session = await sessionRepo.findById(sessionId);
      if (!session) throw new AppError(404, 'SESSION_NOT_FOUND', 'Session not found');
      if (session.status !== SessionStatus.AVAILABLE) throw sessionNotAvailable();

      const now = clock();
      if (session.startTime <= now) {
        throw new AppError(409, 'SESSION_ALREADY_STARTED', 'Session has already started');
      }

      // The checks above give precise errors; this conditional update is what guarantees
      // a session is booked once, even when requests race (D-018).
      const booked = await sessionRepo.bookIfAvailable({ sessionId, userId, now });
      if (!booked) throw sessionNotAvailable();
      return booked;
    },

    async complete(sessionId: Types.ObjectId) {
      const session = await sessionRepo.findById(sessionId);
      if (!session) throw new AppError(404, 'SESSION_NOT_FOUND', 'Session not found');
      if (session.status !== SessionStatus.BOOKED) throw sessionNotBooked();

      const completed = await sessionRepo.completeIfBooked({ sessionId, now: clock() });
      if (!completed) throw sessionNotBooked();
      return completed;
    },

    // Upcoming = every BOOKED session, started or not, until it is completed (D-009).
    async listForUser(userId: Types.ObjectId) {
      if (!(await userRepo.exists(userId))) {
        throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
      }
      return sessionRepo.findForUser(userId);
    },

    async listAvailable(dateTimestamp: number) {
      const { start, end } = istDayRange(dateTimestamp);
      return sessionRepo.findAvailable({ dayStart: start, dayEnd: end, now: clock() });
    },
  };
}

export type SessionService = ReturnType<typeof createSessionService>;
