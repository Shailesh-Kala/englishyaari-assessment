import { describe, expect, it } from 'vitest';
import { Teacher } from '../../src/teachers/teacher.model.js';
import { SEED_TEACHERS, seedTeachers } from '../../src/teachers/teacher.seed.js';
import { useTestDb } from '../setup/test-db.js';

describe('seedTeachers', () => {
  useTestDb();

  it('inserts every seed teacher and returns them', async () => {
    const teachers = await seedTeachers();

    expect(teachers.map((t) => t.email).sort()).toEqual(SEED_TEACHERS.map((t) => t.email).sort());
  });

  it('is idempotent when run twice', async () => {
    await seedTeachers();
    await seedTeachers();

    expect(await Teacher.countDocuments()).toBe(SEED_TEACHERS.length);
  });
});
