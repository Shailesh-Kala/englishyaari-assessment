import { randomUUID } from 'node:crypto';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';

const SAFE_REQUEST_ID = /^[\w-]{1,100}$/;

// Logs every request as JSON and tags it (and the response header) with a request id.
export function requestLogger(logger: Logger) {
  return pinoHttp({
    logger,
    genReqId: (req, res) => {
      const incoming = req.headers['x-request-id'];
      const id =
        typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
      res.setHeader('x-request-id', id);
      return id;
    },
    // Keep log lines small and never record headers (cookies, auth tokens).
    serializers: {
      req: (req) => ({ id: req.id, method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      return res.statusCode >= 400 ? 'warn' : 'info';
    },
  });
}
