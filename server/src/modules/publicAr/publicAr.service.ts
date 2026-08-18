import { apiKeysService } from '../apiKeys/apiKeys.service.js';
import { publicArRepository } from './publicAr.repository.js';
import { NotFoundError } from '../../shared/errors.js';
import type { PublicProductResponse } from './publicAr.types.js';

// Public-safe brand fields, from either an API-key lookup or a brand-slug lookup.
interface PublicBrand {
  slug: string;
  companyName: string;
  primaryColor: string | null;
  textColor: string | null;
  buttonStyle: string | null;
  buttonLabel: string | null;
}
type ProductWithAssets = NonNullable<
  Awaited<ReturnType<typeof publicArRepository.findBySlugWithReadyAssets>>
>;

/** Shape a product + brand into the public AR response (shared by both resolvers). */
function formatProduct(product: ProductWithAssets, brand: PublicBrand): PublicProductResponse {
  // Thumbnail lives in metadata.generation.thumbnailUrl (best-effort upload
  // in the worker — every READY product normally has one). Read defensively.
  const genMeta = (product.metadata ?? {}) as {
    generation?: { thumbnailUrl?: string | null };
  };
  const thumbnailUrl = genMeta.generation?.thumbnailUrl ?? null;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    arMode: product.arMode,
    category: product.category,
    thumbnailUrl,
    photoUrls: product.photoUrls ?? [],
    glbUrl: product.glbUrl,
    usdzUrl: product.usdzUrl,
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
      slug: brand.slug,
      name: brand.companyName,
      // Theme passed through as-is (null stays null); the SDK owns what
      // "Rekaman default" means.
      theme: {
        primaryColor: brand.primaryColor,
        textColor: brand.textColor,
        buttonStyle: brand.buttonStyle,
        buttonLabel: brand.buttonLabel,
      },
    },
    generatedAt: new Date().toISOString(),
  };
}

/** Uniform validity gate — same NotFoundError for missing/unready/no-glb (no info leak). */
function assertServable(product: ProductWithAssets | null): asserts product is ProductWithAssets {
  if (!product || product.status !== 'READY') throw new NotFoundError('Product');
  if (product.arMode === 'placement' && !product.glbUrl) throw new NotFoundError('Product');
}

export const publicArService = {
  /**
   * Resolve API key + product slug → public product data. Used by the SDK on
   * brand product pages. Throws NotFoundError on ANY failure (no info leak
   * between bad key, bad slug, unready product).
   */
  resolveProduct: async (apiKey: string, productSlug: string): Promise<PublicProductResponse> => {
    const auth = await apiKeysService.verifyKey(apiKey);
    if (!auth) throw new NotFoundError('Product');

    const product = await publicArRepository.findBySlugWithReadyAssets(auth.brandId, productSlug);
    assertServable(product);
    return formatProduct(product, {
      slug: auth.brand.slug,
      companyName: auth.brand.companyName,
      primaryColor: auth.brand.primaryColor,
      textColor: auth.brand.textColor,
      buttonStyle: auth.brand.buttonStyle,
      buttonLabel: auth.brand.buttonLabel,
    });
  },

  /**
   * Resolve brand slug + product slug → the SAME public product data, with NO
   * API key. Powers the shareable hosted viewer (rekaman.io/s/{brand}/{slug})
   * so the dashboard can generate share links without exposing/needing the
   * full key. Safe: the AR data returned is exactly what shoppers already see.
   */
  resolveProductByBrandSlug: async (
    brandSlug: string,
    productSlug: string,
  ): Promise<PublicProductResponse> => {
    const brand = await publicArRepository.findBrandBySlug(brandSlug);
    if (!brand) throw new NotFoundError('Product');

    const product = await publicArRepository.findBySlugWithReadyAssets(brand.id, productSlug);
    assertServable(product);
    return formatProduct(product, brand);
  },
};
