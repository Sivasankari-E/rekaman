import type { ProductStatus } from '@prisma/client';

export type GenerationStatus = ProductStatus;

export interface GenerationConfig {
  aiModel: 'meshy-6' | 'latest';
  shouldRemesh: boolean;
  shouldTexture: boolean;
  enablePbr: boolean;
  targetPolycount?: number;
  autoSize: boolean;
}

/**
 * Defaults tuned for AR-on-mobile delivery.
 * - `targetPolycount: 30000` keeps GLBs under ~5MB after compression. Meshy's
 *   default ~80K polys produces files large enough to stutter mid-tier Android
 *   browsers.
 * - `enablePbr: true` lets fabric/leather/wood textures look reasonable under
 *   WebXR's lighting estimation; the size cost is negligible.
 */
export const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  aiModel: 'meshy-6',
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
