import { ProductStatus, type Prisma } from '@prisma/client';
import { prisma } from '../../shared/db.js';
import type { GenerationMetadata } from './generation.types.js';

/**
 * Generation repository — the only file in this module that touches Prisma.
 *
 * Every function takes `brandId` as the first arg. TypeScript prevents callers
 * from forgetting it; the underlying Prisma queries enforce it at the DB level.
 *
 * `metadata` is a JSONB column shared across modules; we always merge under
 * the `generation` namespace to avoid clobbering other writers.
 */

type ProductMetadataShape = {
  generation?: GenerationMetadata;
  [k: string]: unknown;
};

function mergeGenerationMetadata(
  existing: Prisma.JsonValue | null,
  patch: GenerationMetadata,
): Prisma.InputJsonValue {
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? (existing as ProductMetadataShape)
      : {};
  const generation: GenerationMetadata = { ...(base.generation ?? {}), ...patch };
  // The merged object is a plain JSON-serializable record; the cast goes
  // through `unknown` because Prisma's `InputJsonValue` union confuses TS's
  // structural-compatibility check on object types (TS2352).
  return { ...base, generation } as unknown as Prisma.InputJsonValue;
}

export const generationRepository = {
  /**
   * Read minimal product fields needed to make a generation decision.
   * Excludes soft-deleted products so we never start a job for one.
   */
  findProductForGeneration: (brandId: string, productId: string) =>
    prisma.product.findFirst({
      where: { id: productId, brandId, deletedAt: null },
      select: {
        id: true,
        brandId: true,
        name: true,
        slug: true,
        status: true,
        photoUrls: true,
        glbUrl: true,
        metadata: true,
        updatedAt: true,
      },
    }),

  /**
   * Atomically transition product PENDING|FAILED → PROCESSING and stamp the
   * Meshy task id into metadata.generation. Returns `{ updated: boolean }`
   * — false means another request beat us to it (race) or the product moved
   * to a non-restartable status. Callers must treat false as a 409 Conflict
   * AND remember the Meshy task they just paid for is now orphaned (logging
   * is the service layer's responsibility).
   */
  async markProductProcessing(
    brandId: string,
    productId: string,
    meshyTaskId: string,
    attemptNumber: number,
  ): Promise<{ updated: boolean }> {
    // Two-step because Prisma's updateMany doesn't expose JSONB merge: first
    // read existing metadata under the (brandId, status-in) guard, then write
    // a merged copy back under the same guard. The second step's updateMany
    // returns count: 0 if the row's status changed between the two queries —
    // safe race-detection.
    const current = await prisma.product.findFirst({
      where: {
        id: productId,
        brandId,
        deletedAt: null,
        status: { in: [ProductStatus.PENDING, ProductStatus.FAILED] },
      },
      select: { metadata: true },
    });
    if (!current) return { updated: false };

    const merged = mergeGenerationMetadata(current.metadata, {
      meshyTaskId,
      attemptNumber,
      startedAt: new Date().toISOString(),
    });

    const result = await prisma.product.updateMany({
      where: {
        id: productId,
        brandId,
        deletedAt: null,
        status: { in: [ProductStatus.PENDING, ProductStatus.FAILED] },
      },
      data: {
        status: ProductStatus.PROCESSING,
        metadata: merged,
      },
    });

    return { updated: result.count > 0 };
  },

  async markProductReady(
    brandId: string,
    productId: string,
    args: {
      glbUrl: string;
      glbSizeKb: number;
      thumbnailUrl?: string;
      version: number;
      creditsUsed?: number;
    },
  ): Promise<{ updated: boolean }> {
    const current = await prisma.product.findFirst({
      where: { id: productId, brandId, deletedAt: null },
      select: { metadata: true },
    });
    if (!current) return { updated: false };

    const merged = mergeGenerationMetadata(current.metadata, {
      completedAt: new Date().toISOString(),
      version: args.version,
      creditsUsed: args.creditsUsed,
      thumbnailUrl: args.thumbnailUrl,
    });

    const result = await prisma.product.updateMany({
      where: { id: productId, brandId, deletedAt: null },
      data: {
        status: ProductStatus.READY,
        glbUrl: args.glbUrl,
        glbSizeKb: args.glbSizeKb,
        metadata: merged,
      },
    });

    return { updated: result.count > 0 };
  },

  async markProductFailed(
    brandId: string,
    productId: string,
    reason: string,
    isTransient: boolean,
  ): Promise<{ updated: boolean }> {
    const current = await prisma.product.findFirst({
      where: { id: productId, brandId, deletedAt: null },
      select: { metadata: true },
    });
    if (!current) return { updated: false };

    const merged = mergeGenerationMetadata(current.metadata, {
      failedAt: new Date().toISOString(),
      reason,
      isTransient,
    });

    const result = await prisma.product.updateMany({
      where: { id: productId, brandId, deletedAt: null },
      data: { status: ProductStatus.FAILED, metadata: merged },
    });

    return { updated: result.count > 0 };
  },

  /**
   * Lightweight projection for the GET /generation-status endpoint.
   */
  getGenerationStatus: (brandId: string, productId: string) =>
    prisma.product.findFirst({
      where: { id: productId, brandId, deletedAt: null },
      select: {
        id: true,
        status: true,
        glbUrl: true,
        glbSizeKb: true,
        metadata: true,
        updatedAt: true,
      },
    }),
};
