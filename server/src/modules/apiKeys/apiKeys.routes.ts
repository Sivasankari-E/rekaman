import { Router } from 'express';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { apiKeysService } from './apiKeys.service.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';

const router = Router();
router.use(requireAuth);

const CreateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  scopes: z.array(z.string().min(1).max(50)).max(20).optional(),
  expiresAt: z
    .string()
    .datetime()
    .transform((s) => new Date(s))
    .optional(),
});

const IdParam = z.object({ id: z.string().min(1).max(50) });

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const keys = await apiKeysService.list(req.brandId!);
    res.json({ keys });
  }),
);

router.post(
  '/',
  requireRole('OWNER', 'ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const input = CreateSchema.parse(req.body);
    const created = await apiKeysService.create(req.brandId!, input);
    res.status(201).json({ key: created });
  }),
);

router.delete(
  '/:id',
  requireRole('OWNER', 'ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = IdParam.parse(req.params);
    await apiKeysService.revoke(req.brandId!, id);
    res.status(204).end();
  }),
);

export const apiKeysRoutes: Router = router;
