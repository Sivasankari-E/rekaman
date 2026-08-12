import { Router } from 'express';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { analyticsService } from './analytics.service.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';

const router = Router();
router.use(requireAuth);

// `days` window: bounded 1..365, default 30. Coerced from the query string.
const SummaryQuery = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

/**
 * GET /v1/analytics/summary?days=30 — AR engagement for the caller's brand.
 *
 * Auth: brand JWT (any role — analytics is read-only). brandId comes from the
 * JWT, so a caller only ever sees their own brand's numbers.
 */
router.get(
  '/summary',
  asyncHandler(async (req: Request, res: Response) => {
    const { days } = SummaryQuery.parse(req.query);
    const summary = await analyticsService.summary(req.brandId!, days);
    res.json(summary);
  }),
);

export const analyticsRoutes: Router = router;
