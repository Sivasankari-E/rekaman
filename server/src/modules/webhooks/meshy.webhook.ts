import { Router, type Request, type Response } from 'express';
import { Prisma } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { getEnv } from '../../shared/env.js';
import { logger } from '../../shared/logger.js';
import { prisma } from '../../shared/db.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';

const router = Router();

/**
 * POST /v1/webhooks/meshy
 *
 * Meshy fires this when a task transitions to a terminal state. We treat the
 * webhook as a **hint to act sooner**, not as the source of truth. The worker
 * still polls (Day 5) and the polling path remains authoritative — webhooks
 * can be lost, replayed, or spoofed.
 *
 * What this endpoint actually does today:
 *   1. Verify HMAC over the raw bytes (constant-time comparison).
 *   2. Validate envelope shape with Zod.
 *   3. Idempotency log: insert into `InboundWebhookEvent` keyed on
 *      `(provider='meshy', eventId='<task_id>:<status>')`. Duplicate
 *      deliveries return 200 immediately without double-processing.
 *   4. Confirm the task corresponds to a known product (defensive — webhooks
 *      for unknown task IDs return 200 to suppress Meshy retries but log a
 *      warning so we notice if our config drifts).
 *   5. Mark the InboundWebhookEvent processed.
 *
 * NOTE: we deliberately do NOT short-circuit the worker's poll loop here.
 * That's a Day 7+ optimization — requires either bumping job priority in
 * BullMQ (which is racy under our `attempts: 1` retry rule) or running the
 * download/upload pipeline directly from this handler (which couples HTTP
 * latency to Meshy CDN throughput, bad). For now: instant audit trail +
 * Sentry breadcrumb when Meshy fires; the worker picks the result up on its
 * next poll (≤5s).
 *
 * Always returns 200 unless: missing/bad signature (401), invalid shape (400).
 * 200 on every other code path (including unknown task ID, dedup hit) so
 * Meshy doesn't retry; we don't want to amplify their retry budget on
 * problems that are ours to fix.
 */

// Meshy's documented payload shape for image-to-3d completion.
const meshyWebhookPayloadSchema = z.object({
  task_id: z.string().min(1),
  status: z.enum(['SUCCEEDED', 'FAILED', 'CANCELED', 'IN_PROGRESS', 'PENDING']),
  // Optional fields Meshy may include — preserved in the audit log payload
  // but we don't act on them in this handler.
  progress: z.number().min(0).max(100).optional(),
  finished_at: z.number().int().nonnegative().optional(),
  task_error: z.object({ message: z.string() }).optional(),
});

function verifySignature(rawBody: Buffer, providedHex: string, secret: string): boolean {
  const expectedHex = createHmac('sha256', secret).update(rawBody).digest('hex');
  // timingSafeEqual throws on length mismatch — guard first.
  const provided = Buffer.from(providedHex, 'hex');
  const expected = Buffer.from(expectedHex, 'hex');
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

router.post(
  '/meshy',
  asyncHandler(async (req: Request, res: Response) => {
    const env = getEnv();
    if (!env.MESHY_WEBHOOK_SECRET) {
      // Misconfiguration — log loudly. Refusing requests is the right call:
      // accepting unverified webhooks would be a tenant-data integrity risk.
      logger.error('MESHY_WEBHOOK_SECRET is not configured — refusing webhook');
      res.status(503).json({ error: 'WEBHOOK_DISABLED' });
      return;
    }

    if (!req.rawBody) {
      // verify hook in app.ts didn't run (non-JSON body or middleware change).
      logger.error('meshy webhook: rawBody missing — check express.json verify hook');
      res.status(400).json({ error: 'BAD_REQUEST' });
      return;
    }

    const signature = req.header('Meshy-Signature') ?? req.header('X-Meshy-Signature');
    if (!signature) {
      logger.warn('meshy webhook missing signature header');
      res.status(401).json({ error: 'MISSING_SIGNATURE' });
      return;
    }

    if (!verifySignature(req.rawBody, signature, env.MESHY_WEBHOOK_SECRET)) {
      logger.warn(
        { sigPrefix: signature.slice(0, 8) },
        'meshy webhook signature mismatch',
      );
      res.status(401).json({ error: 'INVALID_SIGNATURE' });
      return;
    }

    // Body has already been parsed by express.json. Re-validate shape with
    // Zod since `req.body` is `unknown` — a malformed signed payload is rare
    // but possible if Meshy ships a new webhook version.
    const parsed = meshyWebhookPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.warn(
        { issues: parsed.error.issues },
        'meshy webhook payload shape invalid',
      );
      res.status(400).json({ error: 'INVALID_PAYLOAD' });
      return;
    }

    const { task_id, status } = parsed.data;
    const eventId = `${task_id}:${status}`;

    // Idempotency: try to insert into the audit log. P2002 means we've
    // already received and processed this delivery — return 200 + dedup flag.
    let inboundId: string | undefined;
    try {
      const inserted = await prisma.inboundWebhookEvent.create({
        data: {
          provider: 'meshy',
          eventId,
          payload: parsed.data as unknown as Prisma.InputJsonValue,
        },
        select: { id: true },
      });
      inboundId = inserted.id;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        logger.info({ taskId: task_id, status }, 'meshy webhook duplicate — skipping');
        res.status(200).json({ ok: true, dedup: true });
        return;
      }
      throw err;
    }

    // Find the product carrying this Meshy task ID in metadata.generation.
    // Even if not found, return 200 — a missing product means our state has
    // drifted, but retrying delivery won't recover it.
    const product = await prisma.product.findFirst({
      where: {
        metadata: {
          path: ['generation', 'meshyTaskId'],
          equals: task_id,
        },
      },
      select: { id: true, brandId: true, status: true },
    });

    if (!product) {
      logger.warn(
        { taskId: task_id, status },
        'meshy webhook: no product carries this task id (state drift?)',
      );
    } else {
      logger.info(
        {
          taskId: task_id,
          status,
          productId: product.id,
          brandId: product.brandId,
          productStatus: product.status,
        },
        'meshy webhook received',
      );
    }

    await prisma.inboundWebhookEvent.update({
      where: { id: inboundId },
      data: { processedAt: new Date() },
    });

    res.status(200).json({ ok: true });
  }),
);

export const meshyWebhookRoutes: Router = router;
