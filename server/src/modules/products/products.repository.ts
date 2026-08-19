import { prisma } from '../../shared/db.js';
import type { Prisma } from '@prisma/client';

/**
 * Every function takes brandId as a required argument.
 * TypeScript REFUSES to compile if you forget — preventing tenant leaks.
 */
export const productsRepository = {
  list: (brandId: string) =>
    prisma.product.findMany({
      where: { brandId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    }),

  /**
   * Bulk slug → id lookup for cross-module needs (e.g. events ingestion).
   * Returns minimal projection; deleted products are excluded.
   */
  findIdsBySlugs: (brandId: string, slugs: string[]) =>
    prisma.product.findMany({
      where: { brandId, slug: { in: slugs }, deletedAt: null },
      select: { id: true, slug: true },
    }),

  findById: (brandId: string, id: string) =>
    prisma.product.findFirst({
      where: { id, brandId, deletedAt: null },
    }),

  findBySlug: (brandId: string, slug: string) =>
    prisma.product.findFirst({
      where: { brandId, slug, deletedAt: null },
    }),

  create: (
    brandId: string,
    data: Omit<Prisma.ProductUncheckedCreateInput, 'brandId'>
  ) =>
    prisma.product.create({
      data: { ...data, brandId },
    }),

  /**
   * Update only succeeds if both id AND brandId match.
   * Returns count: 0 means "not found OR not yours".
   */
  update: (
    brandId: string,
    id: string,
    data: Prisma.ProductUpdateInput
  ) =>
    prisma.product.updateMany({
      where: { id, brandId, deletedAt: null },
      data,
    }),

  softDelete: (brandId: string, id: string) =>
    prisma.product.updateMany({
      where: { id, brandId, deletedAt: null },
      data: { deletedAt: new Date() },
    }),

  /**
   * Point a product at a re-processed (finish-adjusted) GLB. Merges
   * `metadata.finish` without clobbering the `generation` namespace (read →
   * merge → write, brand-scoped). Returns count: 0 if not found / not this brand.
   */
  async setFinish(
    brandId: string,
    id: string,
    args: { glbUrl: string; glbSizeKb: number; finish: string },
  ): Promise<{ count: number }> {
    const current = await prisma.product.findFirst({
      where: { id, brandId, deletedAt: null },
      select: { metadata: true },
    });
    if (!current) return { count: 0 };
    const base =
      current.metadata && typeof current.metadata === 'object' && !Array.isArray(current.metadata)
        ? (current.metadata as Record<string, unknown>)
        : {};
    const merged = { ...base, finish: args.finish } as unknown as Prisma.InputJsonValue;
    return prisma.product.updateMany({
      where: { id, brandId, deletedAt: null },
      data: { glbUrl: args.glbUrl, glbSizeKb: args.glbSizeKb, metadata: merged },
    });
  },
};
