import { Types } from 'mongoose';
import type { UserRecord, UserRepository } from '../../src/users/user.repository.js';
import type { CreateUserInput } from '../../src/users/user.schemas.js';

const FIXED_DATE = new Date('2026-10-20T10:00:00.000Z');

// In-memory stand-in for userRepository: same contract, no database.
export function createFakeUserRepository(): UserRepository & { all(): UserRecord[] } {
  const users: UserRecord[] = [];

  return {
    async exists(id: Types.ObjectId) {
      return users.some((user) => user._id.equals(id));
    },
    async existsByEmail(email: string) {
      return users.some((user) => user.email === email);
    },
    async create(input: CreateUserInput) {
      if (users.some((user) => user.email === input.email)) return null; // like the unique index
      const user: UserRecord = {
        _id: new Types.ObjectId(String(users.length + 1).padStart(24, '0')),
        ...input,
        createdAt: FIXED_DATE,
        updatedAt: FIXED_DATE,
      };
      users.push(user);
      return user;
    },
    all: () => users,
  };
}
