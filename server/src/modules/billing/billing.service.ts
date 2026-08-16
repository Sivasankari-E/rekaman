import type { PricingPlan, SubscriptionStatus } from '@prisma/client';
import { billingRepository as repo } from './billing.repository.js';
import { razorpay, type RazorpaySubscription } from '../../shared/clients/razorpay.client.js';
import {
  NotFoundError,
  ValidationError,
  PaymentRequiredError,
} from '../../shared/errors.js';
import { logger } from '../../shared/logger.js';

// Razorpay bills a subscription for a fixed number of cycles. 12 monthly cycles
// = a year of auto-renew before Razorpay asks the customer to re-subscribe.
const TOTAL_COUNT = 12;

/** Map a Razorpay subscription status → our SubscriptionStatus enum. */
function mapStatus(rzp: string): SubscriptionStatus {
  switch (rzp) {
    case 'active':
      return 'ACTIVE';
    case 'authenticated':
    case 'created':
    case 'pending':
      return 'TRIALING'; // authorized but not yet actively charged
    case 'halted':
      return 'PAST_DUE';
    case 'paused':
      return 'PAUSED';
    case 'cancelled':
      return 'CANCELED';
    case 'completed':
    case 'expired':
      return 'EXPIRED';
    default:
      return 'TRIALING';
  }
}

function planView(p: PricingPlan) {
  return {
    id: p.id,
    code: p.code,
    tier: p.tier,
    displayName: p.displayName,
    amountInPaise: p.amountInPaise,
    currency: p.currency,
    billingPeriod: p.billingPeriod,
    sessionLimit: p.sessionLimit,
    productLimit: p.productLimit,
    features: p.features,
    // A plan is only self-serve subscribable once it's linked to a Razorpay plan.
    subscribable: Boolean(p.razorpayPlanId),
  };
}

/** Period window from the Razorpay entity, with a safe fallback for "created". */
function periodFrom(sub: RazorpaySubscription): { start: Date; end: Date } {
  const start = sub.current_start ? new Date(sub.current_start * 1000) : new Date();
  const end = sub.current_end
    ? new Date(sub.current_end * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return { start, end };
}

export const billingService = {
  async getPlans() {
    const plans = await repo.listPublicPlans();
    return plans.map(planView);
  },

  async getSubscription(brandId: string) {
    const sub = await repo.getSubscription(brandId);
    if (!sub) return { subscription: null, plan: null };
    return {
      subscription: {
        status: sub.status,
        currentPeriodStart: sub.currentPeriodStart.toISOString(),
        currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        canceledAt: sub.canceledAt?.toISOString() ?? null,
      },
      plan: planView(sub.pricingPlan),
    };
  },

  async getInvoices(brandId: string) {
    const invoices = await repo.listInvoices(brandId);
    return invoices.map((i) => ({
      id: i.id,
      amountInPaise: i.amountInPaise,
      currency: i.currency,
      status: i.status,
      periodStart: i.periodStart.toISOString(),
      periodEnd: i.periodEnd.toISOString(),
      paidAt: i.paidAt?.toISOString() ?? null,
      invoiceUrl: i.invoiceUrl,
      createdAt: i.createdAt.toISOString(),
    }));
  },

  /**
   * Create a Razorpay subscription for a plan and store a local (pending) row.
   * Returns the Razorpay short_url the brand completes authorization at.
   * The webhook is the source of truth for the eventual ACTIVE status.
   */
  async subscribe(brandId: string, planId: string) {
    const plan = await repo.findPlanById(planId);
    if (!plan || !plan.isPublic || plan.deprecatedAt) {
      throw new NotFoundError('Plan not found');
    }
    if (!plan.razorpayPlanId) {
      throw new ValidationError('This plan is not available for online subscription yet');
    }

    const rzpSub = await razorpay.createSubscription({
      planId: plan.razorpayPlanId,
      totalCount: TOTAL_COUNT,
      notes: { brandId, pricingPlanId: plan.id },
    });

    const { start, end } = periodFrom(rzpSub);
    const status = mapStatus(rzpSub.status);
    await repo.upsertSubscription(
      brandId,
      {
        brandId,
        pricingPlanId: plan.id,
        razorpaySubId: rzpSub.id,
        status,
        currentPeriodStart: start,
        currentPeriodEnd: end,
      },
      {
        pricingPlanId: plan.id,
        razorpaySubId: rzpSub.id,
        status,
        cancelAtPeriodEnd: false,
        canceledAt: null,
      },
    );

    return { subscriptionId: rzpSub.id, shortUrl: rzpSub.short_url ?? null, status };
  },

  async cancel(brandId: string, atPeriodEnd: boolean) {
    const sub = await repo.getSubscription(brandId);
    if (!sub) throw new NotFoundError('No active subscription to cancel');

    const rzpSub = await razorpay.cancelSubscription(sub.razorpaySubId, atPeriodEnd);

    await repo.updateSubscriptionByRazorpayId(sub.razorpaySubId, {
      status: mapStatus(rzpSub.status),
      cancelAtPeriodEnd: atPeriodEnd,
      canceledAt: atPeriodEnd ? null : new Date(),
    });
    return { cancelAtPeriodEnd: atPeriodEnd };
  },

  /**
   * Reconcile a Razorpay webhook event into our tables. Source of truth for
   * subscription status. Called by the webhook route AFTER signature + dedup.
   */
  async applyRazorpayEvent(
    eventType: string,
    sub: RazorpaySubscription,
    payment?: { id?: string; amount?: number; currency?: string } | null,
  ): Promise<void> {
    const brandId = typeof sub.notes?.brandId === 'string' ? sub.notes.brandId : null;
    const existing = await repo.findSubscriptionByRazorpayId(sub.id);
    if (!existing && !brandId) {
      logger.warn({ subId: sub.id, eventType }, 'razorpay event: no local sub + no brandId note');
      return;
    }

    const status = mapStatus(sub.status);
    const { start, end } = periodFrom(sub);
    const isCancel = eventType === 'subscription.cancelled';

    if (existing) {
      await repo.updateSubscriptionByRazorpayId(sub.id, {
        status,
        currentPeriodStart: start,
        currentPeriodEnd: end,
        ...(isCancel ? { canceledAt: new Date() } : {}),
      });
    } else if (brandId) {
      const pricingPlanId =
        typeof sub.notes?.pricingPlanId === 'string' ? sub.notes.pricingPlanId : null;
      if (!pricingPlanId) {
        logger.warn({ subId: sub.id }, 'razorpay event: missing pricingPlanId note, cannot create');
        return;
      }
      await repo.upsertSubscription(
        brandId,
        {
          brandId,
          pricingPlanId,
          razorpaySubId: sub.id,
          status,
          currentPeriodStart: start,
          currentPeriodEnd: end,
        },
        { status, currentPeriodStart: start, currentPeriodEnd: end },
      );
    }

    // On a successful charge, record the invoice (idempotent on razorpay id).
    if (eventType === 'subscription.charged' && payment?.id) {
      const local = await repo.findSubscriptionByRazorpayId(sub.id);
      if (local) {
        await repo.upsertInvoiceByRazorpayId(payment.id, {
          brandId: local.brandId,
          subscriptionId: local.id,
          razorpayInvoiceId: payment.id,
          amountInPaise: payment.amount ?? 0,
          currency: payment.currency ?? 'INR',
          status: 'PAID',
          periodStart: start,
          periodEnd: end,
          paidAt: new Date(),
        });
      }
    }
  },

  /**
   * Entitlements for a brand — the limits gating middleware enforces. No
   * subscription → null limits (Phase 1: Concierge brands aren't hard-capped;
   * enforcement wiring decides how to treat null).
   */
  async getEntitlements(brandId: string) {
    const sub = await repo.getSubscription(brandId);
    const active = sub && (sub.status === 'ACTIVE' || sub.status === 'TRIALING');
    return {
      hasActivePlan: Boolean(active),
      productLimit: active ? sub!.pricingPlan.productLimit : null,
      sessionLimit: active ? sub!.pricingPlan.sessionLimit : null,
      planName: active ? sub!.pricingPlan.displayName : null,
    };
  },
};

/** Guard used by the products module before creating a product. */
export async function assertCanAddProduct(brandId: string): Promise<void> {
  const ent = await billingService.getEntitlements(brandId);
  // Phase 1: only enforce when the brand actually has a plan with a limit.
  if (ent.productLimit === null) return;
  const count = await repo.countProducts(brandId);
  if (count >= ent.productLimit) {
    throw new PaymentRequiredError(
      `Your ${ent.planName} plan allows ${ent.productLimit} products. Upgrade to add more.`,
    );
  }
}
