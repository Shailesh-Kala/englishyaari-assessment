import { describe, expect, it } from 'vitest';
import { AppError } from '../../src/errors.js';
import { SessionStatus } from '../../src/sessions/session.model.js';
import { createSessionService } from '../../src/sessions/session.service.js';
import { createFakeSessionRepository } from '../fakes/session-repository.js';
import { createFakeTeacherRepository } from '../fakes/teacher-repository.js';
import { createFakeUserRepository } from '../fakes/user-repository.js';

const NOW = new Date('2026-10-20T12:00:00.000Z');
const MISSING_ID = '0000000000000000000000ff';

async function setup() {
  const sessionRepo = createFakeSessionRepository();
  const userRepo = createFakeUserRepository();
  const user = await userRepo.create({
    fullName: 'Asha Rao',
    email: 'asha@example.com',
    phone: '+919876543210',
  });
  const service = createSessionService({
    sessionRepo,
    teacherRepo: createFakeTeacherRepository(),
    userRepo,
    clock: () => NOW,
  });
  return { service, sessionRepo, userId: String(user!._id) };
}

async function expectAppError(promise: Promise<unknown>, status: number, code: string) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AppError);
  expect(error).toMatchObject({ status, code });
}

describe('sessionService.book', () => {
  it('books an AVAILABLE future session for the user', async () => {
    const { service, sessionRepo, userId } = await setup();
    const session = sessionRepo.seed({});

    const booked = await service.book(String(session._id), userId);

    expect(booked.status).toBe(SessionStatus.BOOKED);
    expect(String(booked.userId)).toBe(userId);
  });

  it('checks the user first: unknown user → 404 USER_NOT_FOUND even if the session is missing too', async () => {
    const { service } = await setup();

    await expectAppError(service.book(MISSING_ID, MISSING_ID), 404, 'USER_NOT_FOUND');
  });

  it('throws 404 SESSION_NOT_FOUND for an unknown session', async () => {
    const { service, userId } = await setup();

    await expectAppError(service.book(MISSING_ID, userId), 404, 'SESSION_NOT_FOUND');
  });

  it.each([SessionStatus.BOOKED, SessionStatus.COMPLETED])(
    'throws 409 SESSION_NOT_AVAILABLE for a %s session',
    async (status) => {
      const { service, sessionRepo, userId } = await setup();
      const session = sessionRepo.seed({ status });

      await expectAppError(service.book(String(session._id), userId), 409, 'SESSION_NOT_AVAILABLE');
    },
  );

  it.each([
    ['already started', new Date('2026-10-20T11:00:00.000Z')],
    ['starting exactly now', NOW],
  ])('throws 409 SESSION_ALREADY_STARTED for a session %s', async (_label, startTime) => {
    const { service, sessionRepo, userId } = await setup();
    const session = sessionRepo.seed({ startTime });

    await expectAppError(service.book(String(session._id), userId), 409, 'SESSION_ALREADY_STARTED');
  });

  it('throws 409 SESSION_NOT_AVAILABLE when another booking wins after the checks', async () => {
    const { sessionRepo, userId } = await setup();
    const session = sessionRepo.seed({});
    const losingService = createSessionService({
      sessionRepo: { ...sessionRepo, bookIfAvailable: async () => null },
      teacherRepo: createFakeTeacherRepository(),
      userRepo: { ...createFakeUserRepository(), exists: async () => true },
      clock: () => NOW,
    });

    await expectAppError(
      losingService.book(String(session._id), userId),
      409,
      'SESSION_NOT_AVAILABLE',
    );
  });
});
