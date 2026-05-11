import { Router } from 'express';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { productsService } from './products.service.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';

const router = Router();

router.use(requireAuth);

const SlugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and dashes');

// `arMode` mirrors Product.arMode in the Prisma schema. Server-side default is
// 'placement' so omitting it is safe — see `category` too which is nullable.
// Added in Week 6 Day 2 so server/scripts/onboard-brand.mjs can persist the
// brand-provided arMode + category instead of having Zod silently strip them.
const ArModeSchema = z.enum([
  'placement',
  'tryon-face',
  'tryon-wrist',
  'tryon-hand',
  'tryon-foot',
  'tryon-photo',
  'multi-scene',
  'audio-preview',
]);

// Loose category — we don't want a closed enum here because brands invent
// their own taxonomies (e.g. "home-decor", "wedding-jewelry"). 64 chars is
// generous for slug-style + readable names.
const CategorySchema = z.string().min(1).max(64).regex(/^[a-z0-9-]+$/i, 'category must be alphanumeric/dashes');

const CreateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: SlugSchema,
  arMode: ArModeSchema.optional(),
  category: CategorySchema.nullable().optional(),
  widthCm: z.number().positive().max(10_000).optional(),
  heightCm: z.number().positive().max(10_000).optional(),
  depthCm: z.number().positive().max(10_000).optional(),
});

const UpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: SlugSchema.optional(),
  arMode: ArModeSchema.optional(),
  category: CategorySchema.nullable().optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'READY', 'FAILED', 'ARCHIVED']).optional(),
  widthCm: z.number().positive().max(10_000).optional(),
  heightCm: z.number().positive().max(10_000).optional(),
  depthCm: z.number().positive().max(10_000).optional(),
});

const IdParam = z.object({ id: z.string().min(1).max(50) });

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const products = await productsService.list(req.brandId!);
    res.json({ products });
  })
);

router.post(
  '/',
  requireRole('OWNER', 'ADMIN', 'MEMBER'),
  asyncHandler(async (req: Request, res: Response) => {
    const input = CreateSchema.parse(req.body);
    const product = await productsService.create(req.brandId!, input);
    res.status(201).json({ product });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = IdParam.parse(req.params);
    const product = await productsService.get(req.brandId!, id);
    res.json({ product });
  })
);

router.patch(
  '/:id',
  requireRole('OWNER', 'ADMIN', 'MEMBER'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = IdParam.parse(req.params);
    const input = UpdateSchema.parse(req.body);
    const product = await productsService.update(req.brandId!, id, input);
    res.json({ product });
  })
);

router.delete(
  '/:id',
  requireRole('OWNER', 'ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = IdParam.parse(req.params);
    await productsService.delete(req.brandId!, id);
    res.status(204).end();
  })
);

export const productsRoutes: Router = router;
