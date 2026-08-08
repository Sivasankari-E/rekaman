import { Card } from './ui';

export function ComingSoon({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">{title}</h1>
        <p className="mt-1 text-sm text-muted">{blurb}</p>
      </div>
      <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 6v6l4 2" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </span>
        <p className="mt-4 text-sm font-medium text-ink">Coming soon</p>
        <p className="mt-1 max-w-sm text-[13px] text-muted">
          This section is being built. The full self-serve dashboard rolls out over the next few
          weeks.
        </p>
      </Card>
    </div>
  );
}
