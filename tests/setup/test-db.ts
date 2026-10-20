import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll, inject } from 'vitest';

// Connects the suite to its own database (one per worker) and wipes it between tests.
export function useTestDb() {
  beforeAll(async () => {
    await mongoose.connect(inject('mongoUri'), { dbName: `test-${process.env.VITEST_POOL_ID}` });
    // Build indexes up front (unique email etc.) — they're dropped with the DB after each file.
    await mongoose.connection.syncIndexes();
  });

  afterEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    await Promise.all(collections.map((collection) => collection.deleteMany({})));
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
}
