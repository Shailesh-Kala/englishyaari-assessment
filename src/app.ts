import express from 'express';
import { healthRoutes } from './health.routes.js';

export function createApp() {
  const app = express();
  app.use(healthRoutes);
  return app;
}
