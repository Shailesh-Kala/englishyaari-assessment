import { AppError } from '../errors.js';
import type { TeacherRepository } from '../teachers/teacher.repository.js';
import type { SessionRepository } from './session.repository.js';
import type { CreateSessionInput } from './session.schemas.js';

type Deps = { sessionRepo: SessionRepository; teacherRepo: TeacherRepository };

export function createSessionService({ sessionRepo, teacherRepo }: Deps) {
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
  };
}

export type SessionService = ReturnType<typeof createSessionService>;
