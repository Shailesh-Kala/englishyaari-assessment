import type { Types } from 'mongoose';
import type { TeacherRepository } from '../../src/teachers/teacher.repository.js';

// In-memory stand-in for teacherRepository: only knows the ids it was given.
export function createFakeTeacherRepository(teacherIds: Types.ObjectId[] = []): TeacherRepository {
  return {
    async exists(id: Types.ObjectId) {
      return teacherIds.some((teacherId) => teacherId.equals(id));
    },
  };
}
