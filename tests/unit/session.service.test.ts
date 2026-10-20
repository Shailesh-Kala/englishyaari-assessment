import { describe, expect, it } from 'vitest';
import { AppError } from '../../src/errors.js';
import { createSessionService } from '../../src/sessions/session.service.js';
import { createFakeSessionRepository } from '../fakes/session-repository.js';
import { createFakeTeacherRepository } from '../fakes/teacher-repository.js';

const TEACHER_ID = '0000000000000000000000aa';
const input = {
  teacherId: TEACHER_ID,
  startTime: new Date('2026-10-21T04:30:00.000Z'),
  endTime: new Date('2026-10-21T05:30:00.000Z'),
};

function setup(teacherIds = [TEACHER_ID]) {
  const sessionRepo = createFakeSessionRepository();
  const service = createSessionService({
    sessionRepo,
    teacherRepo: createFakeTeacherRepository(teacherIds),
  });
  return { service, sessionRepo };
}

describe('sessionService.create', () => {
  it('creates an AVAILABLE session for an existing teacher', async () => {
    const { service } = setup();

    const session = await service.create(input);

    expect(session).toMatchObject({ status: 'AVAILABLE', userId: null, completedAt: null });
    expect(String(session.teacherId)).toBe(TEACHER_ID);
  });

  it('throws 404 TEACHER_NOT_FOUND and stores nothing when the teacher does not exist', async () => {
    const { service, sessionRepo } = setup([]);

    const error = await service.create(input).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ status: 404, code: 'TEACHER_NOT_FOUND' });
    expect(sessionRepo.all()).toHaveLength(0);
  });
});
