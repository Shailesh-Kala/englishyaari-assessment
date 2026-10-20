import { describe, expect, it } from 'vitest';
import { AppError } from '../../src/errors.js';
import { createUserService } from '../../src/users/user.service.js';
import { createFakeUserRepository } from '../fakes/user-repository.js';

const input = { fullName: 'Asha Rao', email: 'asha@example.com', phone: '+919876543210' };

async function expectEmailTaken(promise: Promise<unknown>) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AppError);
  expect(error).toMatchObject({ status: 409, code: 'EMAIL_ALREADY_EXISTS' });
}

describe('userService.create', () => {
  it('stores and returns the new user', async () => {
    const userRepo = createFakeUserRepository();
    const service = createUserService({ userRepo });

    const user = await service.create(input);

    expect(user).toMatchObject(input);
    expect(userRepo.all()).toHaveLength(1);
  });

  it('rejects an email that already exists without trying to insert', async () => {
    const userRepo = createFakeUserRepository();
    await userRepo.create(input);
    let insertAttempted = false;
    const service = createUserService({
      userRepo: {
        ...userRepo,
        create: async (data) => {
          insertAttempted = true;
          return userRepo.create(data);
        },
      },
    });

    await expectEmailTaken(service.create({ ...input, phone: '+919876543211' }));
    expect(insertAttempted).toBe(false);
  });

  it('still returns 409 when a concurrent sign-up wins between the check and the insert', async () => {
    const userRepo = createFakeUserRepository();
    await userRepo.create(input);
    // The pre-check misses the other request's insert; the unique index catches it.
    const service = createUserService({
      userRepo: { ...userRepo, existsByEmail: async () => false },
    });

    await expectEmailTaken(service.create(input));
  });
});
