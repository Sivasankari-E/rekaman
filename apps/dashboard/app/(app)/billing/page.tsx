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
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', STATUS_STYLE[sub!.subscription!.status] ?? 'bg-surface-2 text-muted')}>
                      {sub!.subscription!.status.toLowerCase()}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-muted">
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
                <p className="mt-3 text-[13px] text-warning">
                  Your plan is set to cancel at the end of this period. Re-subscribe below to keep access.
                </p>
              )}
            </Card>
          )}

          {/* Plans */}
          <div className="grid gap-4 md:grid-cols-3">
            {plans!.map((plan) => {
              const isCurrent = plan.id === currentPlanId && hasActive;
              return (
                <Card key={plan.id} className={cn('flex flex-col p-5', isCurrent && 'border-brand')}>
                  <div className="flex items-center justify-between">
                    <p className="text-[15px] font-semibold text-ink">{plan.displayName}</p>
                    {isCurrent && (
                      <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-ink">
                      {plan.amountInPaise > 0 ? inr(plan.amountInPaise) : 'Custom'}
                    </span>
                    {plan.amountInPaise > 0 && (
                      <span className="text-[13px] text-muted">
                        /{plan.billingPeriod === 'YEARLY' ? 'yr' : 'mo'}
                      </span>
                    )}
                  </div>
                  <ul className="mt-4 flex-1 space-y-2 text-[13px] text-muted">
                    <li>{plan.productLimit.toLocaleString('en-IN')} products</li>
                    <li>{plan.sessionLimit.toLocaleString('en-IN')} AR sessions/mo</li>
                    {plan.features.slice(0, 4).map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <div className="mt-5">
                    {isCurrent ? (
                      <Button variant="secondary" disabled className="w-full">
                        Current plan
                      </Button>
                    ) : plan.subscribable ? (
                      <Button
                        className="w-full"
                        loading={busyPlan === plan.id}
                        onClick={() => subscribe(plan)}
                      >
                        {hasActive ? 'Switch to this' : 'Subscribe'}
                      </Button>
                    ) : (
                      <a
                        href="mailto:founder@rekaman.io?subject=Enterprise%20plan"
                        className="block w-full rounded-[var(--radius)] border border-line bg-surface py-2 text-center text-[14px] font-medium text-ink hover:bg-surface-2"
                      >
                        Contact sales
                      </a>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Invoices */}
          <Card className="divide-y divide-line p-0">
            <div className="px-5 py-3.5">
              <p className="text-sm font-medium text-ink">Payment history</p>
            </div>
            {invoices!.length === 0 ? (
              <p className="px-5 py-6 text-[13px] text-muted">No invoices yet.</p>
            ) : (
              invoices!.map((inv) => (
                <div key={inv.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-ink">{inr(inv.amountInPaise)}</p>
                    <p className="text-[12.5px] text-muted">
                      {fmtDate(inv.periodStart)} – {fmtDate(inv.periodEnd)}
                    </p>
                  </div>
                  <span className="text-[12.5px] font-medium text-muted">{inv.status.toLowerCase()}</span>
                  {inv.invoiceUrl && (
                    <a href={inv.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium text-brand hover:underline">
                      View
                    </a>
                  )}
                </div>
              ))
            )}
          </Card>

          <p className="text-center text-[12px] text-faint">
            Payments are processed securely by Razorpay. Prices exclude GST.
          </p>
        </>
      )}
    </div>
  );
}
