import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createApp } from '../../src/app.js';
import { AppError, errorHandler } from '../../src/errors.js';
import { requestLogger } from '../../src/request-logger.js';
import { silentLogger } from '../setup/silent-logger.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function appThatThrows(error: unknown) {
  return express()
    .use(requestLogger(silentLogger))
    .get('/boom', () => {
      throw error;
    })
    .use(errorHandler);
}

describe('request id', () => {
  const app = createApp({ logger: silentLogger });

  it('generates an x-request-id when the client sends none', async () => {
    const res = await request(app).get('/health');

    expect(res.headers['x-request-id']).toMatch(UUID);
  });

  it('echoes a valid incoming x-request-id', async () => {
    const res = await request(app).get('/health').set('x-request-id', 'client-req-42');

    expect(res.headers['x-request-id']).toBe('client-req-42');
  });

  it('replaces an unsafe incoming x-request-id', async () => {
    const res = await request(app).get('/health').set('x-request-id', 'bad id\twith spaces');

    expect(res.headers['x-request-id']).toMatch(UUID);
  });
});

describe('central error handling', () => {
  const app = createApp({ logger: silentLogger });

  it('returns 404 ROUTE_NOT_FOUND for unknown routes in the standard shape', async () => {
    const res = await request(app).get('/nope');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'Route GET /nope not found',
        requestId: res.headers['x-request-id'],
      },
    });
  });

  it('returns 400 INVALID_JSON for a malformed JSON body', async () => {
    const res = await request(app)
      .post('/users')
      .set('content-type', 'application/json')
      .send('{"fullName":');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('maps an AppError to its status and code', async () => {
    const res = await request(appThatThrows(new AppError(409, 'CONFLICT_X', 'Already there'))).get(
      '/boom',
    );

    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'CONFLICT_X', message: 'Already there' });
  });

  it('maps a ZodError to 400 VALIDATION_ERROR with field details', async () => {
    const zodError = z.object({ email: z.email() }).safeParse({ email: 'nope' }).error;

    const res = await request(appThatThrows(zodError)).get('/boom');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: [{ path: 'email', message: expect.any(String) }],
    });
  });

  it('hides unknown errors behind 500 INTERNAL_ERROR with no internals leaked', async () => {
    const res = await request(appThatThrows(new Error('db password is hunter2'))).get('/boom');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: res.headers['x-request-id'],
      },
    });
    expect(res.text).not.toContain('hunter2');
  });
});
