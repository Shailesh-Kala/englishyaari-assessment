import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { AppError } from '../../src/errors.js';
import { SessionStatus } from '../../src/sessions/session.model.js';
import { createSessionService } from '../../src/sessions/session.service.js';
import { createFakeSessionRepository } from '../fakes/session-repository.js';
import { createFakeTeacherRepository } from '../fakes/teacher-repository.js';
import { createFakeUserRepository } from '../fakes/user-repository.js';

const teacher = { _id: new Types.ObjectId(), fullName: 'Priya Sharma', specialization: 'IELTS' };

async function setup() {
  const sessionRepo = createFakeSessionRepository([teacher]);
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
    clock: () => new Date('2026-10-20T12:00:00.000Z'),
  });
  return { service, sessionRepo, user: user! };
}

describe('sessionService.listForUser', () => {
  it("returns the user's booked sessions as upcoming and completed ones as completed", async () => {
    const { service, sessionRepo, user } = await setup();
    const booked = sessionRepo.seed({
      teacherId: teacher._id,
      userId: user._id,
      status: SessionStatus.BOOKED,
    });
    const done = sessionRepo.seed({
      teacherId: teacher._id,
      userId: user._id,
      status: SessionStatus.COMPLETED,
      completedAt: new Date('2026-10-19T10:00:00.000Z'),
    });

    const result = await service.listForUser(user._id);

    expect(result.upcoming.map((s) => s._id)).toEqual([booked._id]);
    expect(result.completed.map((s) => s._id)).toEqual([done._id]);
    expect(result.upcoming[0]!.teacher).toEqual(teacher);
  });

  it('throws 404 USER_NOT_FOUND for an unknown user', async () => {
    const { service } = await setup();

    const error = await service
      .listForUser(new Types.ObjectId('0000000000000000000000ff'))
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ status: 404, code: 'USER_NOT_FOUND' });
  });
});
