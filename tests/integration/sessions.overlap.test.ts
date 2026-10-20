import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { Session } from '../../src/sessions/session.model.js';
import { Teacher } from '../../src/teachers/teacher.model.js';
import { testApp } from '../setup/test-app.js';
import { useTestDb } from '../setup/test-db.js';

// Existing slot for every test: 10:00–11:00 IST (04:30–05:30 UTC) on 21 Oct 2026.
const EXISTING = { startTime: '2026-10-21T04:30:00.000Z', endTime: '2026-10-21T05:30:00.000Z' };

async function createTeacher(email: string) {
  const teacher = await Teacher.create({
    fullName: 'Teacher',
    email,
    specialization: 'Spoken English',
    experience: 3,
  });
  return teacher.id as string;
}

describe('POST /sessions overlap rule', () => {
  useTestDb();
  const app = testApp();
  let teacherId: string;

  beforeEach(async () => {
    teacherId = await createTeacher('priya@example.com');
  });

  const post = (startTime: string, endTime: string, forTeacher = teacherId) =>
    request(app).post('/sessions').send({ teacherId: forTeacher, startTime, endTime });

  it.each(['AVAILABLE', 'BOOKED', 'COMPLETED'])(
    'returns 409 SESSION_OVERLAP against an existing %s session',
    async (status) => {
      await Session.create({ teacherId, ...EXISTING, status });

      const res = await post(EXISTING.startTime, EXISTING.endTime);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('SESSION_OVERLAP');
    },
  );

  it.each([
    ['starts inside it', '2026-10-21T05:00:00.000Z', '2026-10-21T06:00:00.000Z'],
    ['ends inside it', '2026-10-21T04:00:00.000Z', '2026-10-21T05:00:00.000Z'],
    ['contains it', '2026-10-21T04:00:00.000Z', '2026-10-21T06:00:00.000Z'],
    ['sits inside it', '2026-10-21T04:45:00.000Z', '2026-10-21T05:15:00.000Z'],
  ])('returns 409 for a slot that %s', async (_label, startTime, endTime) => {
    await post(EXISTING.startTime, EXISTING.endTime);

    const res = await post(startTime, endTime);

    expect(res.status).toBe(409);
  });

  it.each([
    ['right before', '2026-10-21T03:30:00.000Z', EXISTING.startTime],
    ['right after', EXISTING.endTime, '2026-10-21T06:30:00.000Z'],
  ])('allows a back-to-back slot %s', async (_label, startTime, endTime) => {
    await post(EXISTING.startTime, EXISTING.endTime);

    const res = await post(startTime, endTime);

    expect(res.status).toBe(201);
  });

  it('allows another teacher at the same time', async () => {
    await post(EXISTING.startTime, EXISTING.endTime);
    const otherTeacherId = await createTeacher('rahul@example.com');

    const res = await post(EXISTING.startTime, EXISTING.endTime, otherTeacherId);

    expect(res.status).toBe(201);
  });

  it('lets exactly one of several simultaneous overlapping creates succeed', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => post(EXISTING.startTime, EXISTING.endTime)),
    );

    expect(results.map((r) => r.status).sort()).toEqual([201, 409, 409, 409, 409]);
    expect(await Session.countDocuments({ teacherId })).toBe(1);
  });
});
