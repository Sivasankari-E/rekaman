import { Prisma } from '@prisma/client';
import { productsRepository } from './products.repository.js';
import {
  NotFoundError,
  SlugAlreadyExistsError,
} from '../../shared/errors.js';
import { logger } from '../../shared/logger.js';
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

  async create(brandId: string, input: CreateProductInput): Promise<Product> {
    const existing = await productsRepository.findBySlug(brandId, input.slug);
    if (existing) throw new SlugAlreadyExistsError();

    try {
      const product = await productsRepository.create(brandId, {
        name: input.name,
        slug: input.slug,
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
};
