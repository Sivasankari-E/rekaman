import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

declare global {
  var __prisma: PrismaClient | undefined;
}

const isDev = process.env.NODE_ENV === 'development';

export const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    log: isDev
      ? [
          { level: 'query', emit: 'event' },
          { level: 'error', emit: 'event' },
          { level: 'warn', emit: 'event' },
        ]
      : [{ level: 'error', emit: 'event' }],
  });

prisma.$on('error' as never, (e: unknown) => {
  logger.error({ prismaEvent: e }, 'prisma error');
});

if (isDev) {
  globalThis.__prisma = prisma;
}

let shuttingDown = false;

const shutdown = async (signal?: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Disconnecting Prisma...');
  try {
    await prisma.$disconnect();
  } catch (err) {
    logger.error({ err }, 'Error during Prisma disconnect');
  }
};

process.on('beforeExit', () => {
  void shutdown();
});
process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
