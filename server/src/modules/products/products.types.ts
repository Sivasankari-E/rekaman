import type { Product, ProductStatus } from '@prisma/client';

export interface CreateProductInput {
  name: string;
  slug: string;
  widthCm?: number;
  heightCm?: number;
  depthCm?: number;
}

export interface UpdateProductInput {
  name?: string;
  slug?: string;
  status?: ProductStatus;
  widthCm?: number;
  heightCm?: number;
  depthCm?: number;
}

export type { Product, ProductStatus };
