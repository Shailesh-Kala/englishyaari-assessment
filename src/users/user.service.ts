import { AppError } from '../errors.js';
import type { UserRepository } from './user.repository.js';
import type { CreateUserInput } from './user.schemas.js';

function emailTaken() {
  return new AppError(409, 'EMAIL_ALREADY_EXISTS', 'A user with this email already exists');
}

export function createUserService({ userRepo }: { userRepo: UserRepository }) {
  return {
    async create(input: CreateUserInput) {
      if (await userRepo.existsByEmail(input.email)) throw emailTaken();
      // A concurrent sign-up can still win between the check and the insert;
      // the unique index rejects it and the repository returns null.
      const user = await userRepo.create(input);
      if (!user) throw emailTaken();
      return user;
    },
  };
}

export type UserService = ReturnType<typeof createUserService>;
