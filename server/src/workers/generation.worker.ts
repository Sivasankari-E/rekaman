import { Worker, UnrecoverableError, type Job } from 'bullmq';
import { getWorkerRedis } from '../shared/queue/connection.js';
import {
  GENERATION_JOB_NAME,
  GENERATION_QUEUE_NAME,
  type GenerationJobData,
} from '../shared/queue/queues.js';
import { getMeshyClient, type MeshyTask } from '../shared/clients/meshy.client.js';
import {
  uploadToProductsBucket,
  s3Keys,
  publicProductUrl,
} from '../shared/clients/s3.client.js';
import { generationRepository } from '../modules/generation/generation.repository.js';
import { getEnv } from '../shared/env.js';
import { logger } from '../shared/logger.js';
import {
  ValidationError,
  PaymentRequiredError,
  RateLimitExceededError,
  ExternalServiceError,
  NotFoundError,
} from '../shared/errors.js';

/**
 * Generation worker — Meshy poll → GLB download → S3 upload → mark READY.
 *
 * Concurrency: 3 jobs in flight per worker process. Meshy Pro tier accepts
 * ~10 queued tasks; staying well under leaves headroom for bursts and avoids
 * 429s from our own pipeline.
 *
 * Failure model:
 *   - Transient (network blip, 5xx, slow Meshy backlog): keep polling. The
 *     job's overall budget is bounded by `GENERATION_MAX_DURATION_MS`. On
 *     timeout we mark the product FAILED with `isTransient: true` so the
 *     dashboard can offer a one-click retry.
 *   - Permanent (Meshy 4xx, validation, missing GLB URL on success):
 *     mark FAILED with `isTransient: false`. No automatic retry.
 *   - Worker crash mid-job: BullMQ marks the job stalled. We deliberately
 *     leave `attempts: 1` (set in queues.ts) so it does NOT auto-retry —
 *     a blind retry can re-bill Meshy. Operator triggers retry manually
 *     from the dashboard, which goes through the service layer's atomic
 *     transition + new attempt number.
 *
 * Idempotency:
 *   - The Meshy task is created once in the service layer BEFORE enqueue.
 *     The worker only reads from it; running the same job twice (e.g. a
 *     stalled-job reconciliation) just re-uploads the same GLB to a new
 *     versioned S3 key — wasteful but harmless.
 *   - The S3 key is versioned by `attemptNumber`, so concurrent retries
 *     never overwrite each other.
 *
 * IMPORTANT: every error path must call `markProductFailed` AND `return`
 * (NOT throw). Throwing puts the BullMQ job into the failed bucket which
 * triggers the global `failed` listener for alerting; with `return`, the
 * job is COMPLETED from BullMQ's POV (we recorded our own failure state)
 * and our own logs/Sentry surface the failure exactly once.
 */

/**
 * Hard timeout for an individual fetch (Meshy GLB CDN, thumbnail).
 * Independent of the overall job budget.
 */
const DOWNLOAD_TIMEOUT_MS = 60_000;

/**
 * Backoff after a Meshy 429 — well above the typical Pro-tier reset window.
 */
const RATE_LIMIT_BACKOFF_MS = 30_000;

async function processGenerationJob(job: Job<GenerationJobData>): Promise<void> {
  const env = getEnv();
  const POLL_INTERVAL_MS = env.GENERATION_POLL_INTERVAL_MS;
  const MAX_DURATION_MS = env.GENERATION_MAX_DURATION_MS;

  const { productId, brandId, attemptNumber } = job.data;
  const log = logger.child({
    jobId: job.id,
    productId,
    brandId,
    attemptNumber,
  });

  log.info('generation job started');

  // ── Step 1 — load metadata.generation.meshyTaskId ──
  const product = await generationRepository.findProductForJob(brandId, productId);
  if (!product) {
    // Product was deleted between enqueue and pickup. UnrecoverableError
    // tells BullMQ "do not retry this job, ever".
    throw new UnrecoverableError('Product not found — was it deleted?');
  }

  const meta = (product.metadata ?? {}) as { generation?: { meshyTaskId?: string } };
  const meshyTaskId = meta.generation?.meshyTaskId;
  if (!meshyTaskId) {
    throw new UnrecoverableError('Product has no meshyTaskId in metadata');
  }

  if (product.status !== 'PROCESSING') {
    log.warn(
      { status: product.status },
      'product not in PROCESSING — skipping (operator-triggered retry should re-enqueue)',
    );
    return;
  }

  // ── Step 2 — poll Meshy until SUCCEEDED, FAILED, or timeout ──
  const startTime = Date.now();
  const meshy = getMeshyClient();
  let task: MeshyTask;

  // Poll loop. The break-out conditions are:
  //   - SUCCEEDED → fall through to download/upload
  //   - FAILED/CANCELED → mark FAILED, return
  //   - elapsed > MAX_DURATION_MS → mark FAILED transient, return
  //   - permanent error → mark FAILED, return
  while (true) {
    const elapsed = Date.now() - startTime;
    if (elapsed > MAX_DURATION_MS) {
      log.warn({ meshyTaskId, elapsedMs: elapsed }, 'generation timeout');
      await generationRepository.markProductFailed(
        brandId,
        productId,
        `Generation timed out after ${Math.round(MAX_DURATION_MS / 1000)}s`,
        true,
      );
      return;
    }

    try {
      task = await meshy.getImageTo3dTask(meshyTaskId);
    } catch (err) {
      // ── Permanent (don't keep polling) ──
      if (err instanceof PaymentRequiredError) {
        log.error({ meshyTaskId }, 'meshy credits exhausted — escalate to billing');
        await generationRepository.markProductFailed(
          brandId,
          productId,
          'Meshy credits exhausted',
          false,
        );
        return;
      }
      if (err instanceof ValidationError) {
        log.warn({ meshyTaskId, err: (err as Error).message }, 'meshy rejected poll');
        await generationRepository.markProductFailed(
          brandId,
          productId,
          (err as Error).message,
          false,
        );
        return;
      }
      if (err instanceof NotFoundError) {
        log.warn({ meshyTaskId }, 'meshy task not found — likely expired');
        await generationRepository.markProductFailed(
          brandId,
          productId,
          'Meshy task no longer exists',
          false,
        );
        return;
      }
      // ── Transient (back off and retry) ──
      if (err instanceof RateLimitExceededError) {
        log.warn({ meshyTaskId }, 'meshy rate limited; backing off');
        await sleep(RATE_LIMIT_BACKOFF_MS);
        continue;
      }
      if (err instanceof ExternalServiceError) {
        log.warn(
          { meshyTaskId, err: (err as Error).message },
          'transient meshy error; retrying',
        );
        await sleep(POLL_INTERVAL_MS);
        continue;
      }
      // Anything else — unknown class, treat as permanent so we don't loop forever.
      log.error(
        { meshyTaskId, err: (err as Error).message },
        'unknown error polling meshy',
      );
      await generationRepository.markProductFailed(
        brandId,
        productId,
        (err as Error).message,
        false,
      );
      return;
    }

    log.debug(
      { status: task.status, progress: task.progress },
      'meshy poll',
    );
    // Surfaces in BullMQ job inspector / dashboards.
    await job.updateProgress(task.progress);

    if (task.status === 'SUCCEEDED') break;
    if (task.status === 'FAILED' || task.status === 'CANCELED') {
      const reason = task.taskError?.message ?? `Meshy task ${task.status}`;
      log.warn({ meshyTaskId, reason }, 'meshy task did not succeed');
      await generationRepository.markProductFailed(brandId, productId, reason, false);
      return;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  // ── Step 3 — download GLB ──
  const glbSourceUrl = task.modelUrls.glb;
  if (!glbSourceUrl) {
    log.error(
      { meshyTaskId, modelUrls: task.modelUrls },
      'meshy reported SUCCEEDED but returned no GLB URL',
    );
    await generationRepository.markProductFailed(
      brandId,
      productId,
      'Meshy returned no GLB URL',
      false,
    );
    return;
  }

  let glbBuffer: Buffer;
  try {
    glbBuffer = await downloadToBuffer(glbSourceUrl);
  } catch (err) {
    log.error({ err: (err as Error).message }, 'glb download failed');
    await generationRepository.markProductFailed(
      brandId,
      productId,
      `Failed to download GLB: ${(err as Error).message}`,
      true,
    );
    return;
  }
  const glbSizeKb = Math.round(glbBuffer.length / 1024);
  log.info({ sizeKb: glbSizeKb }, 'glb downloaded');

  // ── Step 4 — upload GLB (and best-effort thumbnail) to S3 ──
  const version = attemptNumber;
  const glbKey = s3Keys.productGlb(brandId, productId, version);
  let thumbnailKey: string | undefined;

  try {
    await uploadToProductsBucket(
      glbKey,
      glbBuffer,
      'model/gltf-binary',
      'public, max-age=31536000, immutable',
    );
  } catch (err) {
    log.error({ err: (err as Error).message }, 's3 glb upload failed');
    await generationRepository.markProductFailed(
      brandId,
      productId,
      `S3 upload failed: ${(err as Error).message}`,
      true,
    );
    return;
  }

  if (task.thumbnailUrl) {
    try {
      const thumb = await downloadToBuffer(task.thumbnailUrl);
      thumbnailKey = s3Keys.productThumbnail(brandId, productId, version);
      await uploadToProductsBucket(thumbnailKey, thumb, 'image/png');
    } catch (err) {
      // Non-fatal: a missing thumbnail downgrades the dashboard preview but
      // the AR experience itself is unaffected.
      log.warn(
        { err: (err as Error).message },
        'thumbnail upload failed (non-fatal)',
      );
      thumbnailKey = undefined;
    }
  }

  // ── Step 5 — mark READY ──
  const glbPublicUrl = publicProductUrl(glbKey);
  const thumbPublicUrl = thumbnailKey ? publicProductUrl(thumbnailKey) : undefined;

  const { updated } = await generationRepository.markProductReady(
    brandId,
    productId,
    {
      glbUrl: glbPublicUrl,
      glbSizeKb,
      thumbnailUrl: thumbPublicUrl,
      version,
      creditsUsed: task.creditsUsed,
    },
  );
  if (!updated) {
    // Product was soft-deleted while we were processing. The GLB sits in S3
    // under the brand-scoped key — lifecycle rules will sweep it up; not an
    // operational concern, but log so we know it happened.
    log.warn(
      { glbKey },
      'product disappeared during generation — GLB uploaded but no DB row',
    );
    return;
  }

  log.info(
    {
      glbUrl: glbPublicUrl,
      sizeKb: glbSizeKb,
      creditsUsed: task.creditsUsed,
      durationMs: Date.now() - startTime,
    },
    'generation complete',
  );
}

// ── helpers ──

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadToBuffer(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timer);
  }
}

// ── worker bootstrap (lazy — worker.ts entry point calls this once) ──

let cached: Worker<GenerationJobData> | undefined;

export function startGenerationWorker(): Worker<GenerationJobData> {
  if (cached) return cached;

  const worker = new Worker<GenerationJobData>(
    GENERATION_QUEUE_NAME,
    processGenerationJob,
    {
      connection: getWorkerRedis(),
      concurrency: 3,
      // Stall detection: if a job stops reporting progress for `stalledInterval`
      // ms BullMQ assumes the worker died and reschedules. Our 5s polling +
      // `job.updateProgress(...)` keeps us under this comfortably.
      stalledInterval: 60_000,
      maxStalledCount: 1,
    },
  );

  worker.on('completed', (job) => {
    logger.info(
      { jobId: job.id, name: job.name },
      'bullmq job completed',
    );
  });

  worker.on('failed', (job, err) => {
    // Only thrown errors land here. Most of our paths call markProductFailed
    // and return — those are 'completed' from BullMQ's POV. A 'failed' here
    // means an UnrecoverableError or an unexpected throw, which deserves
    // alerting.
    logger.error(
      { jobId: job?.id, name: job?.name, err: err.message },
      'bullmq job failed',
    );
  });

  worker.on('error', (err) => {
    logger.error({ err: err.message }, 'bullmq worker error');
  });

  logger.info(
    { queue: GENERATION_QUEUE_NAME, jobName: GENERATION_JOB_NAME },
    'generation worker subscribed',
  );

  cached = worker;
  return worker;
}

export async function stopGenerationWorker(): Promise<void> {
  if (!cached) return;
  await cached.close();
  cached = undefined;
}
