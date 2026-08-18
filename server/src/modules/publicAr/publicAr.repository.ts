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

  /**
   * Find a (non-deleted) brand by its public slug — for the keyless hosted-
   * viewer / share endpoint. Returns only the public-safe fields (identity +
   * AR-button theme); the AR data these gate is already public.
   */
  findBrandBySlug: (slug: string) =>
    prisma.brand.findFirst({
      where: { slug, deletedAt: null },
      select: {
        id: true,
        slug: true,
        companyName: true,
        primaryColor: true,
        textColor: true,
        buttonStyle: true,
        buttonLabel: true,
      },
    }),
};
