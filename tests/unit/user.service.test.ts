import { describe, expect, it } from 'vitest';
import { AppError } from '../../src/errors.js';
import { createUserService } from '../../src/users/user.service.js';

const input = { fullName: 'Asha Rao', email: 'asha@example.com', phone: '+919876543210' };

describe('userService.create', () => {
  it('returns the created user', async () => {
    const created = { _id: 'u1', ...input };
    const service = createUserService({ userRepo: { create: async () => created } });

    await expect(service.create(input)).resolves.toBe(created);
  });

  it('throws 409 EMAIL_ALREADY_EXISTS when the repository reports a taken email', async () => {
    const service = createUserService({ userRepo: { create: async () => null } });

    const error = await service.create(input).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ status: 409, code: 'EMAIL_ALREADY_EXISTS' });
  });
});
