import { describe, expect, it } from 'vitest';
import { Session } from '../../src/sessions/session.model.js';
import { Teacher } from '../../src/teachers/teacher.model.js';
import { User } from '../../src/users/user.model.js';
import { useTestDb } from '../setup/test-db.js';

describe('models', () => {
  useTestDb();

  it('rejects a duplicate user email regardless of case', async () => {
    await User.create({ fullName: 'Asha Rao', email: 'Asha@Example.com', phone: '+919876543210' });

    await expect(
      User.create({ fullName: 'Asha R', email: 'asha@example.com', phone: '+919876543211' }),
    ).rejects.toMatchObject({ code: 11000 });
  });

  it('gives teachers an explicit session lock counter and no __v', async () => {
    const teacher = await Teacher.create({
      fullName: 'Priya Sharma',
      email: 'priya@example.com',
      specialization: 'Spoken English',
      experience: 6,
    });

    expect(teacher.toObject()).toMatchObject({ sessionLockVersion: 0 });
    expect(teacher.toObject()).not.toHaveProperty('__v');
  });

  it('indexes sessions for the available, overlap and per-user queries', async () => {
    const keys = (await Session.listIndexes()).map((index) => index.key);

    expect(keys).toEqual(
      expect.arrayContaining([
        { status: 1, startTime: 1 },
        { teacherId: 1, startTime: 1 },
        { userId: 1, status: 1 },
      ]),
    );
  });
});
