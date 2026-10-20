import { Router } from 'express';
import type { SessionService } from './session.service.js';
import { createSessionSchema } from './session.schemas.js';

export function sessionRoutes(sessionService: SessionService) {
  return Router().post('/sessions', async (req, res) => {
    const input = createSessionSchema.parse(req.body);
    res.status(201).json(await sessionService.create(input));
  });
}
