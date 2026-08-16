'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { analytics, ApiError, type AnalyticsSummary } from '../../_lib/api';
import { Card, Spinner, Alert, cn } from '../../_components/ui';

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}
function fmtDuration(ms: number | null): string {
  if (ms === null || ms <= 0) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${String(s % 60).padStart(2, '0')}s`;
}
function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    analytics
      .summary(days)
      .then((d) => live && setData(d))
      .catch((err) =>
        live && setError(err instanceof ApiError ? err.message : 'Could not load analytics.'),
      )
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [days]);

  const empty = data !== null && data.totals.sessions === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink">Analytics</h1>
          <p className="mt-1 text-sm text-muted">AR engagement across your products.</p>
        </div>
        <div className="inline-flex rounded-[var(--radius)] border border-line bg-surface p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setDays(r.days)}
              className={cn(
                'rounded-[calc(var(--radius)-2px)] px-3 py-1.5 text-[14px] font-medium transition-colors',
                days === r.days ? 'bg-brand text-brand-fg' : 'text-muted hover:text-ink',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && <Alert>{error}</Alert>}

      {loading && (
        <div className="flex items-center justify-center py-24">
          <Spinner />
        </div>
      )}

      {!loading && empty && <EmptyState />}

      {!loading && data && !empty && <Dashboard data={data} />}
    </div>
  );
}

function Dashboard({ data }: { data: AnalyticsSummary }) {
  const { totals, devices, sessionsByDay, topProducts } = data;
  const deviceTotal = devices.ios + devices.android + devices.desktop + devices.other;

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="AR sessions" value={totals.sessions.toLocaleString('en-IN')} hint={`Last ${data.range.days} days`} />
        <Metric label="Placement rate" value={pct(totals.placementRate)} hint={`${totals.placedSessions.toLocaleString('en-IN')} placed`} />
        <Metric label="Avg. session" value={fmtDuration(totals.avgDurationMs)} hint="Time in AR" />
        <Metric label="Devices" value={deviceTotal.toLocaleString('en-IN')} hint="iOS · Android · Desktop" />
      </div>

      {/* Sessions-over-time chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-ink">Sessions over time</p>
          <p className="text-xs text-faint">{data.range.days}-day view</p>
        </div>
        <SessionsChart series={sessionsByDay} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Device breakdown */}
        <Card className="p-5">
          <p className="text-sm font-medium text-ink">Device breakdown</p>
          <div className="mt-4 space-y-3">
            {[
              ['iOS', devices.ios],
              ['Android', devices.android],
              ['Desktop', devices.desktop],
              ['Other', devices.other],
            ].map(([label, n]) => (
              <DeviceRow key={label as string} label={label as string} count={n as number} total={deviceTotal} />
            ))}
          </div>
        </Card>

        {/* Top products */}
        <Card className="p-5">
          <p className="text-sm font-medium text-ink">Top products</p>
          {topProducts.length === 0 ? (
            <p className="mt-4 text-[14px] text-muted">No product-level sessions in this range yet.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {topProducts.map((p, i) => (
                <li key={p.productId} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[13px] font-semibold text-brand">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-[15px] text-ink">{p.name}</span>
                  <span className="text-[14px] font-medium tabular-nums text-muted">
                    {p.sessions.toLocaleString('en-IN')}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="p-4">
      <p className="text-[14px] text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      <p className="mt-1 text-xs text-faint">{hint}</p>
    </Card>
  );
}

function SessionsChart({ series }: { series: Array<{ date: string; count: number }> }) {
  const max = Math.max(1, ...series.map((d) => d.count));
  // Label the first, middle, and last day.
  const labelIdx = new Set([0, Math.floor(series.length / 2), series.length - 1]);
  return (
    <div className="mt-4">
      <div className="flex h-36 items-end gap-[3px]">
        {series.map((d) => (
          <div
            key={d.date}
            className="group relative flex-1"
            title={`${fmtDay(d.date)}: ${d.count} session${d.count === 1 ? '' : 's'}`}
          >
            <div
              className="w-full rounded-t-sm bg-brand/80 transition-colors group-hover:bg-brand"
              style={{ height: `${Math.max(2, (d.count / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[12px] text-faint">
        {series.map((d, i) => (
          <span key={d.date} className={labelIdx.has(i) ? '' : 'invisible'}>
            {fmtDay(d.date)}
          </span>
        ))}
      </div>
    </div>
  );
}

function DeviceRow({ label, count, total }: { label: string; count: number; total: number }) {
  const w = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[14px]">
        <span className="text-ink">{label}</span>
        <span className="tabular-nums text-muted">
          {count.toLocaleString('en-IN')} · {Math.round(w)}%
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-brand" style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="M7 15l4-4 3 3 5-6" />
        </svg>
      </span>
      <p className="mt-4 text-sm font-medium text-ink">No AR sessions yet</p>
      <p className="mt-1 max-w-md text-[14px] text-muted">
        Once shoppers use “View in your room” on your site, you’ll see sessions, placement rate,
        and device breakdown here in real time.
      </p>
      <Link
        href="/install"
        className="mt-5 inline-flex items-center rounded-[var(--radius)] bg-brand px-4 py-2 text-[14px] font-medium text-brand-fg hover:bg-brand-hover"
      >
        Install the SDK →
      </Link>
    </Card>
  );
}
