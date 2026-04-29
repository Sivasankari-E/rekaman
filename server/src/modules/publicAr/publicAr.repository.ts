import { prisma } from '../../shared/db.js';

export const publicArRepository = {
  /**
   * Find a non-deleted product by brand + slug, including its READY assets.
   * Status filtering happens in the service so callers see "PENDING" vs
   * "missing" as the same NotFoundError (no info leak).
   */
  findBySlugWithReadyAssets: (brandId: string, slug: string) =>
    prisma.product.findFirst({
      where: {
        brandId,
        slug,
        deletedAt: null,
      },
      include: {
        assets: {
          where: { status: 'READY' },
        },
      },
    }),
};
