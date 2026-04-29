import 'dotenv/config';
import { createApp } from './app.js';
import { initSentry } from './shared/sentry.js';
import { getEnv } from './shared/env.js';
import { logger } from './shared/logger.js';
import { prisma } from './shared/db.js';

async function main() {
  const env = getEnv();

  initSentry();

  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection verified');
  } catch (err) {
    logger.fatal({ err }, 'Failed to connect to database');
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`HTTP server listening on http://localhost:${env.PORT}`);
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down...');
    server.close(() => {
      logger.info('HTTP server closed');
      prisma.$disconnect().finally(() => process.exit(0));
    });

    setTimeout(() => {
      logger.fatal('Shutdown timed out, forcing exit');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
