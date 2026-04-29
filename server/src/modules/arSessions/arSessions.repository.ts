import { prisma } from '../../shared/db.js';
import { logger } from '../../shared/logger.js';
import type { Prisma } from '@prisma/client';

export const arSessionsRepository = {
  /**
   * Idempotent session upsert — if sessionId already exists, no-op.
   * SDK may send the same start event multiple times on retry.
   */
  upsertSession: (data: {
    sessionId: string;
    brandId: string;
    productId: string | null;
    arMode: string;
    deviceType: string;
    countryCode?: string;
    city?: string;
    language?: string;
    userAgent?: string;
    referrer?: string;
  }) =>
    prisma.aRSession.upsert({
      where: { sessionId: data.sessionId },
      create: data,
      update: {}, // existing session — don't overwrite
    }),

  appendEvents: (data: Prisma.AREventCreateManyInput[]) =>
    prisma.aREvent.createMany({
      data,
      skipDuplicates: true,
    }),

  /**
   * Update derived aggregates on an existing session row.
   * Errors swallowed (race with upsertSession is benign — the next batch will reconcile).
   * A debug log is left so failures are diagnosable without polluting Sentry.
   */
  updateSessionAggregates: (
    sessionId: string,
    updates: {
      didPlace?: boolean;
      didAddToCart?: boolean;
      endedAt?: Date;
      durationMs?: number;
    },
  ) =>
    prisma.aRSession
      .update({
        where: { sessionId },
        data: updates,
      })
      .catch((err: unknown) => {
        logger.debug({ err, sessionId }, 'updateSessionAggregates failed (non-critical)');
      }),
};
