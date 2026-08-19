import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { productsRepository } from './products.repository.js';
import { assertCanAddProduct } from '../billing/billing.service.js';
import {
  NotFoundError,
  SlugAlreadyExistsError,
  ConflictError,
  ExternalServiceError,
} from '../../shared/errors.js';
import { logger } from '../../shared/logger.js';
import {
  s3Keys,
  uploadToProductsBucket,
  publicProductUrl,
} from '../../shared/clients/s3.client.js';
import { processGlb, FINISH_ROUGHNESS, type Finish } from '../../shared/glb.js';
import type {
  CreateProductInput,
  UpdateProductInput,
  Product,
} from './products.types.js';

function isUniqueConstraintError(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
  );
}

export const productsService = {
  list: (brandId: string): Promise<Product[]> =>
    productsRepository.list(brandId),

  /**
   * Bulk slug → product-id lookup. Returns a Map for O(1) access.
   * Used by the events ingestion service to resolve productSlug → productId.
   */
  findIdMapBySlug: async (
    brandId: string,
    slugs: string[],
  ): Promise<Map<string, string>> => {
    if (slugs.length === 0) return new Map();
    const rows = await productsRepository.findIdsBySlugs(brandId, slugs);
    return new Map(rows.map((r) => [r.slug, r.id]));
  },

  async get(brandId: string, id: string): Promise<Product> {
    const product = await productsRepository.findById(brandId, id);
    if (!product) throw new NotFoundError('Product');
    return product;
  },

  /**
   * Upload a product photo to the products S3 bucket and return its public URL.
   * The brand only ever talks to our API (multipart) — the server does the S3
   * PutObject with its own credentials, so no browser→S3 CORS or presigned-URL
   * plumbing is needed. The returned URL is a valid Meshy input for generation.
   */
  async uploadPhoto(
    brandId: string,
    productId: string,
    body: Buffer,
    ext: string,
    contentType: string,
  ): Promise<{ url: string }> {
    // 404 (not 403) if the product isn't this brand's — no cross-tenant writes.
    const product = await productsRepository.findById(brandId, productId);
    if (!product) throw new NotFoundError('Product');

    const key = s3Keys.productPhoto(brandId, productId, randomUUID(), ext);
    try {
      await uploadToProductsBucket(key, body, contentType);
    } catch (err) {
      logger.warn({ err, brandId, productId }, 'product photo upload failed');
      throw new ExternalServiceError('s3', 'Could not upload the photo. Please try again.');
    }
    logger.info({ brandId, productId, key }, 'product photo uploaded');
    return { url: publicProductUrl(key) };
  },

  async create(brandId: string, input: CreateProductInput): Promise<Product> {
    // Plan gating: enforce the plan's product limit. No-op for brands without
    // an active plan (Concierge/Phase 1) — see assertCanAddProduct.
    await assertCanAddProduct(brandId);

    const existing = await productsRepository.findBySlug(brandId, input.slug);
    if (existing) throw new SlugAlreadyExistsError();

    try {
      // arMode + category are optional on the wire; when omitted, fall through
      // to the Prisma schema defaults (arMode='placement', category=null).
      // Passing `undefined` lets Prisma apply its default; passing `null` is a
      // deliberate "no category".
      const product = await productsRepository.create(brandId, {
        name: input.name,
        slug: input.slug,
        ...(input.arMode !== undefined && { arMode: input.arMode }),
        ...(input.category !== undefined && { category: input.category }),
        widthCm: input.widthCm ?? null,
        heightCm: input.heightCm ?? null,
        depthCm: input.depthCm ?? null,
        photoUrls: [],
      });

      logger.info(
        { brandId, productId: product.id, slug: product.slug },
        'product created'
      );

      return product;
    } catch (err) {
      // Race: simultaneous create requests both passed the pre-check.
      // Surface the unique-constraint violation as our typed 409 instead of a 500.
      if (isUniqueConstraintError(err)) throw new SlugAlreadyExistsError();
      throw err;
    }
  },

  async update(
    brandId: string,
    id: string,
    input: UpdateProductInput
  ): Promise<Product> {
    if (input.slug) {
      const existing = await productsRepository.findBySlug(brandId, input.slug);
      if (existing && existing.id !== id) {
        throw new SlugAlreadyExistsError();
      }
    }

    let result;
    try {
      result = await productsRepository.update(brandId, id, input);
    } catch (err) {
      if (isUniqueConstraintError(err)) throw new SlugAlreadyExistsError();
      throw err;
    }
    if (result.count === 0) throw new NotFoundError('Product');

    const product = await productsRepository.findById(brandId, id);
    if (!product) throw new NotFoundError('Product');

    logger.info({ brandId, productId: id }, 'product updated');
    return product;
  },

  async delete(brandId: string, id: string): Promise<{ ok: true }> {
    const result = await productsRepository.softDelete(brandId, id);
    if (result.count === 0) throw new NotFoundError('Product');

    logger.info({ brandId, productId: id }, 'product deleted');
    return { ok: true };
  },

  /**
   * Change a product's surface finish (matte/satin/glossy) WITHOUT re-running
   * Meshy. Downloads the current GLB, forces matte materials (metalness→0) and
   * sets roughness for the chosen finish, uploads to a fresh immutable key, and
   * repoints the product. Zero AI credits.
   *
   * This also doubles as the fix for products generated before the matte
   * default landed: clicking any finish re-processes the chrome GLB to matte.
   *
   * Runs synchronously in the api process (not the worker) — the stored GLB is
   * already texture-optimized (~1–2 MB), so download+process+upload is a few
   * seconds. USDZ (iOS) is left as-is; the finish applies to the GLB path
   * (Android WebXR, desktop, in-app 3D preview).
   */
  async setFinish(brandId: string, productId: string, finish: Finish): Promise<Product> {
    const product = await productsRepository.findById(brandId, productId);
    if (!product) throw new NotFoundError('Product');
    if (product.status !== 'READY' || !product.glbUrl) {
      throw new ConflictError('Finish can only be changed once the 3D model is ready.');
    }

    const buf = await downloadGlb(product.glbUrl);
    const processed = await processGlb(
      buf,
      { setRoughness: FINISH_ROUGHNESS[finish], compress: false },
      logger,
    );

    // Reuse the generation's version for the key namespace; a unique label
    // (finish + timestamp) keeps every write on a fresh immutable URL.
    const meta = (product.metadata ?? {}) as { generation?: { version?: number } };
    const version = meta.generation?.version ?? 1;
    const key = s3Keys.productGlbVariant(
      brandId,
      productId,
      version,
      `finish-${finish}-${Date.now()}`,
    );
    try {
      await uploadToProductsBucket(key, processed, 'model/gltf-binary');
    } catch (err) {
      logger.warn({ err, brandId, productId }, 'finish: glb upload failed');
      throw new ExternalServiceError('s3', 'Could not save the updated model. Please try again.');
    }

    const result = await productsRepository.setFinish(brandId, productId, {
      glbUrl: publicProductUrl(key),
      glbSizeKb: Math.round(processed.length / 1024),
      finish,
    });
    if (result.count === 0) throw new NotFoundError('Product');

    const updated = await productsRepository.findById(brandId, productId);
    if (!updated) throw new NotFoundError('Product');
    logger.info({ brandId, productId, finish }, 'product finish updated');
    return updated;
  },
};

/**
 * Fetch a GLB from its public URL into a buffer (60s timeout). Wrapped so a
 * network/status failure surfaces as a typed error, per External API Boundaries.
 */
async function downloadGlb(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`status ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    logger.warn({ err: (err as Error).message, url }, 'finish: glb download failed');
    throw new ExternalServiceError('s3', 'Could not read the current 3D model. Please try again.');
  } finally {
    clearTimeout(timer);
  }
}
