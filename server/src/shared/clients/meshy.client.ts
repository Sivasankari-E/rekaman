import { z } from 'zod';
import { getEnv } from '../env.js';
import { logger } from '../logger.js';
import {
  ValidationError,
  ExternalServiceError,
  RateLimitExceededError,
  PaymentRequiredError,
  NotFoundError,
} from '../errors.js';

/**
 * Meshy.ai client — image-to-3D task lifecycle.
 *
 * Per CLAUDE.md → External API Boundaries: every fetch is wrapped so that
 * NO underlying network/parse error escapes as an unhandled 500. Public-internet
 * attackers spamming malformed inputs would otherwise pollute Sentry with
 * garbage from Meshy's internals.
 *
 * Failure mapping:
 *   400/422   → ValidationError       (caller's input was rejected)
 *   401       → ExternalServiceError  (OUR config issue — logged at error)
 *   402       → PaymentRequiredError  (out of credits — escalate to billing)
 *   404       → NotFoundError         (task ID unknown)
 *   429       → RateLimitExceededError
 *   5xx       → ExternalServiceError
 *   network   → ExternalServiceError
 *   bad JSON  → ExternalServiceError
 *   bad shape → ExternalServiceError
 *
 * Credit-cost discipline: createImageTo3dTask charges credits the moment Meshy
 * accepts the request. The service layer must atomically transition the
 * product to PROCESSING immediately after a successful create — failing to do
 * so means a paid-for task with no DB row to track it.
 */

// ── PUBLIC TYPES ──

export type MeshyTaskStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELED';

/**
 * Which Meshy endpoint a task was created against. CRITICAL: single-image
 * and multi-image tasks have SEPARATE polling URLs —
 *   single → GET /openapi/v1/image-to-3d/:id
 *   multi  → GET /openapi/v1/multi-image-to-3d/:id
 * — so this `kind` must be persisted alongside the task ID and passed back
 * to `getImageTo3dTask` when polling. Polling a multi-image task on the
 * single-image GET endpoint returns 404.
 */
export type MeshyTaskKind = 'single' | 'multi';

export interface MeshyImageTo3dInput {
  /**
   * 1-4 image URLs of the SAME object from different angles. 1 image routes
   * to the single-image endpoint; 2-4 route to multi-image-to-3d (materially
   * better back/side geometry). Meshy's hard cap is 4 — a 5th+ is rejected
   * here with a ValidationError (the route-layer Zod schema also caps at 4;
   * this is defense-in-depth for any caller bypassing the route).
   */
  imageUrls: string[];
  aiModel?: 'meshy-6' | 'latest';
  shouldRemesh?: boolean;
  shouldTexture?: boolean;
  enablePbr?: boolean;
  targetPolycount?: number;
  autoSize?: boolean;
  originAt?: 'bottom' | 'center';
  targetFormats?: Array<'glb' | 'fbx' | 'usdz' | 'obj'>;
  imageEnhancement?: boolean;
  removeLighting?: boolean;
}

export interface MeshyTextureUrlSet {
  baseColor: string;
  metallic?: string;
  normal?: string;
  roughness?: string;
}

export interface MeshyTask {
  id: string;
  status: MeshyTaskStatus;
  progress: number;
  modelUrls: { glb?: string; fbx?: string; usdz?: string; obj?: string };
  thumbnailUrl?: string;
  textureUrls?: MeshyTextureUrlSet[];
  taskError?: { message: string };
  startedAt: number;
  finishedAt: number;
  createdAt: number;
  creditsUsed?: number;
}

// ── INTERNAL: zod schemas for defensive parsing of Meshy responses ──

const meshyCreateResponseSchema = z.object({
  result: z.string().min(1),
});

// Meshy is generous with `null`-vs-omitted: a SUCCEEDED task returns
// `task_error: null` (not omitted), texture maps may be null per material,
// and `consumed_credits` is the v1 field (older docs say `credits_used`).
// Use `.nullish()` everywhere null-or-undefined is possible — `.optional()`
// alone fails on null and crashes the worker mid-poll.
//
// ONLY `id` and `status` are load-bearing for the worker's control flow
// (status drives SUCCEEDED → download / FAILED → mark-failed / else → poll).
// EVERYTHING else is metadata and MUST be `.nullish()` — a strict requirement
// on a non-essential field makes the whole parse fail, the client throws
// `ExternalServiceError`, and the worker treats that as TRANSIENT and keeps
// polling until its 300s budget runs out, then lies about a "timeout".
//
// This is exactly what bit us in May 2026: a FAILED task returns `null`/`0`/
// omitted timestamps, the then-required `started_at`/`finished_at`/`created_at`
// rejected it, and a Meshy `service_unavailable` (status: FAILED, with a real
// `task_error.message`) was mis-reported as "Generation timed out after 300s".
// The worker's FAILED branch was correct all along — it just never got to run
// because parsing died first. Keep every metadata field nullish.
const meshyTaskResponseSchema = z.object({
  id: z.string(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'SUCCEEDED', 'FAILED', 'CANCELED']),
  progress: z.number().min(0).max(100).nullish(),
  model_urls: z
    .object({
      glb: z.string().url().nullish(),
      fbx: z.string().url().nullish(),
      usdz: z.string().url().nullish(),
      obj: z.string().url().nullish(),
    })
    .nullish(),
  thumbnail_url: z.string().url().nullish(),
  texture_urls: z
    .array(
      z.object({
        base_color: z.string().url(),
        metallic: z.string().url().nullish(),
        normal: z.string().url().nullish(),
        roughness: z.string().url().nullish(),
        emission: z.string().url().nullish(),
      }),
    )
    .nullish(),
  task_error: z.object({ message: z.string() }).nullish(),
  // Timestamps are metadata the worker never reads — nullish so a FAILED task
  // with null/omitted timestamps still parses (see block comment above).
  started_at: z.number().int().nonnegative().nullish(),
  finished_at: z.number().int().nonnegative().nullish(),
  created_at: z.number().int().nonnegative().nullish(),
  // Meshy v1 returns `consumed_credits`; older payloads sometimes had
  // `credits_used`. Accept both — we read whichever is present.
  consumed_credits: z.number().int().nonnegative().nullish(),
  credits_used: z.number().int().nonnegative().nullish(),
});

// ── CLIENT ──

class MeshyClient {
  private getCredentials(): { baseUrl: string; apiKey: string } {
    const env = getEnv();
    if (!env.MESHY_API_KEY) {
      throw new ExternalServiceError(
        'meshy',
        'MESHY_API_KEY is not configured',
      );
    }
    return { baseUrl: env.MESHY_API_BASE, apiKey: env.MESHY_API_KEY };
  }

  /**
   * Create an image-to-3D task from 1-4 images.
   *
   * Routes by image count:
   *   1 image  → POST /openapi/v1/image-to-3d        (body: image_url)
   *   2-4      → POST /openapi/v1/multi-image-to-3d   (body: image_urls)
   *
   * Returns the Meshy task ID AND the `kind` — the caller MUST persist the
   * kind so the worker polls the matching GET endpoint (the two endpoints
   * have separate task-ID namespaces / poll URLs).
   *
   * Credits are charged immediately on a successful 202 response.
   */
  async createImageTo3dTask(
    input: MeshyImageTo3dInput,
  ): Promise<{ taskId: string; kind: MeshyTaskKind }> {
    const { baseUrl, apiKey } = this.getCredentials();

    if (input.imageUrls.length === 0) {
      throw new ValidationError('At least 1 image URL is required for generation');
    }
    if (input.imageUrls.length > 4) {
      throw new ValidationError(
        `Meshy accepts at most 4 images per task, got ${input.imageUrls.length}. ` +
          'Use the 4 best angles: front, 3/4, side, detail.',
      );
    }

    const kind: MeshyTaskKind = input.imageUrls.length > 1 ? 'multi' : 'single';

    // Shared params — identical across both endpoints. Only the image field
    // and the URL path differ.
    const commonBody = {
      ai_model: input.aiModel ?? 'meshy-6',
      should_remesh: input.shouldRemesh ?? true,
      should_texture: input.shouldTexture ?? true,
      enable_pbr: input.enablePbr ?? true,
      target_polycount: input.targetPolycount,
      auto_size: input.autoSize ?? true,
      origin_at: input.originAt ?? 'bottom',
      // Default includes BOTH glb (Android WebXR / desktop fallback) and usdz
      // (iOS AR Quick Look). Without 'usdz' in target_formats, Meshy does NOT
      // include model_urls.usdz in the response — and we'd silently degrade
      // iOS to GLB-fallback (the v5.14 "black flash" symptom).
      // No extra Meshy cost — the formats are produced from the same task.
      target_formats: input.targetFormats ?? ['glb', 'usdz'],
      image_enhancement: input.imageEnhancement ?? true,
      remove_lighting: input.removeLighting ?? true,
    };

    const path =
      kind === 'multi' ? '/openapi/v1/multi-image-to-3d' : '/openapi/v1/image-to-3d';
    const body =
      kind === 'multi'
        ? { image_urls: input.imageUrls, ...commonBody }
        : { image_url: input.imageUrls[0], ...commonBody };

    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      logger.warn(
        { err: (err as Error).message, op: 'meshy.create', kind },
        'meshy network error',
      );
      throw new ExternalServiceError('meshy', 'Network error contacting Meshy');
    }

    if (!response.ok) {
      await this.handleHttpError(response, 'meshy.create');
    }

    const json = await this.readJson(response, 'meshy.create');
    const parsed = meshyCreateResponseSchema.safeParse(json);
    if (!parsed.success) {
      logger.warn(
        { errors: parsed.error.issues, op: 'meshy.create' },
        'meshy create response shape unexpected',
      );
      throw new ExternalServiceError('meshy', 'Meshy create response shape unexpected');
    }

    logger.info(
      { taskId: parsed.data.result, op: 'meshy.create', kind, imageCount: input.imageUrls.length },
      'meshy task created',
    );
    return { taskId: parsed.data.result, kind };
  }

  /**
   * Fetch the current state of a task. Used by the worker's poll loop.
   *
   * `kind` MUST match how the task was created — single and multi tasks have
   * separate GET endpoints. Defaults to 'single' for backward-compatibility:
   * tasks created before the multi-image switch have no `meshyTaskKind` in
   * their stored metadata, and were all single-image.
   */
  async getImageTo3dTask(
    taskId: string,
    kind: MeshyTaskKind = 'single',
  ): Promise<MeshyTask> {
    const { baseUrl, apiKey } = this.getCredentials();

    const path =
      kind === 'multi' ? '/openapi/v1/multi-image-to-3d' : '/openapi/v1/image-to-3d';

    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}/${encodeURIComponent(taskId)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
      });
    } catch (err) {
      logger.warn(
        { err: (err as Error).message, taskId, op: 'meshy.poll', kind },
        'meshy network error',
      );
      throw new ExternalServiceError('meshy', 'Network error contacting Meshy');
    }

    if (!response.ok) {
      await this.handleHttpError(response, 'meshy.poll', taskId);
    }

    const json = await this.readJson(response, 'meshy.poll');
    const parsed = meshyTaskResponseSchema.safeParse(json);
    if (!parsed.success) {
      logger.warn(
        { taskId, errors: parsed.error.issues, op: 'meshy.poll' },
        'meshy task response shape unexpected',
      );
      throw new ExternalServiceError('meshy', 'Meshy task response shape unexpected');
    }

    const data = parsed.data;
    return {
      id: data.id,
      status: data.status,
      // progress is cosmetic (BullMQ job inspector); default 0 if Meshy omits.
      progress: data.progress ?? 0,
      // `.nullish()` lets `model_urls` be null/undefined; collapse to {}
      // so callers can always do `task.modelUrls.glb`.
      modelUrls: {
        glb: data.model_urls?.glb ?? undefined,
        fbx: data.model_urls?.fbx ?? undefined,
        usdz: data.model_urls?.usdz ?? undefined,
        obj: data.model_urls?.obj ?? undefined,
      },
      thumbnailUrl: data.thumbnail_url ?? undefined,
      textureUrls:
        data.texture_urls?.map((t) => ({
          baseColor: t.base_color,
          metallic: t.metallic ?? undefined,
          normal: t.normal ?? undefined,
          roughness: t.roughness ?? undefined,
        })) ?? undefined,
      taskError: data.task_error ?? undefined,
      // Default to 0 — these are metadata the worker never reads; nullish in
      // the schema so a FAILED task with null/omitted timestamps still parses.
      startedAt: data.started_at ?? 0,
      finishedAt: data.finished_at ?? 0,
      createdAt: data.created_at ?? 0,
      // Prefer the v1 field; fall back for older payloads.
      creditsUsed: data.consumed_credits ?? data.credits_used ?? undefined,
    };
  }

  // ── helpers ──

  private async readJson(response: Response, op: string): Promise<unknown> {
    try {
      return await response.json();
    } catch (err) {
      logger.warn({ err: (err as Error).message, op }, 'meshy response not JSON');
      throw new ExternalServiceError('meshy', 'Meshy returned non-JSON response');
    }
  }

  /**
   * Convert HTTP error responses to typed DomainErrors. Always throws — never
   * returns. Logged at warn level since these are expected operational events
   * (caller passed bad input, credits ran out, Meshy throttled us, etc.).
   * The 401 case is the exception — that's a config failure on our end and
   * deserves an error-level log so it surfaces in alerting.
   */
  private async handleHttpError(
    response: Response,
    op: string,
    taskId?: string,
  ): Promise<never> {
    const bodyText = await response
      .text()
      .catch(() => '');
    const ctx = {
      status: response.status,
      op,
      taskId,
      body: bodyText.slice(0, 500),
    };

    switch (response.status) {
      case 400:
      case 422:
        logger.warn(ctx, 'meshy rejected input');
        throw new ValidationError(`Meshy rejected input: ${bodyText.slice(0, 200)}`);
      case 401:
        logger.error(ctx, 'meshy auth failed — check MESHY_API_KEY');
        throw new ExternalServiceError('meshy', 'Meshy authentication failed');
      case 402:
        logger.warn(ctx, 'meshy credits exhausted');
        throw new PaymentRequiredError('Meshy credits exhausted');
      case 404:
        logger.warn(ctx, 'meshy task not found');
        throw new NotFoundError('Meshy task');
      case 429:
        logger.warn(ctx, 'meshy rate limit');
        throw new RateLimitExceededError();
      case 500:
      case 502:
      case 503:
      case 504:
        logger.warn(ctx, 'meshy server error');
        throw new ExternalServiceError('meshy', `Meshy server error (${response.status})`);
      default:
        logger.warn(ctx, 'meshy unexpected status');
        throw new ExternalServiceError('meshy', `Meshy returned ${response.status}`);
    }
  }
}

let cached: MeshyClient | undefined;

export function getMeshyClient(): MeshyClient {
  if (!cached) cached = new MeshyClient();
  return cached;
}
