import { apiKeysService } from '../apiKeys/apiKeys.service.js';
import { publicArRepository } from './publicAr.repository.js';
import { NotFoundError } from '../../shared/errors.js';
import type { PublicProductResponse } from './publicAr.types.js';

export const publicArService = {
  /**
   * Resolve API key + product slug to public-safe product data.
   * Throws NotFoundError on ANY failure (no info leak between bad key, bad slug, unready product).
   */
  resolveProduct: async (
    apiKey: string,
    productSlug: string,
  ): Promise<PublicProductResponse> => {
    const auth = await apiKeysService.verifyKey(apiKey);
    if (!auth) throw new NotFoundError('Product');

    const product = await publicArRepository.findBySlugWithReadyAssets(
      auth.brandId,
      productSlug,
    );

    if (!product || product.status !== 'READY') {
      throw new NotFoundError('Product');
    }

    // For placement mode, require glbUrl. For other modes, accept assets.
    if (product.arMode === 'placement' && !product.glbUrl) {
      throw new NotFoundError('Product');
    }

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      arMode: product.arMode,
      category: product.category,
      glbUrl: product.glbUrl,
      assets: product.assets.map((a) => ({
        type: a.assetType,
        url: a.url ?? '',
        metadata: a.metadata as Record<string, unknown> | null,
      })),
      dimensions: {
        widthCm: product.widthCm,
        heightCm: product.heightCm,
        depthCm: product.depthCm,
      },
      variants: product.variants ?? null,
      brand: {
        slug: auth.brand.slug,
        name: auth.brand.companyName,
      },
      generatedAt: new Date().toISOString(),
    };
  },
};
