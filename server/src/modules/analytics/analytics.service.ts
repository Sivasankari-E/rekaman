import { analyticsRepository as repo } from './analytics.repository.js';

export interface AnalyticsSummary {
  range: { days: number; since: string };
  totals: {
    sessions: number;
    placedSessions: number;
    placementRate: number; // 0..1
    avgDurationMs: number | null;
  };
  devices: { ios: number; android: number; desktop: number; other: number };
  sessionsByDay: Array<{ date: string; count: number }>; // zero-filled, one per day
  topProducts: Array<{ productId: string; name: string; slug: string; sessions: number }>;
}

/** YYYY-MM-DD in UTC — matches how date_trunc('day', ...) buckets. */
function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const analyticsService = {
  async summary(brandId: string, days: number): Promise<AnalyticsSummary> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    since.setUTCHours(0, 0, 0, 0); // align to day boundary so buckets line up

    const [sessions, placed, avgDur, devices, byDayRaw, topRaw] = await Promise.all([
      repo.countSessions(brandId, since),
      repo.countPlaced(brandId, since),
      repo.avgDurationMs(brandId, since),
      repo.deviceBreakdown(brandId, since),
      repo.sessionsByDay(brandId, since),
      repo.topProducts(brandId, since, 5),
    ]);

    // Device buckets → fixed shape (ios/android/desktop/other).
    const dev = { ios: 0, android: 0, desktop: 0, other: 0 };
    for (const row of devices) {
      const key = row.deviceType as keyof typeof dev;
      if (key in dev) dev[key] += row._count._all;
      else dev.other += row._count._all;
    }

    // Zero-fill the day series so the chart is continuous.
    const counts = new Map(byDayRaw.map((r) => [ymd(new Date(r.day)), r.count]));
    const sessionsByDay: AnalyticsSummary['sessionsByDay'] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setUTCDate(d.getUTCDate() + i);
      const key = ymd(d);
      sessionsByDay.push({ date: key, count: counts.get(key) ?? 0 });
    }

    // Resolve product names for the top list (brand-scoped).
    const ids = topRaw.map((r) => r.productId).filter((id): id is string => Boolean(id));
    const names = ids.length ? await repo.productNames(brandId, ids) : [];
    const nameMap = new Map(names.map((p) => [p.id, p]));
    const topProducts = topRaw
      .map((r) => {
        const p = r.productId ? nameMap.get(r.productId) : undefined;
        if (!p) return null; // product deleted since the session — skip
        return { productId: p.id, name: p.name, slug: p.slug, sessions: r._count._all };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    return {
      range: { days, since: since.toISOString() },
      totals: {
        sessions,
        placedSessions: placed,
        placementRate: sessions > 0 ? placed / sessions : 0,
        avgDurationMs: avgDur !== null ? Math.round(avgDur) : null,
      },
      devices: dev,
      sessionsByDay,
      topProducts,
    };
  },
};
