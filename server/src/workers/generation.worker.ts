import { Worker, UnrecoverableError, type Job } from 'bullmq';
import * as Sentry from '@sentry/node';
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
import { processGlb } from '../shared/glb.js';
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
 * Sentry scope helper. Generation failures need to group by brand + product
 * (not lumped into one giant "generation failed" issue), and the Sentry-side
 * grouping rules use tags. Calling this inside `Sentry.withScope` keeps the
 * tags isolated to the current job — no cross-job leakage between concurrent
 * workers.
 */
function tagGenerationScope(scope: Sentry.Scope, data: GenerationJobData, jobId: string | undefined) {
  scope.setTag('brand_id', data.brandId);
  scope.setTag('product_id', data.productId);
  scope.setTag('attempt', String(data.attemptNumber));
  scope.setContext('generation', {
    jobId,
    photoCount: data.photoUrls.length,
    aiModel: data.config.aiModel,
    targetPolycount: data.config.targetPolycount,
  });
}

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
  // Wrap the whole job in an isolated Sentry scope so that any
  // captureException / captureMessage / addBreadcrumb call inside this
  // function inherits the tags below. Concurrency-safe: each scope is local
  // to its callback and disposed when the callback completes.
  return Sentry.withScope(async (scope) => {
    tagGenerationScope(scope, job.data, job.id);
    return processGenerationJobInner(job);
  });
}

async function processGenerationJobInner(job: Job<GenerationJobData>): Promise<void> {
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
  Sentry.addBreadcrumb({
    category: 'generation',
    type: 'info',
    message: 'job started',
    level: 'info',
    data: { jobId: job.id },
  });

  // ── Step 1 — load metadata.generation.meshyTaskId ──
  const product = await generationRepository.findProductForJob(brandId, productId);
  if (!product) {
    // Product was deleted between enqueue and pickup. UnrecoverableError
    // tells BullMQ "do not retry this job, ever".
    throw new UnrecoverableError('Product not found — was it deleted?');
  }

  const meta = (product.metadata ?? {}) as {
    generation?: { meshyTaskId?: string; meshyTaskKind?: 'single' | 'multi' };
  };
  const meshyTaskId = meta.generation?.meshyTaskId;
  if (!meshyTaskId) {
    throw new UnrecoverableError('Product has no meshyTaskId in metadata');
  }
  // Tasks created before the multi-image switch (May 2026) have no
  // `meshyTaskKind` — default to 'single' (correct: they were all
  // single-image). The kind selects which Meshy GET endpoint we poll.
  const meshyTaskKind = meta.generation?.meshyTaskKind ?? 'single';

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
      Sentry.captureMessage('Generation timed out', {
        level: 'warning',
        tags: { failure_class: 'timeout', is_transient: 'true' },
      });
      await generationRepository.markProductFailed(
        brandId,
        productId,
        `Generation timed out after ${Math.round(MAX_DURATION_MS / 1000)}s`,
        true,
      );
      return;
    }

    try {
      task = await meshy.getImageTo3dTask(meshyTaskId, meshyTaskKind);
    } catch (err) {
      // ── Permanent (don't keep polling) ──
      if (err instanceof PaymentRequiredError) {
        log.error({ meshyTaskId }, 'meshy credits exhausted — escalate to billing');
        Sentry.captureException(err, {
          level: 'error',
          tags: { failure_class: 'payment_required', is_transient: 'false' },
        });
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
      Sentry.captureException(err, {
        level: 'error',
        tags: { failure_class: 'unknown', is_transient: 'false' },
      });
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

    if (task.status === 'SUCCEEDED') {
      Sentry.addBreadcrumb({
        category: 'generation',
        type: 'info',
        message: 'meshy task succeeded',
        level: 'info',
        data: { meshyTaskId, durationMs: Date.now() - startTime },
      });
      break;
    }
    if (task.status === 'FAILED' || task.status === 'CANCELED') {
      const reason = task.taskError?.message ?? `Meshy task ${task.status}`;
      log.warn({ meshyTaskId, reason }, 'meshy task did not succeed');
      Sentry.captureMessage(`Meshy task ${task.status}`, {
        level: 'warning',
        tags: {
          failure_class: 'meshy_terminal',
          meshy_status: task.status,
          is_transient: 'false',
        },
        extra: { reason, meshyTaskId },
      });
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
    Sentry.captureMessage('Meshy SUCCEEDED with no GLB URL', {
      level: 'error',
      tags: { failure_class: 'meshy_missing_glb', is_transient: 'false' },
      extra: { meshyTaskId, modelUrls: task.modelUrls },
    });
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
    Sentry.captureException(err, {
      level: 'error',
      tags: { failure_class: 'glb_download', is_transient: 'true' },
    });
    await generationRepository.markProductFailed(
      brandId,
      productId,
      `Failed to download GLB: ${(err as Error).message}`,
      true,
    );
    return;
  }
  // Shrink the GLB before upload. Meshy ships multi-MB PBR textures (a single
  // 6 MB PNG is common), which make the model slow to load on shopper phones
  // across ALL platforms. Resize textures to <=2K + WebP-compress — typically
  // 80-90% smaller, geometry untouched (no quality loss). Best-effort: on any
  // error (incl. the sharp native binary being unavailable) it returns the
  // original buffer, so a GLB is always uploaded and the job never fails here.
  const rawSizeKb = Math.round(glbBuffer.length / 1024);
  // Bake the matte default (metalness→0, roughness floored) + compress textures.
  // Shared with the /finish endpoint so there's one implementation. See glb.ts.
  glbBuffer = await processGlb(glbBuffer, { roughnessFloor: 0.6, compress: true }, log);
  const glbSizeKb = Math.round(glbBuffer.length / 1024);
  log.info({ rawSizeKb, sizeKb: glbSizeKb }, 'glb downloaded + optimized');
  Sentry.addBreadcrumb({
    category: 'generation',
    type: 'info',
    message: 'glb downloaded',
    level: 'info',
    data: { sizeKb: glbSizeKb },
  });

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
    Sentry.captureException(err, {
      level: 'error',
      tags: { failure_class: 's3_upload', is_transient: 'true' },
      extra: { glbKey },
    });
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

  // ── Step 4b — USDZ (iOS AR Quick Look) — best-effort, mirrors thumbnail ──
  //
  // Why best-effort: GLB is universal (Android WebXR + desktop fallback + the
  // iOS GLB-fallback path if USDZ is missing). USDZ is an iOS-only enhancement.
  // If USDZ download/upload fails for one product, we must NOT fail the whole
  // generation and deny Android users their AR. Same "failure logged-not-thrown"
  // pattern as the thumbnail block above (v5.7 convention).
  //
  // What "soft fail" means: log at warn, fire a Sentry warning (NOT an error),
  // leave usdzUrl null in DB → SDK on iOS falls back to GLB-via-AR-Quick-Look
  // for that one product (which may black-flash per v5.14, but at least doesn't
  // break the whole pipeline). The dashboard's `format: 'glb-fallback'` analytic
  // (Week 9) is how brands will see which products need a regen.
  //
  // The downloader is the same `downloadToBuffer` helper used for GLB and
  // thumbnail (built-in 60s AbortController via DOWNLOAD_TIMEOUT_MS). Do NOT
  // write a second downloader.
  let usdzPublicUrl: string | null = null;
  let usdzSizeKb: number | null = null;
  const usdzSourceUrl = task.modelUrls.usdz;

  if (usdzSourceUrl) {
    try {
      const usdzBuffer = await downloadToBuffer(usdzSourceUrl);
      const usdzKey = s3Keys.productUsdz(brandId, productId, version);
      await uploadToProductsBucket(
        usdzKey,
        usdzBuffer,
        // Apple's expected MIME for USDZ. AR Quick Look is lenient about
        // this but CloudFront + correct MIME = no surprises.
        'model/vnd.usdz+zip',
        'public, max-age=31536000, immutable',
      );
      usdzPublicUrl = publicProductUrl(usdzKey);
      usdzSizeKb = Math.round(usdzBuffer.length / 1024);
      log.info({ sizeKb: usdzSizeKb, usdzKey }, 'usdz uploaded');
      Sentry.addBreadcrumb({
        category: 'generation',
        type: 'info',
        message: 'usdz uploaded',
        level: 'info',
        data: { sizeKb: usdzSizeKb, usdzKey },
      });
    } catch (err) {
      // best-effort: log, Sentry, continue. Android users unaffected.
      log.warn(
        { err: (err as Error).message },
        'usdz download/upload failed — continuing GLB-only',
      );
      Sentry.captureMessage('USDZ pipeline soft-fail (product is GLB-only)', {
        level: 'warning',
        tags: { failure_class: 'usdz_pipeline_soft_fail', is_transient: 'true' },
        extra: { meshyTaskId, usdzSourceUrl: usdzSourceUrl.slice(0, 120) },
      });
    }
  } else {
    log.info(
      { meshyTaskId },
      'meshy returned no usdz url — GLB-only for this product (iOS will fall back)',
    );
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
      // v5.15 USDZ pipeline: null if Meshy returned no usdz URL OR our
      // best-effort download/upload soft-failed. Worker NEVER fails a job
      // because USDZ went missing — Android-first principle.
      usdzUrl: usdzPublicUrl,
      usdzSizeKb,
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
      glbSizeKb,
      usdzUrl: usdzPublicUrl,
      usdzSizeKb,
      creditsUsed: task.creditsUsed,
      durationMs: Date.now() - startTime,
    },
    'generation complete',
  );
  Sentry.addBreadcrumb({
    category: 'generation',
    type: 'info',
    message: 'generation complete',
    level: 'info',
    data: {
      glbSizeKb,
      usdzSizeKb,
      hasUsdz: usdzPublicUrl !== null,
      creditsUsed: task.creditsUsed,
      durationMs: Date.now() - startTime,
    },
  });
}

// ── helpers ──

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Best-effort GLB post-processing. Two independent jobs:
 *
 *  1. MATERIAL NORMALIZATION (the important one for quality). Meshy bakes a PBR
 *     metallic map into nearly every model, and any metalness turns the surface
 *     into mirror-chrome under a viewer's environment lighting (the "wrinkled
 *     foil cupboard" symptom — the warped reflections read as crumpled geometry
 *     even when the mesh is fine). Real products we target (furniture, décor,
 *     homeware, footwear) are non-metallic, so we force `metallicFactor = 0` on
 *     every material and floor `roughnessFactor` to a matte value. This kills
 *     the chrome look everywhere at once — dashboard preview, SDK 3D viewer, and
 *     AR — because it's fixed on the asset, not per-viewer. `texture_prompt`
 *     can't do this; the metallic factor is geometry-of-the-material, not colour.
 *     (Genuinely metallic products — watches/jewellery — already need CAD, so
 *     forcing matte there is acceptable collateral.)
 *
 *  2. TEXTURE COMPRESSION (size). Resize maps to <=2048 + WebP; typically 80-90%
 *     smaller with no visible quality loss. Needs the native `sharp` binary.
 *
 * Resilience: material normalization + dedup/prune need only gltf-transform (no
 * native deps), so they run in their own stage that survives even when `sharp`
 * is unavailable. Texture compression is a nested best-effort — if `sharp`
 * fails to load we still return the material-normalized, geometry-identical GLB.
 * The whole thing is wrapped so a malformed GLB just returns the ORIGINAL buffer
 * — post-processing must NEVER fail a generation.
 */
async function optimizeGlb(
  buf: Buffer,
  log: { warn: (obj: object, msg: string) => void },
): Promise<Buffer> {
  try {
    const [core, ext, fns] = await Promise.all([
      import('@gltf-transform/core'),
      import('@gltf-transform/extensions'),
      import('@gltf-transform/functions'),
    ]);
    const io = new core.NodeIO().registerExtensions(ext.ALL_EXTENSIONS);
    const doc = await io.readBinary(new Uint8Array(buf));

    // ── Stage 1: material normalization + cleanup (no native deps) ──
    for (const mat of doc.getRoot().listMaterials()) {
      // Force non-metallic. metallicFactor multiplies the metallic (blue)
      // channel of any metallicRoughness texture, so 0 defeats a baked
      // metallic map too — no need to delete the texture (its roughness/green
      // channel detail is preserved).
      mat.setMetallicFactor(0);
      // Floor roughness so dielectric specular highlights don't turn a matte
      // product glossy. Meshy sometimes ships a low roughnessFactor; clamp up,
      // never down (a legitimately rougher value is left alone).
      if (mat.getRoughnessFactor() < 0.6) mat.setRoughnessFactor(0.6);
    }
    await doc.transform(fns.dedup(), fns.prune());

    // ── Stage 2: texture compression (needs sharp; nested best-effort) ──
    try {
      const sharpMod = await import('sharp');
      await doc.transform(
        fns.textureCompress({
          encoder: sharpMod.default,
          targetFormat: 'webp',
          resize: [2048, 2048],
        }),
      );
    } catch (err) {
      log.warn(
        { err: (err as Error).message },
        'glb texture compression skipped (sharp unavailable) — shipping material-normalized GLB',
      );
    }

    const out = await io.writeBinary(doc);
    return Buffer.from(out);
  } catch (err) {
    log.warn(
      { err: (err as Error).message },
      'glb post-processing failed — uploading original GLB',
    );
    return buf;
  }
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

  // BullMQ holds a per-job lock for `lockDuration` ms; an internal renewer
  // refreshes it every `lockDuration / 2`. If a job's processing time exceeds
  // the lock and renewal fails (worker crash, blocked event loop, network
  // blip to Redis), BullMQ marks the job stalled and another worker can pick
  // it up — risking double-processing.
  //
  // Default is 30 s; our jobs poll Meshy for up to GENERATION_MAX_DURATION_MS
  // (5 min default). 30 s is dangerously short — proven by the May 2026
  // incident: a worker killed mid-poll left a stale lock that surfaced as
  // "Missing lock for job ... moveToFinished" + "job stalled more than
  // allowable limit", causing the job to fail even after the fix landed.
  //
  // Set to GENERATION_MAX_DURATION_MS + 60 s headroom so even a job that
  // saturates its full polling budget keeps its lock through completion.
  const env = getEnv();
  const lockDurationMs = env.GENERATION_MAX_DURATION_MS + 60_000;

  const worker = new Worker<GenerationJobData>(
    GENERATION_QUEUE_NAME,
    processGenerationJob,
    {
      connection: getWorkerRedis(),
      concurrency: 3,
      lockDuration: lockDurationMs,
      // Stall detection: if a job stops reporting progress for `stalledInterval`
      // ms BullMQ assumes the worker died and reschedules. Bumped above the
      // default 30s for the same reason as `lockDuration` — long polls must
      // not look like stalls.
      stalledInterval: 120_000,
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
    Sentry.withScope((scope) => {
      if (job) tagGenerationScope(scope, job.data, job.id);
      scope.setTag('failure_class', 'bullmq_thrown');
      Sentry.captureException(err);
    });
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
