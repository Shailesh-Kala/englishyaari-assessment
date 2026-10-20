import express from 'express';
import type { Logger } from 'pino';
import { errorHandler, notFoundHandler } from './errors.js';
import { healthRoutes } from './health.routes.js';
import { requestLogger } from './request-logger.js';

export function createApp({ logger }: { logger: Logger }) {
  const app = express();
  app.use(requestLogger(logger));
  app.use(express.json());
  app.use(healthRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
