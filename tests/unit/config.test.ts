import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config.js';

describe('loadConfig', () => {
  it('throws when MONGODB_URI is missing', () => {
    expect(() => loadConfig({})).toThrow(/MONGODB_URI/);
  });

  it('throws when PORT is not a number', () => {
    expect(() => loadConfig({ MONGODB_URI: 'mongodb://localhost/db', PORT: 'abc' })).toThrow(
      /PORT/,
    );
  });

  it('applies defaults for optional values', () => {
    expect(loadConfig({ MONGODB_URI: 'mongodb://localhost/db' })).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      MONGODB_URI: 'mongodb://localhost/db',
      LOG_LEVEL: 'info',
    });
  });
});
