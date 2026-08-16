#!/usr/bin/env node
/*
 * create-razorpay-plans.mjs — one-time (idempotent) setup for online billing.
 *
 * For every public PricingPlan that has no razorpayPlanId yet, creates the
 * matching Plan in Razorpay and backfills the id. Safe to re-run — plans that
 * already have a razorpayPlanId are skipped.
 *
 * Run from server/ (so @prisma/client resolves) with your env loaded:
 *   node --env-file=.env scripts/create-razorpay-plans.mjs
 *
 * Requires RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET in that env. Use TEST keys
 * against the staging DB first; LIVE keys against prod.
 *
 * NOTE: this shell can't reach Neon — run it on the founder's laptop.
 */
import { PrismaClient } from '@prisma/client';

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
if (!KEY_ID || !KEY_SECRET) {
  console.error('✗ RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing in env');
  process.exit(1);
}
const AUTH = 'Basic ' + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
const prisma = new PrismaClient();

const period = (billingPeriod) => (billingPeriod === 'YEARLY' ? 'yearly' : 'monthly');

async function createRazorpayPlan(plan) {
  const res = await fetch('https://api.razorpay.com/v1/plans', {
    method: 'POST',
    headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      period: period(plan.billingPeriod),
      interval: 1,
      item: {
        name: `Rekaman ${plan.displayName}`,
        amount: plan.amountInPaise, // Razorpay amount is in paise
        currency: plan.currency,
        description: `${plan.displayName} — ${plan.productLimit} products, ${plan.sessionLimit} AR sessions/mo`,
      },
      notes: { pricingPlanCode: plan.code },
    }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error?.description || `HTTP ${res.status}`);
  return body.id;
}

async function main() {
  const mode = KEY_ID.startsWith('rzp_live') ? 'LIVE' : 'TEST';
  console.log(`Razorpay mode: ${mode}\n`);

  const plans = await prisma.pricingPlan.findMany({
    where: { isPublic: true, deprecatedAt: null },
    orderBy: { amountInPaise: 'asc' },
  });

  for (const plan of plans) {
    if (plan.razorpayPlanId) {
      console.log(`• ${plan.code} — already linked (${plan.razorpayPlanId}), skipping`);
      continue;
    }
    // Enterprise is "Contact sales" everywhere (matches the landing) — never
    // auto-create a self-serve Razorpay plan for it, even though it has a
    // concrete ₹ amount in the DB. Also skip any 0/placeholder-amount plan.
    if (plan.tier === 'ENTERPRISE') {
      console.log(`• ${plan.code} — ENTERPRISE tier, skipping (stays Contact sales)`);
      continue;
    }
    if (!plan.amountInPaise || plan.amountInPaise <= 0) {
      console.log(`• ${plan.code} — no positive amount, skipping (contact-sales plan)`);
      continue;
    }
    try {
      const planId = await createRazorpayPlan(plan);
      await prisma.pricingPlan.update({ where: { id: plan.id }, data: { razorpayPlanId: planId } });
      console.log(`✓ ${plan.code} → ${planId} (₹${(plan.amountInPaise / 100).toLocaleString('en-IN')})`);
    } catch (err) {
      console.error(`✗ ${plan.code} — ${err.message}`);
    }
  }
  console.log('\nDone. Set the webhook in Razorpay Dashboard → Settings → Webhooks:');
  console.log('  URL: https://api.rekaman.io/v1/webhooks/razorpay');
  console.log('  Events: subscription.activated, subscription.charged, subscription.cancelled,');
  console.log('          subscription.halted, subscription.pending, subscription.completed');
  console.log('  Secret → set RAZORPAY_WEBHOOK_SECRET (Railway api + local .env)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
