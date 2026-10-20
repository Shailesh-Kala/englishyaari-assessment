import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import type { Logger } from 'pino';
import { AppError, errorHandler, notFoundHandler } from './errors.js';
import { healthRoutes } from './health.routes.js';
import { requestLogger } from './request-logger.js';
import { sessionRepository } from './sessions/session.repository.js';
import { sessionRoutes } from './sessions/session.routes.js';
import { createSessionService } from './sessions/session.service.js';
import { teacherRepository } from './teachers/teacher.repository.js';
import { userRepository } from './users/user.repository.js';
import { userRoutes } from './users/user.routes.js';
import { createUserService } from './users/user.service.js';

export type AppOptions = {
  logger: Logger;
  corsOrigins: string[];
  rateLimit: { windowMs: number; max: number };
  clock: () => Date;
};

export function createApp({ logger, corsOrigins, rateLimit: limits, clock }: AppOptions) {
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

  const userService = createUserService({ userRepo: userRepository });
  const sessionService = createSessionService({
    sessionRepo: sessionRepository,
    teacherRepo: teacherRepository,
    userRepo: userRepository,
    clock,
  });
  app.use(healthRoutes);
  app.use(userRoutes(userService, sessionService));
  app.use(sessionRoutes(sessionService));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
