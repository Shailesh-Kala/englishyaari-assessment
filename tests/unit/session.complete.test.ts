import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { AppError } from '../../src/errors.js';
import { SessionStatus } from '../../src/sessions/session.model.js';
import { createSessionService } from '../../src/sessions/session.service.js';
import { createFakeSessionRepository } from '../fakes/session-repository.js';
import { createFakeTeacherRepository } from '../fakes/teacher-repository.js';
import { createFakeUserRepository } from '../fakes/user-repository.js';

const NOW = new Date('2026-10-21T06:00:00.000Z');
const MISSING_ID = '0000000000000000000000ff';

function setup(sessionRepo = createFakeSessionRepository()) {
  const service = createSessionService({
    sessionRepo,
    teacherRepo: createFakeTeacherRepository(),
    userRepo: createFakeUserRepository(),
    clock: () => NOW,
  });
  return { service, sessionRepo };
}

const booked = { status: SessionStatus.BOOKED, userId: new Types.ObjectId() };

async function expectAppError(promise: Promise<unknown>, status: number, code: string) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AppError);
  expect(error).toMatchObject({ status, code });
}

describe('sessionService.complete', () => {
  it('marks a BOOKED session COMPLETED with completedAt = now', async () => {
    const { service, sessionRepo } = setup();
    const session = sessionRepo.seed(booked);

    const completed = await service.complete(String(session._id));

    expect(completed).toMatchObject({ status: SessionStatus.COMPLETED, completedAt: NOW });
  });

  it('throws 404 SESSION_NOT_FOUND for an unknown session', async () => {
    const { service } = setup();

    await expectAppError(service.complete(MISSING_ID), 404, 'SESSION_NOT_FOUND');
  });

  it.each([SessionStatus.AVAILABLE, SessionStatus.COMPLETED])(
    'throws 409 SESSION_NOT_BOOKED for a session with status %s',
    async (status) => {
      const { service, sessionRepo } = setup();
      const session = sessionRepo.seed({ status });

      await expectAppError(service.complete(String(session._id)), 409, 'SESSION_NOT_BOOKED');
    },
  );

  it('throws 409 SESSION_NOT_BOOKED when another request completes it after the check', async () => {
    const sessionRepo = createFakeSessionRepository();
    const session = sessionRepo.seed(booked);
    const { service } = setup({ ...sessionRepo, completeIfBooked: async () => null });

    await expectAppError(service.complete(String(session._id)), 409, 'SESSION_NOT_BOOKED');
  });
});
