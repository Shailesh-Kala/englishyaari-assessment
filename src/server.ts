import mongoose from 'mongoose';
import { pino } from 'pino';
import { createApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig(process.env);
const logger = pino({ level: config.LOG_LEVEL });

await mongoose.connect(config.MONGODB_URI);
logger.info('Connected to MongoDB');

const app = createApp({
  logger,
  corsOrigins: config.CORS_ORIGINS,
  rateLimit: { windowMs: config.RATE_LIMIT_WINDOW_MS, max: config.RATE_LIMIT_MAX },
});

const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, 'Server listening');
});

function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down');
  server.close(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
