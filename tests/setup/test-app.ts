import { createApp, type AppOptions } from '../../src/app.js';
import { silentLogger } from './silent-logger.js';

export const ALLOWED_ORIGIN = 'http://allowed.test';
export const TEST_NOW = new Date('2026-10-20T12:00:00.000Z'); // 17:30 IST, 20 Oct

// createApp with test-friendly defaults; override per test where needed.
export function testApp(overrides: Partial<AppOptions> = {}) {
  return createApp({
    logger: silentLogger,
    corsOrigins: [ALLOWED_ORIGIN],
    rateLimit: { windowMs: 60_000, max: 1_000 },
    clock: () => TEST_NOW,
    ...overrides,
  });
}
