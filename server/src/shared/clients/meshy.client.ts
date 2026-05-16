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

export interface MeshyImageTo3dInput {
  imageUrl: string;
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
const meshyTaskResponseSchema = z.object({
  id: z.string(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'SUCCEEDED', 'FAILED', 'CANCELED']),
  progress: z.number().min(0).max(100),
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
  started_at: z.number().int().nonnegative(),
  finished_at: z.number().int().nonnegative(),
  created_at: z.number().int().nonnegative(),
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
   * Create an image-to-3D task. Returns the Meshy task ID.
   * Credits are charged immediately on a successful 202 response.
   */
  async createImageTo3dTask(input: MeshyImageTo3dInput): Promise<string> {
    const { baseUrl, apiKey } = this.getCredentials();

    const body = {
      image_url: input.imageUrl,
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

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/openapi/v1/image-to-3d`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      logger.warn(
        { err: (err as Error).message, op: 'meshy.create' },
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

    logger.info({ taskId: parsed.data.result, op: 'meshy.create' }, 'meshy task created');
    return parsed.data.result;
  }

  /**
   * Fetch the current state of a task. Used by the worker's poll loop.
   */
  async getImageTo3dTask(taskId: string): Promise<MeshyTask> {
    const { baseUrl, apiKey } = this.getCredentials();

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/openapi/v1/image-to-3d/${encodeURIComponent(taskId)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
      });
    } catch (err) {
      logger.warn(
        { err: (err as Error).message, taskId, op: 'meshy.poll' },
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
      progress: data.progress,
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
      startedAt: data.started_at,
      finishedAt: data.finished_at,
      createdAt: data.created_at,
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
