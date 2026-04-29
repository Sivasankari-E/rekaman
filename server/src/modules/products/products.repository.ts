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
};
