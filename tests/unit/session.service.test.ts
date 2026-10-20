import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { AppError } from '../../src/errors.js';
import { createSessionService } from '../../src/sessions/session.service.js';
import { createFakeSessionRepository } from '../fakes/session-repository.js';
import { createFakeTeacherRepository } from '../fakes/teacher-repository.js';
import { createFakeUserRepository } from '../fakes/user-repository.js';

const TEACHER_ID = new Types.ObjectId('0000000000000000000000aa');
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
    userRepo: createFakeUserRepository(),
    clock: () => new Date('2026-10-20T12:00:00.000Z'),
  });
  return { service, sessionRepo };
}

describe('sessionService.create', () => {
  it('creates an AVAILABLE session for an existing teacher', async () => {
    const { service } = setup();

    const session = await service.create(input);

    expect(session).toMatchObject({ status: 'AVAILABLE', userId: null, completedAt: null });
    expect(session.teacherId).toEqual(TEACHER_ID);
  });

  it('throws 404 TEACHER_NOT_FOUND and stores nothing when the teacher does not exist', async () => {
    const { service, sessionRepo } = setup([]);

    const error = await service.create(input).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ status: 404, code: 'TEACHER_NOT_FOUND' });
    expect(sessionRepo.all()).toHaveLength(0);
  });
});

describe('sessionService.create overlap rule', () => {
  it('throws 409 SESSION_OVERLAP when the slot overlaps an existing one', async () => {
    const { service } = setup();
    await service.create(input);

    const error = await service
      .create({
        ...input,
        startTime: new Date('2026-10-21T05:00:00.000Z'),
        endTime: new Date('2026-10-21T06:00:00.000Z'),
      })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ status: 409, code: 'SESSION_OVERLAP' });
  });

  it('allows a back-to-back slot', async () => {
    const { service, sessionRepo } = setup();
    await service.create(input);

    await service.create({
      ...input,
      startTime: input.endTime,
      endTime: new Date('2026-10-21T06:30:00.000Z'),
    });

    expect(sessionRepo.all()).toHaveLength(2);
  });
});
