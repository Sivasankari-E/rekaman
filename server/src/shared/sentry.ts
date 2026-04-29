import * as Sentry from '@sentry/node';
import { logger } from './logger.js';

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.warn('SENTRY_DSN not set, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0,
    release: process.env.RAILWAY_GIT_COMMIT_SHA ?? 'local',
    serverName: process.env.SERVICE_NAME ?? 'api',
    beforeSend(event) {
      const status = event.tags?.status as number | undefined;
      if (status && status >= 400 && status < 500) return null;
      return event;
    },
  });

  logger.info({ release: process.env.RAILWAY_GIT_COMMIT_SHA ?? 'local' }, 'Sentry initialized');
}

export { Sentry };
