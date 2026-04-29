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

const CreateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: SlugSchema,
  widthCm: z.number().positive().max(10_000).optional(),
  heightCm: z.number().positive().max(10_000).optional(),
  depthCm: z.number().positive().max(10_000).optional(),
});

const UpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: SlugSchema.optional(),
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
