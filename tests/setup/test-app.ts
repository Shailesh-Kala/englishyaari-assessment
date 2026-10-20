import { createApp, type AppOptions } from '../../src/app.js';
import { silentLogger } from './silent-logger.js';

export const ALLOWED_ORIGIN = 'http://allowed.test';

// createApp with test-friendly defaults; override per test where needed.
export function testApp(overrides: Partial<AppOptions> = {}) {
  return createApp({
    logger: silentLogger,
    corsOrigins: [ALLOWED_ORIGIN],
    rateLimit: { windowMs: 60_000, max: 1_000 },
    ...overrides,
  });
}
