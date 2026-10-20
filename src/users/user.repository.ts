import mongoose from 'mongoose';
import type { CreateUserInput } from './user.schemas.js';
import { User } from './user.model.js';

const DUPLICATE_KEY = 11000;

export const userRepository = {
  // Returns null when the email is already taken (the unique index rejects it atomically).
  async create(input: CreateUserInput) {
    try {
      return (await User.create(input)).toObject();
    } catch (err) {
      if (err instanceof mongoose.mongo.MongoServerError && err.code === DUPLICATE_KEY) return null;
      throw err;
    }
  },
};

export type UserRepository = typeof userRepository;
