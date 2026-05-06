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
    const meshy = getMeshyClient();
    const meshyTaskId = await meshy.createImageTo3dTask({
      // Meshy v1 image-to-3d takes a single image URL. Multi-photo support
      // ships in Phase 2 (image-to-3d-multi-image). For now we use the first
      // photo — additional photos are stored on the product but unused by
      // generation until then.
      imageUrl: input.photoUrls[0]!,
      aiModel: config.aiModel,
      shouldRemesh: config.shouldRemesh,
      shouldTexture: config.shouldTexture,
      enablePbr: config.enablePbr,
      targetPolycount: config.targetPolycount,
      autoSize: config.autoSize,
      originAt: 'bottom',
      targetFormats: ['glb'],
    });

    // Step 2 — atomic transition. updateMany guards on (status IN [PENDING,
    // FAILED]) so a concurrent request that already moved the row to
    // PROCESSING returns count: 0 here.
    const { updated } = await generationRepository.markProductProcessing(
      brandId,
      productId,
      meshyTaskId,
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

    await getGenerationQueue().add(GENERATION_JOB_NAME, jobData, {
      jobId,
      // Meshy tasks idle in PENDING for 5–10s after creation; first poll any
      // sooner is wasted work. Worker tuning lives in env (POLL_INTERVAL_MS).
      delay: 5000,
    });

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
      generation: meta.generation ?? null,
      updatedAt: product.updatedAt,
    };
  },
};
