import { z } from 'zod';
import { getEnv } from '../env.js';
import { logger } from '../logger.js';
import { ExternalServiceError } from '../errors.js';

/*
 * Razorpay Subscriptions — thin REST wrapper (no SDK dependency). Auth is HTTP
 * Basic (key_id:key_secret). Every call wraps failures into a typed
 * ExternalServiceError('razorpay', ...) per the External API Boundaries rule,
 * so a Razorpay outage or a bad input surfaces as 502, not a raw 500.
 *
 * Keys are optional in the env schema, so we check-at-use and fail loud with a
 * clear message rather than sending `Basic undefined`.
 */
const BASE = 'https://api.razorpay.com/v1';

function authHeader(): string {
  const env = getEnv();
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new ExternalServiceError('razorpay', 'Razorpay keys are not configured');
  }
  const basic = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64');
  return `Basic ${basic}`;
}

async function rzpFetch<T>(path: string, init: RequestInit, schema: z.ZodType<T>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
  } catch (err) {
    logger.warn({ err, path }, 'razorpay request failed (network)');
    throw new ExternalServiceError('razorpay', 'Could not reach Razorpay');
  }

  const body = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    // Razorpay error shape: { error: { code, description, ... } }
    const desc =
      (body as { error?: { description?: string } } | null)?.error?.description ??
      `Razorpay request failed (${res.status})`;
    logger.warn({ path, status: res.status, desc }, 'razorpay api error');
    throw new ExternalServiceError('razorpay', desc);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    logger.warn({ path, issues: parsed.error.issues }, 'razorpay response shape unexpected');
    throw new ExternalServiceError('razorpay', 'Unexpected Razorpay response');
  }
  return parsed.data;
}

// Subscription shape — only the fields we consume; `.nullish()` + passthrough
// so extra/absent Razorpay fields never crash parsing.
const SubscriptionSchema = z
  .object({
    id: z.string(),
    status: z.string(),
    plan_id: z.string().nullish(),
    short_url: z.string().nullish(),
    current_start: z.number().nullish(),
    current_end: z.number().nullish(),
    notes: z.record(z.string(), z.unknown()).nullish(),
  })
  .passthrough();

export type RazorpaySubscription = z.infer<typeof SubscriptionSchema>;

/** Parse a subscription entity from a webhook payload (returns null if malformed). */
export function parseSubscriptionEntity(entity: unknown): RazorpaySubscription | null {
  const p = SubscriptionSchema.safeParse(entity);
  return p.success ? p.data : null;
}

export const razorpay = {
  /** Create a subscription against an existing Razorpay plan. */
  createSubscription: (input: {
    planId: string;
    totalCount: number;
    notes?: Record<string, string>;
  }) =>
    rzpFetch(
      '/subscriptions',
      {
        method: 'POST',
        body: JSON.stringify({
          plan_id: input.planId,
          total_count: input.totalCount,
          customer_notify: 1,
          notes: input.notes ?? {},
        }),
      },
      SubscriptionSchema,
    ),

  fetchSubscription: (subId: string) =>
    rzpFetch(`/subscriptions/${subId}`, { method: 'GET' }, SubscriptionSchema),

  /** Cancel — `atCycleEnd` lets the brand keep access until the paid period ends. */
  cancelSubscription: (subId: string, atCycleEnd: boolean) =>
    rzpFetch(
      `/subscriptions/${subId}/cancel`,
      { method: 'POST', body: JSON.stringify({ cancel_at_cycle_end: atCycleEnd ? 1 : 0 }) },
      SubscriptionSchema,
    ),
};
