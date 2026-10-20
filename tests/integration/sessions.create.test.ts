import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { Teacher } from '../../src/teachers/teacher.model.js';
import { testApp } from '../setup/test-app.js';
import { useTestDb } from '../setup/test-db.js';

describe('POST /sessions', () => {
  useTestDb();
  const app = testApp();
  let teacherId: string;

  beforeEach(async () => {
    const teacher = await Teacher.create({
      fullName: 'Priya Sharma',
      email: 'priya@example.com',
      specialization: 'Spoken English',
      experience: 6,
    });
    teacherId = teacher.id;
  });

  const slot = () => ({
    teacherId,
    startTime: '2026-10-21T04:30:00.000Z',
    endTime: '2026-10-21T05:30:00.000Z',
  });

  it('creates an AVAILABLE session and returns 201', async () => {
    const res = await request(app).post('/sessions').send(slot());

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      _id: expect.stringMatching(/^[a-f\d]{24}$/),
      teacherId,
      userId: null,
      startTime: '2026-10-21T04:30:00.000Z',
      endTime: '2026-10-21T05:30:00.000Z',
      status: 'AVAILABLE',
      completedAt: null,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('accepts epoch-millisecond times', async () => {
    const res = await request(app)
      .post('/sessions')
      .send({
        teacherId,
        startTime: Date.parse('2026-10-21T04:30:00.000Z'),
        endTime: Date.parse('2026-10-21T05:30:00.000Z'),
      });

    expect(res.status).toBe(201);
    expect(res.body.startTime).toBe('2026-10-21T04:30:00.000Z');
  });

  it('ignores status, userId and completedAt sent by the client', async () => {
    const res = await request(app)
      .post('/sessions')
      .send({
        ...slot(),
        status: 'BOOKED',
        userId: '000000000000000000000001',
        completedAt: '2026-10-21T06:00:00.000Z',
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: 'AVAILABLE', userId: null, completedAt: null });
  });

  it.each([
    ['equal to', '2026-10-21T04:30:00.000Z'],
    ['before', '2026-10-21T04:00:00.000Z'],
  ])('returns 400 when endTime is %s startTime', async (_label, endTime) => {
    const res = await request(app)
      .post('/sessions')
      .send({ ...slot(), endTime });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([{ path: 'endTime', message: expect.any(String) }]);
  });

  it.each([
    ['teacherId', { teacherId: 'not-an-object-id' }],
    ['startTime', { startTime: 'tomorrow morning' }],
    ['endTime', { endTime: null }],
  ])('returns 400 for an invalid %s', async (field, override) => {
    const res = await request(app)
      .post('/sessions')
      .send({ ...slot(), ...override });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toContain(field);
  });

  it('returns 404 TEACHER_NOT_FOUND for a well-formed but unknown teacherId', async () => {
    const res = await request(app)
      .post('/sessions')
      .send({ ...slot(), teacherId: '0000000000000000000000aa' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('TEACHER_NOT_FOUND');
  });
});
