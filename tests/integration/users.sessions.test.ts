import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { Session, SessionStatus } from '../../src/sessions/session.model.js';
import { Teacher } from '../../src/teachers/teacher.model.js';
import { User } from '../../src/users/user.model.js';
import { TEST_NOW, testApp } from '../setup/test-app.js';
import { useTestDb } from '../setup/test-db.js';

const HOUR = 60 * 60 * 1000;
const at = (offsetHours: number) => new Date(TEST_NOW.getTime() + offsetHours * HOUR);

async function createUser(email: string, phone: string) {
  return (await User.create({ fullName: 'User', email, phone })).id as string;
}

describe('GET /users/:id/sessions', () => {
  useTestDb();
  const app = testApp();
  let teacher: { _id: string; fullName: string; specialization: string };
  let userId: string;

  beforeEach(async () => {
    const doc = await Teacher.create({
      fullName: 'Priya Sharma',
      email: 'priya@example.com',
      specialization: 'Spoken English',
      experience: 6,
    });
    teacher = { _id: doc.id, fullName: doc.fullName, specialization: doc.specialization };
    userId = await createUser('asha@example.com', '+919876543210');
  });

  async function insert(
    startsInHours: number,
    status: SessionStatus,
    { forUser = userId as string | null, completedAt = null as Date | null } = {},
  ) {
    const session = await Session.create({
      teacherId: teacher._id,
      userId: forUser,
      startTime: at(startsInHours),
      endTime: at(startsInHours + 1),
      status,
      completedAt,
    });
    return session.id as string;
  }

  const ids = (list: { _id: string }[]) => list.map((s) => s._id);

  it('splits sessions into upcoming (all BOOKED, by startTime) and completed (by completedAt desc)', async () => {
    const tomorrow = await insert(24, SessionStatus.BOOKED);
    const startedNotCompleted = await insert(-0.5, SessionStatus.BOOKED);
    const inTwoHours = await insert(2, SessionStatus.BOOKED);
    const completedEarlier = await insert(-72, SessionStatus.COMPLETED, {
      completedAt: at(-70),
    });
    const completedLater = await insert(-48, SessionStatus.COMPLETED, { completedAt: at(-46) });

    const res = await request(app).get(`/users/${userId}/sessions`);

    expect(res.status).toBe(200);
    expect(ids(res.body.upcoming)).toEqual([startedNotCompleted, inTwoHours, tomorrow]);
    expect(ids(res.body.completed)).toEqual([completedLater, completedEarlier]);
    expect(res.body.upcoming[0]).toMatchObject({ status: 'BOOKED', userId, teacher });
    expect(res.body.completed[0]).toMatchObject({
      status: 'COMPLETED',
      completedAt: at(-46).toISOString(),
      teacher,
    });
  });

  it("excludes AVAILABLE sessions and other users' sessions", async () => {
    const mine = await insert(24, SessionStatus.BOOKED);
    await insert(26, SessionStatus.AVAILABLE, { forUser: null });
    const otherUser = await createUser('ravi@example.com', '+919876543211');
    await insert(28, SessionStatus.BOOKED, { forUser: otherUser });
    await insert(-48, SessionStatus.COMPLETED, { forUser: otherUser, completedAt: at(-46) });

    const res = await request(app).get(`/users/${userId}/sessions`);

    expect(ids(res.body.upcoming)).toEqual([mine]);
    expect(res.body.completed).toEqual([]);
  });

  it('returns empty lists for a user with no sessions', async () => {
    const res = await request(app).get(`/users/${userId}/sessions`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ upcoming: [], completed: [] });
  });

  it('returns 404 USER_NOT_FOUND for an unknown user', async () => {
    const res = await request(app).get('/users/0000000000000000000000ff/sessions');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('USER_NOT_FOUND');
  });

  it('returns 400 for a malformed user id', async () => {
    const res = await request(app).get('/users/not-an-id/sessions');

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([{ path: 'id', message: expect.any(String) }]);
  });
});
