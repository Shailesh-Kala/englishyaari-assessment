import { Router } from 'express';
import { idParamsSchema } from '../validation.js';
import type { SessionService } from './session.service.js';
import {
  availableSessionsQuerySchema,
  bookSessionSchema,
  createSessionSchema,
} from './session.schemas.js';

export function sessionRoutes(sessionService: SessionService) {
  return Router()
    .post('/sessions', async (req, res) => {
      const input = createSessionSchema.parse(req.body);
      res.status(201).json(await sessionService.create(input));
    })
    .get('/sessions/available', async (req, res) => {
      const { dateTimestamp } = availableSessionsQuerySchema.parse(req.query);
      res.json(await sessionService.listAvailable(dateTimestamp));
    })
    .post('/sessions/:id/book', async (req, res) => {
      const { id } = idParamsSchema.parse(req.params);
      const { userId } = bookSessionSchema.parse(req.body);
      res.json(await sessionService.book(id, userId));
    })
    .patch('/sessions/:id/complete', async (req, res) => {
      const { id } = idParamsSchema.parse(req.params);
      res.json(await sessionService.complete(id));
    });
}
