import { Router, type Request, type Response } from 'express';
import { Prisma } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { getEnv } from '../../shared/env.js';
import { logger } from '../../shared/logger.js';
import { prisma } from '../../shared/db.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { billingService } from '../billing/billing.service.js';
import { parseSubscriptionEntity } from '../../shared/clients/razorpay.client.js';

const router = Router();

/**
 * POST /v1/webhooks/razorpay
 *
 * Razorpay fires subscription lifecycle events. This handler is the SOURCE OF
 * TRUTH for a brand's subscription status (unlike the Meshy webhook, which is
 * only a hint). Flow, mirroring the Meshy pattern:
 *   1. Verify HMAC-SHA256 over the raw bytes (X-Razorpay-Signature, hex).
 *   2. Validate envelope shape (Zod).
 *   3. Idempotency: insert InboundWebhookEvent keyed on the delivery id
 *      (X-Razorpay-Event-Id). Duplicates return 200 without re-processing.
 *   4. Reconcile into Subscription/Invoice via billingService.
 *
 * Returns 401 on missing/bad signature, 400 on bad shape, 200 otherwise
 * (including dedup + unhandled event types) so Razorpay doesn't retry problems
 * that are ours to fix.
 */
const envelopeSchema = z
  .object({
    event: z.string().min(1),
    payload: z
      .object({
        subscription: z.object({ entity: z.unknown() }).optional(),
        payment: z.object({ entity: z.unknown() }).optional(),
      })
      .passthrough(),
  })
  .passthrough();

const paymentEntitySchema = z
  .object({
    id: z.string().nullish(),
    amount: z.number().nullish(),
    currency: z.string().nullish(),
  })
  .passthrough();

function verifySignature(rawBody: Buffer, providedHex: string, secret: string): boolean {
  const expectedHex = createHmac('sha256', secret).update(rawBody).digest('hex');
  const provided = Buffer.from(providedHex, 'hex');
  const expected = Buffer.from(expectedHex, 'hex');
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

router.post(
  '/razorpay',
  asyncHandler(async (req: Request, res: Response) => {
    const env = getEnv();
    if (!env.RAZORPAY_WEBHOOK_SECRET) {
      logger.error('RAZORPAY_WEBHOOK_SECRET is not configured — refusing webhook');
      res.status(503).json({ error: 'WEBHOOK_DISABLED' });
      return;
    }
    if (!req.rawBody) {
      logger.error('razorpay webhook: rawBody missing — check express.json verify hook');
      res.status(400).json({ error: 'BAD_REQUEST' });
      return;
    }

    const signature = req.header('X-Razorpay-Signature');
    if (!signature) {
      res.status(401).json({ error: 'MISSING_SIGNATURE' });
      return;
    }
    if (!verifySignature(req.rawBody, signature, env.RAZORPAY_WEBHOOK_SECRET)) {
      logger.warn({ sigPrefix: signature.slice(0, 8) }, 'razorpay webhook signature mismatch');
      res.status(401).json({ error: 'INVALID_SIGNATURE' });
      return;
    }

    const parsed = envelopeSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.warn({ issues: parsed.error.issues }, 'razorpay webhook shape invalid');
      res.status(400).json({ error: 'INVALID_PAYLOAD' });
      return;
    }

    // Idempotency — the delivery id is unique per event.
    const eventId = req.header('X-Razorpay-Event-Id') ?? `${parsed.data.event}:${Date.now()}`;
    let inboundId: string | undefined;
    try {
      const inserted = await prisma.inboundWebhookEvent.create({
        data: {
          provider: 'razorpay',
          eventId,
          payload: parsed.data as unknown as Prisma.InputJsonValue,
        },
        select: { id: true },
      });
      inboundId = inserted.id;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        logger.info({ eventId }, 'razorpay webhook duplicate — skipping');
        res.status(200).json({ ok: true, dedup: true });
        return;
      }
      throw err;
    }

    const { event, payload } = parsed.data;
    const sub = payload.subscription
      ? parseSubscriptionEntity(payload.subscription.entity)
      : null;

    if (event.startsWith('subscription.') && sub) {
      const paymentParsed = payload.payment
        ? paymentEntitySchema.safeParse(payload.payment.entity)
        : null;
      const payment =
        paymentParsed && paymentParsed.success
          ? {
              id: paymentParsed.data.id ?? undefined,
              amount: paymentParsed.data.amount ?? undefined,
              currency: paymentParsed.data.currency ?? undefined,
            }
          : null;
      await billingService.applyRazorpayEvent(event, sub, payment);
      logger.info({ event, subId: sub.id, status: sub.status }, 'razorpay subscription event applied');
    } else {
      logger.info({ event }, 'razorpay webhook: event not handled');
    }

    await prisma.inboundWebhookEvent.update({
      where: { id: inboundId },
      data: { processedAt: new Date() },
    });
    res.status(200).json({ ok: true });
  }),
);

export const razorpayWebhookRoutes: Router = router;
