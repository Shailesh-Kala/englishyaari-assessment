import { Teacher } from './teacher.model.js';

export type TeacherRepository = {
  exists(id: string): Promise<boolean>;
};

export const teacherRepository: TeacherRepository = {
  async exists(id) {
    return (await Teacher.exists({ _id: id })) !== null;
  },
};
