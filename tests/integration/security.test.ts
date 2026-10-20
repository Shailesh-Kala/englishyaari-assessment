import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ALLOWED_ORIGIN, testApp } from '../setup/test-app.js';

describe('security headers', () => {
  it('sets helmet headers and hides x-powered-by', async () => {
    const res = await request(testApp()).get('/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('CORS', () => {
  it('allows an origin on the allowlist', async () => {
    const res = await request(testApp()).get('/health').set('origin', ALLOWED_ORIGIN);

    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
  });

  it('does not allow an origin missing from the allowlist', async () => {
    const res = await request(testApp()).get('/health').set('origin', 'http://evil.test');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('rate limiting', () => {
  it('returns 429 RATE_LIMITED once the limit is exceeded', async () => {
    const app = testApp({ rateLimit: { windowMs: 60_000, max: 2 } });

    await request(app).get('/health');
    await request(app).get('/health');
    const res = await request(app).get('/health');

    expect(res.status).toBe(429);
    expect(res.body.error).toMatchObject({ code: 'RATE_LIMITED' });
    expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
  });
});

describe('body size limit', () => {
  it('returns 413 PAYLOAD_TOO_LARGE for a JSON body over 10 kb', async () => {
    const res = await request(testApp())
      .post('/users')
      .send({ fullName: 'x'.repeat(11 * 1024) });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
