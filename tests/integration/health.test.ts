import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { testApp } from '../setup/test-app.js';
import { useTestDb } from '../setup/test-db.js';

describe('GET /health with database connected', () => {
  useTestDb();

  it('returns 200 and db up', async () => {
    const res = await request(testApp()).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'up' });
  });
});

describe('GET /health with database disconnected', () => {
  it('returns 503 and db down', async () => {
    const res = await request(testApp()).get('/health');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'error', db: 'down' });
  });
});
