import { describe, expect, it } from 'vitest';
import { Session } from '../../src/sessions/session.model.js';
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
