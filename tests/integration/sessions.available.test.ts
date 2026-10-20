import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { Session } from '../../src/sessions/session.model.js';
import { Teacher } from '../../src/teachers/teacher.model.js';
import { testApp } from '../setup/test-app.js';
import { useTestDb } from '../setup/test-db.js';

const ist = (local: string) => new Date(`${local}+05:30`); // e.g. ist('2026-10-21T10:00')
const NOON_21_OCT_IST = ist('2026-10-21T12:00').getTime();

describe('GET /sessions/available', () => {
  useTestDb();
  const app = testApp(); // now = 20 Oct 17:30 IST, so all of 21 Oct is in the future
  let teacher: { _id: string; fullName: string; specialization: string };

  beforeEach(async () => {
    const doc = await Teacher.create({
      fullName: 'Priya Sharma',
      email: 'priya@example.com',
      specialization: 'Spoken English',
      experience: 6,
    });
    teacher = { _id: doc.id, fullName: doc.fullName, specialization: doc.specialization };
  });

  const insert = (startLocal: string, endLocal: string, status = 'AVAILABLE') =>
    Session.create({
      teacherId: teacher._id,
      startTime: ist(startLocal),
      endTime: ist(endLocal),
      status,
    });

  const getAvailable = (dateTimestamp: number | string, appUnderTest = app) =>
    request(appUnderTest).get('/sessions/available').query({ dateTimestamp });

  it('returns AVAILABLE sessions on that IST day, sorted by startTime, with teacher info', async () => {
    const noon = await insert('2026-10-21T12:00', '2026-10-21T13:00');
    const morning = await insert('2026-10-21T10:00', '2026-10-21T11:00');

    const res = await getAvailable(NOON_21_OCT_IST);

    expect(res.status).toBe(200);
    expect(res.body.map((s: { _id: string }) => s._id)).toEqual([morning.id, noon.id]);
    expect(res.body[0]).toEqual({
      _id: morning.id,
      teacherId: teacher._id,
      userId: null,
      startTime: '2026-10-21T04:30:00.000Z',
      endTime: '2026-10-21T05:30:00.000Z',
      status: 'AVAILABLE',
      completedAt: null,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      teacher,
    });
  });

  it('excludes booked and completed sessions and other days', async () => {
    const wanted = await insert('2026-10-21T10:00', '2026-10-21T11:00');
    await insert('2026-10-21T12:00', '2026-10-21T13:00', 'BOOKED');
    await insert('2026-10-21T14:00', '2026-10-21T15:00', 'COMPLETED');
    await insert('2026-10-22T10:00', '2026-10-22T11:00');
    await insert('2026-10-20T20:00', '2026-10-20T21:00');

    const res = await getAvailable(NOON_21_OCT_IST);

    expect(res.body.map((s: { _id: string }) => s._id)).toEqual([wanted.id]);
  });

  it('uses IST day boundaries, not UTC', async () => {
    // 00:15 IST on 21 Oct is still 20 Oct in UTC; 23:45 IST on 20 Oct is the previous IST day.
    const justAfterMidnight = await insert('2026-10-21T00:15', '2026-10-21T01:00');
    await insert('2026-10-20T23:45', '2026-10-21T00:15');

    const res = await getAvailable(NOON_21_OCT_IST);

    expect(res.body.map((s: { _id: string }) => s._id)).toEqual([justAfterMidnight.id]);
  });

  it('excludes sessions that have already started, including one starting exactly now', async () => {
    const appAt11 = testApp({ clock: () => ist('2026-10-21T11:00') });
    await insert('2026-10-21T10:00', '2026-10-21T11:00');
    await insert('2026-10-21T11:00', '2026-10-21T12:00');
    const later = await insert('2026-10-21T12:00', '2026-10-21T13:00');

    const res = await getAvailable(NOON_21_OCT_IST, appAt11);

    expect(res.body.map((s: { _id: string }) => s._id)).toEqual([later.id]);
  });

  it('returns 200 with an empty list for a day with no sessions', async () => {
    const res = await getAvailable(NOON_21_OCT_IST);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['not a number', 'tomorrow'],
    ['negative', '-1'],
    ['fractional', '1.5'],
  ])('returns 400 when dateTimestamp is %s', async (_label, value) => {
    const res =
      value === undefined
        ? await request(app).get('/sessions/available')
        : await getAvailable(value);

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([
      { path: 'dateTimestamp', message: expect.any(String) },
    ]);
  });
});
