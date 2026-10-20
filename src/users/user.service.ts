import { AppError } from '../errors.js';
import type { UserRepository } from './user.repository.js';
import type { CreateUserInput } from './user.schemas.js';

export function createUserService({ userRepo }: { userRepo: Pick<UserRepository, 'create'> }) {
  return {
    async create(input: CreateUserInput) {
      const user = await userRepo.create(input);
      if (!user) {
        throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'A user with this email already exists');
      }
      return user;
    },
  };
}

export type UserService = ReturnType<typeof createUserService>;
