import type { ProductStatus } from '@prisma/client';

export type GenerationStatus = ProductStatus;

export interface GenerationConfig {
  aiModel: 'meshy-6' | 'meshy-7' | 'latest';
  /**
   * How the source photos are used.
   * - `single` (DEFAULT): reconstruct from the ONE best photo (photoUrls[0])
   *   via Meshy's image-to-3d. This is the right default for the photos brands
   *   actually give us — a hero shot + lifestyle shots at mismatched
   *   crops/angles. It also unlocks `ultraMode`, which Meshy only supports on
   *   single-image.
   * - `multi`: reconstruct from all photos via multi-image-to-3d. Only better
   *   when the photos are a MATCHED angle set (same object, consistent
   *   distance/lighting, clean front/side/back rotation — a turntable). For
   *   casual/mismatched photos this MELTS the geometry, so it's opt-in.
   */
  captureMode: 'single' | 'multi';
  /**
   * Higher-fidelity geometry. Meshy caps `ultra_mode` to the single-image
   * endpoint, so it only takes effect when `captureMode === 'single'`. This is
   * the single biggest lever against "melted/wrinkled" reconstruction of flat
   * furniture panels.
   */
  ultraMode: boolean;
  shouldRemesh: boolean;
  shouldTexture: boolean;
  enablePbr: boolean;
  targetPolycount?: number;
  autoSize: boolean;
}

/**
 * Defaults tuned for AR-on-mobile delivery + the photos real brands give us.
 * - `captureMode: 'single'` + `ultraMode: true` is the quality path: a coherent
 *   ultra-fidelity model from the single best photo beats a melted multi-image
 *   reconstruction of mismatched website shots. `multi` is opt-in for brands
 *   with a proper matched angle set.
 * - `aiModel: 'meshy-7'` is Meshy's newest generation model.
 * - `targetPolycount: 30000` keeps GLBs small enough for mid-tier Android after
 *   texture compression; ultra fidelity is preserved in shape, decimated in
 *   count.
 * - `enablePbr: true` lets fabric/leather/wood look reasonable under WebXR
 *   lighting; the texture prompt (built in the service from the product's
 *   name/category) steers it toward a matte, reflection-free finish.
 */
export const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  aiModel: 'meshy-7',
  captureMode: 'single',
  ultraMode: true,
  shouldRemesh: true,
  shouldTexture: true,
  enablePbr: true,
  targetPolycount: 30000,
  autoSize: true,
};

/**
 * Shape of the `generation` namespace inside `Product.metadata`.
 * The wider `metadata` JSONB column may carry other namespaces (variants,
 * ai-tryon prompts, …) — we only ever read/write our own.
 */
export interface GenerationMetadata {
  meshyTaskId?: string;
  /**
   * Which Meshy endpoint the task was created against — 'single' or 'multi'.
   * The worker MUST poll the matching GET endpoint (single and multi tasks
   * have separate poll URLs). Absent on tasks created before the multi-image
   * switch (May 2026); the worker defaults those to 'single' — correct, as
   * all pre-switch tasks were single-image.
   */
  meshyTaskKind?: 'single' | 'multi';
  attemptNumber?: number;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  reason?: string;
  isTransient?: boolean;
  version?: number;
  creditsUsed?: number;
  thumbnailUrl?: string;
}
