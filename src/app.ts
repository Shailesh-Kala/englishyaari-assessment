import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import type { Logger } from 'pino';
import { AppError, errorHandler, notFoundHandler } from './errors.js';
import { healthRoutes } from './health.routes.js';
import { requestLogger } from './request-logger.js';

export type AppOptions = {
  logger: Logger;
  corsOrigins: string[];
  rateLimit: { windowMs: number; max: number };
};

export function createApp({ logger, corsOrigins, rateLimit: limits }: AppOptions) {
  const app = express();
  app.use(requestLogger(logger));
  app.use(helmet());
  app.use(cors({ origin: corsOrigins }));
  app.use(
    rateLimit({
      windowMs: limits.windowMs,
      limit: limits.max,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (_req, _res, next) =>
        next(new AppError(429, 'RATE_LIMITED', 'Too many requests, try again later')),
    }),
  );
  app.use(express.json({ limit: '10kb' }));
  app.use(healthRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
