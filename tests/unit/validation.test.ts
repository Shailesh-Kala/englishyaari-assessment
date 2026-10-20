import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { objectIdSchema } from '../../src/validation.js';

describe('objectIdSchema', () => {
  it('parses a 24-char hex string into a Types.ObjectId', () => {
    const id = objectIdSchema.parse('6650f0c2a1b2c3d4e5f60789');

    expect(id).toBeInstanceOf(Types.ObjectId);
    expect(String(id)).toBe('6650f0c2a1b2c3d4e5f60789');
  });

  it.each(['', 'not-an-id', '6650f0c2a1b2c3d4e5f6078', '6650f0c2a1b2c3d4e5f60789z'])(
    'rejects %j',
    (value) => {
      expect(objectIdSchema.safeParse(value).success).toBe(false);
    },
  );
});
