import type { TeacherRepository } from '../../src/teachers/teacher.repository.js';

// In-memory stand-in for teacherRepository: only knows the ids it was given.
export function createFakeTeacherRepository(teacherIds: string[] = []): TeacherRepository {
  return {
    async exists(id: string) {
      return teacherIds.includes(id);
    },
  };
}
