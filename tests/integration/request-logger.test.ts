import { Writable } from 'node:stream';
import express from 'express';
import { pino } from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { requestLogger } from '../../src/request-logger.js';

function captureLogs() {
  const lines: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk, _encoding, done) {
      lines.push(JSON.parse(String(chunk)));
      done();
    },
  });
  return { logger: pino({ level: 'info' }, stream), lines };
}

describe('request logging', () => {
  it('logs only id, method, url and status — never headers', async () => {
    const { logger, lines } = captureLogs();
    const app = express()
      .use(requestLogger(logger))
      .get('/ping', (_req, res) => {
        res.json({ ok: true });
      });

    await request(app)
      .get('/ping?x=1')
      .set('authorization', 'Bearer top-secret')
      .set('cookie', 'session=also-secret');

    const line = lines.find((l) => l.msg === 'request completed')!;
    expect(line.req).toEqual({ id: expect.any(String), method: 'GET', url: '/ping?x=1' });
    expect(line.res).toEqual({ statusCode: 200 });
    expect(JSON.stringify(lines)).not.toMatch(/secret|headers/);
  });
});
