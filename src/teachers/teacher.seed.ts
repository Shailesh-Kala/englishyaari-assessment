import { Teacher } from './teacher.model.js';

export const SEED_TEACHERS = [
  {
    fullName: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    specialization: 'Spoken English',
    experience: 6,
  },
  {
    fullName: 'Rahul Verma',
    email: 'rahul.verma@example.com',
    specialization: 'IELTS Preparation',
    experience: 4,
  },
  {
    fullName: 'Ananya Iyer',
    email: 'ananya.iyer@example.com',
    specialization: 'Business English',
    experience: 9,
  },
];

// Upserts by email, so running it again never creates duplicates.
export async function seedTeachers() {
  await Teacher.bulkWrite(
    SEED_TEACHERS.map((teacher) => ({
      updateOne: { filter: { email: teacher.email }, update: { $set: teacher }, upsert: true },
    })),
  );
  return Teacher.find({ email: { $in: SEED_TEACHERS.map((t) => t.email) } })
    .select({ fullName: 1, email: 1, specialization: 1 })
    .lean();
}
