import { Router } from 'express';
import mongoose from 'mongoose';

export const healthRoutes = Router().get('/health', (_req, res) => {
  const dbUp = mongoose.connection.readyState === mongoose.ConnectionStates.connected;
  res
    .status(dbUp ? 200 : 503)
    .json(dbUp ? { status: 'ok', db: 'up' } : { status: 'error', db: 'down' });
});
