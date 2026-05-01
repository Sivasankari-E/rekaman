import { prisma } from '../../shared/db.js';
import { logger } from '../../shared/logger.js';
import type { Prisma } from '@prisma/client';

export const arSessionsRepository = {
  /**
   * Idempotent session create — race-safe under concurrent batches with the same sessionId.
   *
   * Why createMany + skipDuplicates instead of upsert:
   *   `upsert({ ... update: {} })` is NOT atomic in Prisma — under concurrent calls
   *   with the same sessionId, both can pass the find-existing check, both attempt
   *   INSERT, and one throws P2002. This rejects the whole event batch with 500
   *   and silently drops the events (the SDK uses sendBeacon and never sees the failure).
   *
   *   `createMany({ skipDuplicates: true })` compiles to `INSERT ... ON CONFLICT DO NOTHING`
   *   which IS atomic at the DB level. Re-runs are guaranteed no-ops. This is the
   *   standard Postgres-compatible idempotent-insert pattern.
   *
   * Reference incident: Sentry issue 2d26c02a (2026-05-01) — every batch after the
   * first one for the same session crashed, dropping ar_button_tapped and downstream events.
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
    prisma.aRSession.createMany({
      data: [data],
      skipDuplicates: true,
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
