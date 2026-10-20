import { Router } from 'express';
import type { SessionService } from '../sessions/session.service.js';
import { idParamsSchema } from '../validation.js';
import type { UserService } from './user.service.js';
import { createUserSchema } from './user.schemas.js';

// Every /users path lives here; a user's sessions are still served by the session service.
export function userRoutes(userService: UserService, sessionService: SessionService) {
  return Router()
    .post('/users', async (req, res) => {
      const input = createUserSchema.parse(req.body);
      res.status(201).json(await userService.create(input));
    })
    .get('/users/:id/sessions', async (req, res) => {
      const { id } = idParamsSchema.parse(req.params);
      res.json(await sessionService.listForUser(id));
    });
}
