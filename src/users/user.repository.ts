import mongoose, { type Types } from 'mongoose';
import type { CreateUserInput } from './user.schemas.js';
import { User, type UserDoc } from './user.model.js';

const DUPLICATE_KEY = 11000;

export type UserRecord = UserDoc & { _id: Types.ObjectId };

export type UserRepository = {
  existsByEmail(email: string): Promise<boolean>;
  /** Returns null when the unique email index rejects the insert. */
  create(input: CreateUserInput): Promise<UserRecord | null>;
};

export const userRepository: UserRepository = {
  async existsByEmail(email) {
    return (await User.exists({ email })) !== null;
  },

  async create(input) {
    try {
      return (await User.create(input)).toObject();
    } catch (err) {
      if (err instanceof mongoose.mongo.MongoServerError && err.code === DUPLICATE_KEY) return null;
      throw err;
    }
  },
};
