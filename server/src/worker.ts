import 'dotenv/config';
import { initSentry } from './shared/sentry.js';
import { getEnv } from './shared/env.js';
import { logger } from './shared/logger.js';
import { prisma } from './shared/db.js';
import {
  startGenerationWorker,
  stopGenerationWorker,
} from './workers/generation.worker.js';
import { closeGenerationQueue } from './shared/queue/queues.js';
import { disconnectRedis } from './shared/queue/connection.js';

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'worker shutting down — draining BullMQ jobs');

  // Order matters: drain in-flight jobs first, then close the queue
  // publisher, then drop Redis, then Prisma. Reversing this would tear
  // down dependencies under in-flight code.
  try {
    await stopGenerationWorker();
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'error stopping generation worker');
  }
  try {
    await closeGenerationQueue();
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'error closing generation queue');
  }
  try {
    await disconnectRedis();
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'error disconnecting redis');
  }
  try {
    await prisma.$disconnect();
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'error disconnecting prisma');
  }
  logger.info('worker shutdown complete');

  // Safety net: if any close() above hangs, bail out after 10s.
  setTimeout(() => {
    logger.warn('forcing exit after 10s grace');
    process.exit(0);
  }, 10_000).unref();

  process.exit(0);
}

async function main(): Promise<void> {
  const env = getEnv();
  initSentry();

  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('worker DB connection verified');
  } catch (err) {
    logger.fatal({ err }, 'worker failed to connect to database');
    process.exit(1);
  }

  // Generation worker subscribes to the BullMQ `generation` queue.
  // Lazy: only constructs Redis connection when called, so a misconfigured
  // REDIS_URL surfaces here with a clear log line rather than at random
  // first-use time.
  if (env.REDIS_URL) {
    startGenerationWorker();
  } else {
    logger.warn(
      'REDIS_URL not configured — generation worker is dormant (jobs will queue in DB only when api is wired)',
    );
  }

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  logger.info({ pid: process.pid, nodeVersion: process.version }, 'worker process ready');
}

main().catch((err) => {
  logger.fatal({ err }, 'worker failed');
  process.exit(1);
});
