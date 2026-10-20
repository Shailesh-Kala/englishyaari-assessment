import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { Session, SessionStatus } from '../../src/sessions/session.model.js';
import { Teacher } from '../../src/teachers/teacher.model.js';
import { User } from '../../src/users/user.model.js';
import { TEST_NOW, testApp } from '../setup/test-app.js';
import { useTestDb } from '../setup/test-db.js';

const MISSING_ID = '0000000000000000000000ff';
const HOUR = 60 * 60 * 1000;

async function createUser(n: number) {
  const user = await User.create({
    fullName: `User ${n}`,
    email: `user${n}@example.com`,
    phone: `+9198765432${String(n).padStart(2, '0')}`,
  });
  return user.id as string;
}

describe('POST /sessions/:id/book', () => {
  useTestDb();
  const app = testApp();
  let teacherId: string;
  let userId: string;

  beforeEach(async () => {
    const teacher = await Teacher.create({
      fullName: 'Priya Sharma',
      email: 'priya@example.com',
      specialization: 'Spoken English',
      experience: 6,
    });
    teacherId = teacher.id;
    userId = await createUser(1);
  });

  async function createSession(
    status: SessionStatus = SessionStatus.AVAILABLE,
    startsInMs = 24 * HOUR,
  ) {
    const startTime = new Date(TEST_NOW.getTime() + startsInMs);
    const session = await Session.create({
      teacherId,
      startTime,
      endTime: new Date(startTime.getTime() + HOUR),
      status,
    });
    return session.id as string;
  }

  const book = (sessionId: string, body: object = { userId }) =>
    request(app).post(`/sessions/${sessionId}/book`).send(body);

  it('books the session for the user and returns 200', async () => {
    const sessionId = await createSession();

    const res = await book(sessionId);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ _id: sessionId, status: 'BOOKED', userId, teacherId });
  });

  it('returns 409 SESSION_NOT_AVAILABLE when the session is already booked', async () => {
    const sessionId = await createSession();
    await book(sessionId);

    const res = await book(sessionId, { userId: await createUser(2) });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SESSION_NOT_AVAILABLE');
  });

  it('returns 409 SESSION_NOT_AVAILABLE for a completed session', async () => {
    const res = await book(await createSession(SessionStatus.COMPLETED));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SESSION_NOT_AVAILABLE');
  });

  it('returns 409 SESSION_ALREADY_STARTED for a session that has started', async () => {
    const res = await book(await createSession(SessionStatus.AVAILABLE, -HOUR / 2));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SESSION_ALREADY_STARTED');
  });

  it('returns 404 USER_NOT_FOUND for an unknown user', async () => {
    const res = await book(await createSession(), { userId: MISSING_ID });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('USER_NOT_FOUND');
  });

  it('returns 404 SESSION_NOT_FOUND for an unknown session', async () => {
    const res = await book(MISSING_ID);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('SESSION_NOT_FOUND');
  });

  it.each([
    ['a malformed session id', 'not-an-id', undefined, 'id'],
    ['a malformed userId', null, { userId: 'nope' }, 'userId'],
    ['a missing userId', null, {}, 'userId'],
  ])('returns 400 for %s', async (_label, pathId, body, field) => {
    const sessionId = pathId ?? (await createSession());

    const res = await book(sessionId, body);

    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toContain(field);
  });

  it('lets exactly one of several users booking simultaneously win', async () => {
    const sessionId = await createSession();
    const userIds = await Promise.all([2, 3, 4, 5, 6].map(createUser));

    const results = await Promise.all(userIds.map((id) => book(sessionId, { userId: id })));

    const winners = results.filter((r) => r.status === 200);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409, 409, 409, 409]);
    const stored = await Session.findById(sessionId).lean();
    expect(String(stored!.userId)).toBe(winners[0]!.body.userId);
  });
});
