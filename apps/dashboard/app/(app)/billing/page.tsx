'use client';

import { useEffect, useState } from 'react';
import {
  billing,
  ApiError,
  type BillingPlan,
  type SubscriptionView,
  type Invoice,
} from '../../_lib/api';
import { Button, Card, Alert, Spinner, cn } from '../../_components/ui';

function inr(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-success/10 text-success',
  TRIALING: 'bg-brand-soft text-brand',
  PAST_DUE: 'bg-warning/10 text-warning',
  CANCELED: 'bg-surface-2 text-muted',
  PAUSED: 'bg-surface-2 text-muted',
  EXPIRED: 'bg-surface-2 text-muted',
};

// Internal feature codes → readable labels (matches the landing site).
const FEATURE_LABELS: Record<string, string> = {
  basic_analytics: 'Basic analytics',
  email_support: 'Email support',
  full_analytics: 'Full analytics',
  roi_calculator: 'ROI dashboard',
  shopify_app: 'Shopify app',
  white_label_sdk: 'White-label SDK',
  dedicated_support: 'Dedicated support',
  sla: 'Priority SLA',
};
function featureLabel(code: string): string {
  return FEATURE_LABELS[code] ?? code.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}
function planName(displayName: string): string {
  return displayName.replace(/\s*\(monthly\)/i, '').trim();
}
const TAGLINE: Record<string, string> = {
  STARTER: 'For getting started',
  PRO: 'For brands ready to scale',
  ENTERPRISE: 'Large catalogs & custom needs',
};

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-brand" aria-hidden>
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function BillingPage() {
  const [sub, setSub] = useState<{ subscription: SubscriptionView | null; plan: BillingPlan | null } | null>(null);
  const [plans, setPlans] = useState<BillingPlan[] | null>(null);
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);

  async function load() {
    try {
      const [s, p, i] = await Promise.all([billing.subscription(), billing.plans(), billing.invoices()]);
      setSub(s);
      setPlans(p);
      setInvoices(i);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load billing.');
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function subscribe(plan: BillingPlan) {
    setError(null);
    setBusyPlan(plan.id);
    try {
      const r = await billing.subscribe(plan.id);
      if (r.shortUrl) {
        // Razorpay hosted authorization — complete payment there. On success,
        // the webhook flips the subscription to ACTIVE.
        window.open(r.shortUrl, '_blank', 'noopener');
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start the subscription.');
    } finally {
      setBusyPlan(null);
    }
  }

  async function cancel() {
    if (!confirm('Cancel your subscription at the end of the current period?')) return;
    setError(null);
    setCanceling(true);
    try {
      await billing.cancel(true);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel.');
    } finally {
      setCanceling(false);
    }
  }

  const loading = !sub || !plans || !invoices;
  const currentPlanId = sub?.plan?.id ?? null;
  const activeStatuses = ['ACTIVE', 'TRIALING', 'PAST_DUE'];
  const hasActive = sub?.subscription && activeStatuses.includes(sub.subscription.status);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Billing</h1>
        <p className="mt-1 text-sm text-muted">Manage your plan and payment history.</p>
      </div>

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner className="text-brand" />
        </div>
      ) : (
        <>
          {/* Current subscription */}
          {hasActive && sub!.plan && (
            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink">{sub!.plan.displayName}</p>
                    <span className={cn('rounded-full px-2 py-0.5 text-[12px] font-semibold', STATUS_STYLE[sub!.subscription!.status] ?? 'bg-surface-2 text-muted')}>
                      {sub!.subscription!.status.toLowerCase()}
                    </span>
                  </div>
                  <p className="mt-1 text-[14px] text-muted">
                    {sub!.subscription!.cancelAtPeriodEnd ? 'Ends' : 'Renews'} on{' '}
                    {fmtDate(sub!.subscription!.currentPeriodEnd)}
                  </p>
                </div>
                {!sub!.subscription!.cancelAtPeriodEnd && (
                  <Button variant="secondary" loading={canceling} onClick={cancel}>
                    Cancel plan
                  </Button>
                )}
              </div>
              {sub!.subscription!.cancelAtPeriodEnd && (
                <p className="mt-3 text-[14px] text-warning">
                  Your plan is set to cancel at the end of this period. Re-subscribe below to keep access.
                </p>
              )}
            </Card>
          )}

          {/* Plans */}
          <div className="grid items-stretch gap-5 md:grid-cols-3">
            {plans!.map((plan) => {
              const isCurrent = plan.id === currentPlanId && hasActive;
              const isEnterprise = plan.tier === 'ENTERPRISE';
              const popular = plan.tier === 'PRO';
              const unlimited = plan.productLimit >= 999999;
              const limitsLine = unlimited
                ? 'Unlimited products & sessions'
                : `${plan.productLimit} products · ${plan.sessionLimit.toLocaleString('en-IN')} AR sessions/mo`;
              const featureItems = [limitsLine, 'AI 3D generation', ...plan.features.map(featureLabel)];
              return (
                <div
                  key={plan.id}
                  className={cn(
                    'relative flex flex-col rounded-2xl border bg-surface p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-pop',
                    popular ? 'border-brand shadow-pop md:-translate-y-1' : 'border-line shadow-card',
                    isCurrent && 'ring-2 ring-brand',
                  )}
                >
                  {popular && !isCurrent && (
                    <span className="absolute right-5 top-5 rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand">
                      Popular
                    </span>
                  )}
                  {isCurrent && (
                    <span className="absolute right-5 top-5 rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-fg">
                      Current
                    </span>
                  )}

                  <p className="text-[17px] font-semibold text-ink">{planName(plan.displayName)}</p>
                  <p className="text-[13px] text-muted">{TAGLINE[plan.tier] ?? ''}</p>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight text-ink">
                      {isEnterprise ? 'Custom' : inr(plan.amountInPaise)}
                    </span>
                    {!isEnterprise && (
                      <span className="text-[14px] text-muted">
                        /{plan.billingPeriod === 'YEARLY' ? 'yr' : 'mo'}
                      </span>
                    )}
                  </div>

                  <ul className="mt-5 flex-1 space-y-2.5 text-[14px]">
                    {featureItems.map((f, i) => (
                      <li key={f + i} className="flex items-start gap-2.5 text-ink">
                        <Check />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6">
                    {isCurrent ? (
                      <Button variant="secondary" disabled className="w-full">
                        Current plan
                      </Button>
                    ) : isEnterprise || !plan.subscribable ? (
                      <a
                        href="mailto:founder@rekaman.io?subject=Rekaman%20plan%20enquiry"
                        className="block w-full rounded-[var(--radius)] border border-line-2 bg-surface py-2.5 text-center text-[14px] font-medium text-ink transition-colors hover:bg-surface-2"
                      >
                        Contact sales
                      </a>
                    ) : (
                      <Button
                        className="w-full"
                        variant={popular ? 'primary' : 'secondary'}
                        loading={busyPlan === plan.id}
                        onClick={() => subscribe(plan)}
                      >
                        {hasActive ? 'Switch to this' : 'Subscribe'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Invoices */}
          <Card className="divide-y divide-line p-0">
            <div className="px-5 py-3.5">
              <p className="text-sm font-medium text-ink">Payment history</p>
            </div>
            {invoices!.length === 0 ? (
              <p className="px-5 py-6 text-[14px] text-muted">No invoices yet.</p>
            ) : (
              invoices!.map((inv) => (
                <div key={inv.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium text-ink">{inr(inv.amountInPaise)}</p>
                    <p className="text-[13px] text-muted">
                      {fmtDate(inv.periodStart)} – {fmtDate(inv.periodEnd)}
                    </p>
                  </div>
                  <span className="text-[13px] font-medium text-muted">{inv.status.toLowerCase()}</span>
                  {inv.invoiceUrl && (
                    <a href={inv.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-[14px] font-medium text-brand hover:underline">
                      View
                    </a>
                  )}
                </div>
              ))
            )}
          </Card>

          <p className="text-center text-[13px] text-faint">
            Payments are processed securely by Razorpay. Prices exclude GST.
          </p>
        </>
      )}
    </div>
  );
}
