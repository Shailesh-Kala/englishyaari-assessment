import { Router } from 'express';
import type { UserService } from './user.service.js';
import { createUserSchema } from './user.schemas.js';

export function userRoutes(userService: UserService) {
  return Router().post('/users', async (req, res) => {
    const input = createUserSchema.parse(req.body);
    res.status(201).json(await userService.create(input));
  });
}
