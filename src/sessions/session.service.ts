import { AppError } from '../errors.js';
import type { TeacherRepository } from '../teachers/teacher.repository.js';
import { istDayRange } from './ist-day.js';
import type { SessionRepository } from './session.repository.js';
import type { CreateSessionInput } from './session.schemas.js';

type Deps = {
  sessionRepo: SessionRepository;
  teacherRepo: TeacherRepository;
  clock: () => Date;
};

export function createSessionService({ sessionRepo, teacherRepo, clock }: Deps) {
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

    async listAvailable(dateTimestamp: number) {
      const { start, end } = istDayRange(dateTimestamp);
      return sessionRepo.findAvailable({ dayStart: start, dayEnd: end, now: clock() });
    },
  };
}

export type SessionService = ReturnType<typeof createSessionService>;
