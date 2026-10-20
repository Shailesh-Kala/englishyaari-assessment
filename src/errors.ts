import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

type ErrorBody = { code: string; message: string; details?: { path: string; message: string }[] };

function toErrorResponse(err: unknown): { status: number; body: ErrorBody } {
  if (err instanceof AppError) {
    return { status: err.status, body: { code: err.code, message: err.message } };
  }
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    return {
      status: 400,
      body: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details },
    };
  }
  if (isBodyParserError(err, 'entity.parse.failed')) {
    return {
      status: 400,
      body: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' },
    };
  }
  if (isBodyParserError(err, 'entity.too.large')) {
    return {
      status: 413,
      body: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds 10 kb' },
    };
  }
  return { status: 500, body: { code: 'INTERNAL_ERROR', message: 'Internal server error' } };
}

function isBodyParserError(err: unknown, type: string) {
  return typeof err === 'object' && err !== null && 'type' in err && err.type === type;
}

export const notFoundHandler: RequestHandler = (req) => {
  throw new AppError(404, 'ROUTE_NOT_FOUND', `Route ${req.method} ${req.path} not found`);
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const { status, body } = toErrorResponse(err);
  if (status >= 500) req.log.error({ err }, 'Unhandled error');
  res.status(status).json({ error: { ...body, requestId: req.id } });
};
