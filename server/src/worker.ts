import 'dotenv/config';
import { initSentry } from './shared/sentry.js';
import { getEnv } from './shared/env.js';
import { logger } from './shared/logger.js';
import { prisma } from './shared/db.js';

async function main() {
  getEnv();
  initSentry();

  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Worker DB connection verified');
  } catch (err) {
    logger.fatal({ err }, 'Worker failed to connect to database');
    process.exit(1);
  }

  logger.info('Worker started — idle (Week 5 will add BullMQ processing)');

  setInterval(() => {
    logger.debug('Worker heartbeat');
  }, 60_000);

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Worker shutting down...');
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.fatal({ err }, 'Worker failed');
  process.exit(1);
});
