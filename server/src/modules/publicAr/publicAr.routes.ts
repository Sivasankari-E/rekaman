import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import { publicArService } from './publicAr.service.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';

const router = Router();

// Generous limit because this is hot. Per-IP for now; switch to per-API-key in Week 5+ with Redis.
const publicArRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // CORS headers are still applied by app.ts's path-aware cors delegate so the
  // SDK on third-party sites can read the 429 body if rate-limited.
  skip: () => process.env.NODE_ENV === 'test',
});

const ParamsSchema = z.object({
  apiKey: z.string().regex(/^rk_(live|test)_[A-Za-z0-9_-]+$/),
  productSlug: z.string().regex(/^[a-z0-9-]+$/).max(100),
});

router.get(
  '/:apiKey/:productSlug',
  publicArRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const { apiKey, productSlug } = ParamsSchema.parse(req.params);
    const product = await publicArService.resolveProduct(apiKey, productSlug);

    // Cache aggressively at the CDN layer (5 min fresh, 24 hr stale-while-revalidate)
    res.set(
      'Cache-Control',
      'public, max-age=300, s-maxage=300, stale-while-revalidate=86400',
    );

    res.json(product);
  }),
);

export const publicArRoutes: Router = router;
