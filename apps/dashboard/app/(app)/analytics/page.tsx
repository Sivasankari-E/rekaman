import Link from 'next/link';
import { Card } from '../../_components/ui';

/*
 * Analytics — Phase 1 presents the metric structure with an empty state.
 * Live aggregation (sessions, placement rate, device split from AREvent /
 * ARSession) lands in Phase 2; until a brand's SDK is live there's genuinely
 * no data to show, so we guide them to Install rather than fake numbers.
 */
const METRICS = [
  { label: 'AR sessions', hint: 'Last 30 days' },
  { label: 'Placement rate', hint: 'Opens that placed' },
  { label: 'Avg. session', hint: 'Time in AR' },
  { label: 'Devices', hint: 'iOS · Android · Desktop' },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Analytics</h1>
        <p className="mt-1 text-sm text-muted">AR engagement across your products.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {METRICS.map((m) => (
          <Card key={m.label} className="p-4">
            <p className="text-[13px] text-muted">{m.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">—</p>
            <p className="mt-1 text-xs text-faint">{m.hint}</p>
          </Card>
        ))}
      </div>

      <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <path d="M7 15l4-4 3 3 5-6" />
          </svg>
        </span>
        <p className="mt-4 text-sm font-medium text-ink">No AR sessions yet</p>
        <p className="mt-1 max-w-md text-[13px] text-muted">
          Once shoppers use “View in your room” on your site, you’ll see sessions, placement rate,
          and device breakdown here in real time.
        </p>
        <Link
          href="/install"
          className="mt-5 inline-flex items-center rounded-[var(--radius)] bg-brand px-4 py-2 text-[13px] font-medium text-brand-fg hover:bg-brand-hover"
        >
          Install the SDK →
        </Link>
      </Card>
    </div>
  );
}
