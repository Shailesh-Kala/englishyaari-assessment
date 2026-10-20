import { Types } from 'mongoose';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { Session, SessionStatus } from '../../src/sessions/session.model.js';
import { TEST_NOW, testApp } from '../setup/test-app.js';
import { useTestDb } from '../setup/test-db.js';

const MISSING_ID = '0000000000000000000000ff';

async function createSession(status: SessionStatus) {
  const session = await Session.create({
    teacherId: new Types.ObjectId(),
    userId: status === SessionStatus.AVAILABLE ? null : new Types.ObjectId(),
    startTime: new Date('2026-10-20T09:00:00.000Z'),
    endTime: new Date('2026-10-20T10:00:00.000Z'),
    status,
  });
  return session.id as string;
}

describe('PATCH /sessions/:id/complete', () => {
  useTestDb();
  const app = testApp();
  const complete = (id: string) => request(app).patch(`/sessions/${id}/complete`);

  it('completes a BOOKED session and sets completedAt to now', async () => {
    const sessionId = await createSession(SessionStatus.BOOKED);

    const res = await complete(sessionId);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      _id: sessionId,
      status: 'COMPLETED',
      completedAt: TEST_NOW.toISOString(),
    });
  });

  it.each([SessionStatus.AVAILABLE, SessionStatus.COMPLETED])(
    'returns 409 SESSION_NOT_BOOKED for a session with status %s',
    async (status) => {
      const res = await complete(await createSession(status));

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('SESSION_NOT_BOOKED');
    },
  );

  it('returns 404 SESSION_NOT_FOUND for an unknown session', async () => {
    const res = await complete(MISSING_ID);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('SESSION_NOT_FOUND');
  });

  it('returns 400 for a malformed session id', async () => {
    const res = await complete('not-an-id');

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([{ path: 'id', message: expect.any(String) }]);
  });

  it('completes only once when several requests arrive simultaneously', async () => {
    const sessionId = await createSession(SessionStatus.BOOKED);

    const results = await Promise.all(Array.from({ length: 5 }, () => complete(sessionId)));

    expect(results.map((r) => r.status).sort()).toEqual([200, 409, 409, 409, 409]);
  });
});
