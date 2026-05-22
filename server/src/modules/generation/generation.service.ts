import { ProductStatus } from '@prisma/client';
import { getMeshyClient } from '../../shared/clients/meshy.client.js';
import {
  getGenerationQueue,
  GENERATION_JOB_NAME,
  type GenerationJobData,
} from '../../shared/queue/queues.js';
import { logger } from '../../shared/logger.js';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  ExternalServiceError,
} from '../../shared/errors.js';
import { generationRepository } from './generation.repository.js';
import {
  DEFAULT_GENERATION_CONFIG,
  type GenerationConfig,
  type GenerationMetadata,
} from './generation.types.js';
import type { RequestGenerationInput } from './generation.validators.js';

/**
 * Generation service.
 *
 * Flow when a brand requests a new GLB:
 *   1. Resolve the product under (brandId, productId) — 404 if missing.
 *   2. Reject if status is PROCESSING (another request is in flight).
 *   3. Reject if status is READY and the caller didn't pass an explicit
 *      `config` override — re-generation must be opt-in to avoid silent credit
 *      burns from accidental retries.
 *   4. Create the Meshy task FIRST. If Meshy rejects the input or our credits
 *      are exhausted, we surface the typed error to the caller and the
 *      product stays in its prior state — no DB churn for a no-op.
 *   5. Atomically transition PENDING|FAILED → PROCESSING and store
 *      `metadata.generation.meshyTaskId`. If the atomic update fails, another
 *      request started a generation between (1) and (5); we orphan the Meshy
 *      task we just paid for and log loudly so it surfaces in Sentry.
 *   6. Enqueue a BullMQ job. The worker (Day 5) takes over: poll, download,
 *      upload to S3, mark READY.
 *   7. Return 202 Accepted with the meshy task id and attempt number. The
 *      dashboard polls `GET /v1/products/:id/generation-status` for progress.
 */
export const generationService = {
  async requestGeneration(
    brandId: string,
    productId: string,
    input: RequestGenerationInput,
  ): Promise<{
    meshyTaskId: string;
    attemptNumber: number;
    status: 'PROCESSING';
    jobId: string;
  }> {
    const product = await generationRepository.findProductForGeneration(
      brandId,
      productId,
    );
    if (!product) throw new NotFoundError('Product');

    if (product.status === ProductStatus.PROCESSING) {
      throw new ConflictError(
        'Generation already in progress for this product',
      );
    }
    if (product.status === ProductStatus.READY && !input.config) {
      throw new ConflictError(
        'Product already has a GLB. Pass an explicit config to regenerate.',
      );
    }
    if (product.status === ProductStatus.ARCHIVED) {
      throw new ConflictError('Cannot generate for an archived product');
    }

    // Defense-in-depth: validators already reject http://, but external
    // callers (e.g. an internal admin tool bypassing the public router)
    // could skip them. Keep the check at the boundary too.
    for (const url of input.photoUrls) {
      if (!url.startsWith('https://')) {
        throw new ValidationError('Photo URLs must be HTTPS');
      }
    }

    const existingMeta = (product.metadata ?? {}) as { generation?: GenerationMetadata };
    const attemptNumber = (existingMeta.generation?.attemptNumber ?? 0) + 1;

    const config: GenerationConfig = {
      ...DEFAULT_GENERATION_CONFIG,
      ...(input.config ?? {}),
    };

    // Step 1 — Meshy first. Throws typed errors (PaymentRequiredError,
    // ValidationError, ExternalServiceError, RateLimitExceededError) which
    // bubble up unchanged. Product stays in its prior state.
    //
    // All of the product's photos (1-4, capped by the route's Zod schema)
    // are sent. The client routes to the single-image or multi-image Meshy
    // endpoint by count — 2-4 photos produce materially better back/side
    // geometry. `kind` records which endpoint was used so the worker polls
    // the matching GET URL.
    const meshy = getMeshyClient();
    const { taskId: meshyTaskId, kind: meshyTaskKind } = await meshy.createImageTo3dTask({
      imageUrls: input.photoUrls,
      aiModel: config.aiModel,
      shouldRemesh: config.shouldRemesh,
      shouldTexture: config.shouldTexture,
      enablePbr: config.enablePbr,
      targetPolycount: config.targetPolycount,
      autoSize: config.autoSize,
      originAt: 'bottom',
      // Request both formats from Meshy. GLB powers Android WebXR + desktop
      // fallback; USDZ powers iOS AR Quick Look. Worker downloads BOTH from
      // the same Meshy task (no extra credit cost — see v5.15 USDZ pipeline).
      targetFormats: ['glb', 'usdz'],
    });

    // Step 2 — atomic transition. updateMany guards on (status IN [PENDING,
    // FAILED]) so a concurrent request that already moved the row to
    // PROCESSING returns count: 0 here.
    const { updated } = await generationRepository.markProductProcessing(
      brandId,
      productId,
      meshyTaskId,
      meshyTaskKind,
      attemptNumber,
    );
    if (!updated) {
      // Race detected. We have already been billed for the Meshy task and
      // there is no DB row pointing to it. Log at error so Sentry sees it
      // and we can reconcile manually if it ever happens.
      logger.error(
        { brandId, productId, meshyTaskId, attemptNumber },
        'race: generation already in flight — meshy task orphaned',
      );
      throw new ConflictError('Generation already in progress (race detected)');
    }

    // Step 3 — enqueue worker job. Job ID dedups: same (productId, attempt)
    // can only enqueue once. A retry produces a new attempt number → new job.
    const jobId = `gen:${productId}:${attemptNumber}`;
    const jobData: GenerationJobData = {
      productId,
      brandId,
      attemptNumber,
      photoUrls: input.photoUrls,
      config,
    };

    // The enqueue is an external-service call (Redis/BullMQ) and MUST be
    // wrapped per CLAUDE.md → External API Boundaries — an uncaught raw
    // IORedis error (e.g. Upstash "max requests limit exceeded", or Redis
    // unreachable) would otherwise surface as a generic 500 INTERNAL_ERROR.
    //
    // IMPORTANT: by this point the Meshy task is ALREADY created and paid
    // for, and the product is ALREADY marked PROCESSING. If the enqueue
    // fails, that task is orphaned — charged, no worker job. We log at
    // error level with the meshyTaskId so it can be recovered later via
    // `scripts/recover-stuck-generation.mjs <productId>` (re-enqueues
    // against the SAME meshyTaskId — no fresh Meshy charge).
    try {
      await getGenerationQueue().add(GENERATION_JOB_NAME, jobData, {
        jobId,
        // Meshy tasks idle in PENDING for 5–10s after creation; first poll any
        // sooner is wasted work. Worker tuning lives in env (POLL_INTERVAL_MS).
        delay: 5000,
      });
    } catch (err) {
      logger.error(
        { err: (err as Error).message, brandId, productId, meshyTaskId, attemptNumber, jobId },
        'generation enqueue failed — meshy task orphaned (recover via recover-stuck-generation.mjs)',
      );
      throw new ExternalServiceError(
        'redis',
        'Could not queue the generation job — the job queue is unavailable',
      );
    }

    logger.info(
      { brandId, productId, meshyTaskId, attemptNumber, jobId },
      'generation queued',
    );

    return { meshyTaskId, attemptNumber, status: 'PROCESSING', jobId };
  },

  async getGenerationStatus(brandId: string, productId: string) {
    const product = await generationRepository.getGenerationStatus(
      brandId,
      productId,
    );
    if (!product) throw new NotFoundError('Product');

    const meta = (product.metadata ?? {}) as { generation?: GenerationMetadata };

    return {
      productId: product.id,
      status: product.status,
      glbUrl: product.glbUrl,
      glbSizeKb: product.glbSizeKb,
      // v5.16 fix: repo selects these fields but the previous version of this
      // function omitted them, so the status endpoint reported `usdzUrl` as
      // absent even when the DB row + publicAr endpoint both had it. Caught by
      // first prod regen on May 17 (product cmp9ssxc9000137sz4cfdch4h — file
      // was 15.2 MB in S3, just invisible to this endpoint).
      usdzUrl: product.usdzUrl,
      usdzSizeKb: product.usdzSizeKb,
      generation: meta.generation ?? null,
      updatedAt: product.updatedAt,
    };
  },
};
