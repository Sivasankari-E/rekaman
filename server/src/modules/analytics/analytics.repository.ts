import { prisma } from '../../shared/db.js';

/*
 * Analytics reads — every query is brand-scoped (brandId is a required arg,
 * per the tenant-isolation rule) and time-windowed by ARSession.startedAt.
 * Reads only; ARSession/AREvent are append-only (written by the SDK ingestion
 * path in the arSessions module).
 */
export const analyticsRepository = {
  countSessions: (brandId: string, since: Date): Promise<number> =>
    prisma.aRSession.count({ where: { brandId, startedAt: { gte: since } } }),

  countPlaced: (brandId: string, since: Date): Promise<number> =>
    prisma.aRSession.count({
      where: { brandId, startedAt: { gte: since }, didPlace: true },
    }),

  avgDurationMs: async (brandId: string, since: Date): Promise<number | null> => {
    const r = await prisma.aRSession.aggregate({
      where: { brandId, startedAt: { gte: since }, durationMs: { not: null } },
      _avg: { durationMs: true },
    });
    return r._avg.durationMs ?? null;
  },

  // No explicit return-type annotation: Prisma's groupBy overloads resolve to
  // the wrong signature when the result type is pinned (TS2345). Inference is
  // correct — callers get { deviceType, _count: { _all } }[].
  deviceBreakdown: (brandId: string, since: Date) =>
    prisma.aRSession.groupBy({
      by: ['deviceType'],
      where: { brandId, startedAt: { gte: since } },
      _count: { _all: true },
    }),

  /**
   * Per-day session counts. Raw SQL (date_trunc) because Prisma groupBy can't
   * bucket a timestamp to the day. Identifiers are quoted — Prisma maps the
   * `ARSession` model to a case-sensitive `"ARSession"` table with camelCase
   * columns (no @@map in the schema). `::int` keeps counts as JS numbers, not
   * bigint.
   */
  sessionsByDay: (
    brandId: string,
    since: Date,
  ): Promise<Array<{ day: Date; count: number }>> =>
    prisma.$queryRaw<Array<{ day: Date; count: number }>>`
      SELECT date_trunc('day', "startedAt") AS day, COUNT(*)::int AS count
      FROM "ARSession"
      WHERE "brandId" = ${brandId} AND "startedAt" >= ${since}
      GROUP BY 1
      ORDER BY 1
    `,

  // See deviceBreakdown note — no explicit return type (Prisma groupBy quirk).
  topProducts: (brandId: string, since: Date, limit: number) =>
    prisma.aRSession.groupBy({
      by: ['productId'],
      where: { brandId, startedAt: { gte: since }, productId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { productId: 'desc' } },
      take: limit,
    }),

  productNames: (
    brandId: string,
    ids: string[],
  ): Promise<Array<{ id: string; name: string; slug: string }>> =>
    prisma.product.findMany({
      where: { brandId, id: { in: ids } },
      select: { id: true, name: true, slug: true },
    }),
};
