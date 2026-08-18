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
  clearKeys: Array<keyof GenerationMetadata> = [],
): Prisma.InputJsonValue {
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? (existing as ProductMetadataShape)
      : {};
  const generation: GenerationMetadata = { ...(base.generation ?? {}), ...patch };
  // Drop stale keys AFTER the merge — e.g. a successful regen must not leave
  // a prior attempt's `failedAt`/`reason`/`isTransient` sitting alongside the
  // new success fields (a READY product showing a failure reason confuses the
  // dashboard). Merging doesn't remove keys, so clear them explicitly.
  for (const k of clearKeys) delete generation[k];
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
        category: true,
        status: true,
        photoUrls: true,
        glbUrl: true,
        metadata: true,
        updatedAt: true,
      },
    }),

  /**
   * Atomically transition product PENDING|FAILED → PROCESSING (and READY →
   * PROCESSING when `allowFromReady` is set — an explicit regen) and stamp the
   * Meshy task id into metadata.generation. Returns `{ updated: boolean }`
   * — false means another request beat us to it (race) or the product moved
   * to a non-restartable status. Callers must treat false as a 409 Conflict
   * AND remember the Meshy task they just paid for is now orphaned (logging
   * is the service layer's responsibility).
   *
   * `allowFromReady`: when the caller passed an explicit `config` to
   * regenerate an already-READY product, READY must be a valid source state
   * here too. Without this, the service-layer regen check would pass but this
   * atomic guard would reject READY → PROCESSING, returning count: 0 — which
   * the service misreads as a race and 409s AFTER the Meshy task was created
   * and charged, orphaning it. (Bug fixed Week 8 — the guard and the
   * service-layer precondition had drifted out of sync.)
   */
  async markProductProcessing(
    brandId: string,
    productId: string,
    meshyTaskId: string,
    meshyTaskKind: 'single' | 'multi',
    attemptNumber: number,
    allowFromReady = false,
  ): Promise<{ updated: boolean }> {
    // The set of source statuses from which a generation may start. READY is
    // included only for an explicit regen so accidental retries can't silently
    // burn credits on a product that already has a GLB.
    const allowedStatuses = allowFromReady
      ? [ProductStatus.PENDING, ProductStatus.FAILED, ProductStatus.READY]
      : [ProductStatus.PENDING, ProductStatus.FAILED];

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
        status: { in: allowedStatuses },
      },
      select: { metadata: true },
    });
    if (!current) return { updated: false };

    const merged = mergeGenerationMetadata(current.metadata, {
      meshyTaskId,
      // Persisted so the worker polls the matching Meshy GET endpoint
      // (single vs multi have separate poll URLs).
      meshyTaskKind,
      attemptNumber,
      startedAt: new Date().toISOString(),
    });

    const result = await prisma.product.updateMany({
      where: {
        id: productId,
        brandId,
        deletedAt: null,
        status: { in: allowedStatuses },
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
      // v5.15: USDZ is best-effort (iOS AR Quick Look). Nullable so worker can
      // pass null when Meshy returned no usdz URL OR our download/upload
      // soft-failed (Android-first principle — never deny GLB users their AR
      // just because USDZ couldn't be captured).
      usdzUrl?: string | null;
      usdzSizeKb?: number | null;
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

    const merged = mergeGenerationMetadata(
      current.metadata,
      {
        completedAt: new Date().toISOString(),
        version: args.version,
        creditsUsed: args.creditsUsed,
        thumbnailUrl: args.thumbnailUrl,
      },
      // Clear any failure state from a prior attempt — this row is now READY.
      ['failedAt', 'reason', 'isTransient'],
    );

    const result = await prisma.product.updateMany({
      where: { id: productId, brandId, deletedAt: null },
      data: {
        status: ProductStatus.READY,
        glbUrl: args.glbUrl,
        glbSizeKb: args.glbSizeKb,
        // Explicit null is the "we tried and got nothing" signal — not
        // `undefined` which would skip the column entirely on update. Both
        // are fine on first-write; the explicit-null matters on regen where
        // a previously-set USDZ might be cleared if the new attempt fails.
        usdzUrl: args.usdzUrl ?? null,
        usdzSizeKb: args.usdzSizeKb ?? null,
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
   * Worker-only projection: just the fields the BullMQ job needs to make
   * decisions (status + meshyTaskId stashed in metadata.generation).
   * Smaller than `findProductForGeneration` because the worker doesn't
   * need name/slug/photoUrls/glbUrl.
   */
  findProductForJob: (brandId: string, productId: string) =>
    prisma.product.findFirst({
      where: { id: productId, brandId, deletedAt: null },
      select: { id: true, status: true, metadata: true },
    }),

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
        // v5.15: surface USDZ state so the dashboard can flag products
        // that need a regen to get iOS coverage.
        usdzUrl: true,
        usdzSizeKb: true,
        metadata: true,
        updatedAt: true,
      },
    }),
};
