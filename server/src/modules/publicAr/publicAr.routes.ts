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

const BrandParamsSchema = z.object({
  brandSlug: z.string().regex(/^[a-z0-9-]+$/).max(100),
  productSlug: z.string().regex(/^[a-z0-9-]+$/).max(100),
});

const AR_CACHE = 'public, max-age=30, s-maxage=30, stale-while-revalidate=60';

/**
 * GET /v1/ar/b/:brandSlug/:productSlug — keyless resolve by brand slug.
 * Registered BEFORE the /:apiKey/:productSlug route so a `/b/...` path isn't
 * mis-parsed as an API key. Powers the shareable hosted viewer.
 */
router.get(
  '/b/:brandSlug/:productSlug',
  publicArRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const { brandSlug, productSlug } = BrandParamsSchema.parse(req.params);
    const product = await publicArService.resolveProductByBrandSlug(brandSlug, productSlug);
    res.set('Cache-Control', AR_CACHE);
    res.json(product);
  }),
);

router.get(
  '/:apiKey/:productSlug',
  publicArRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const { apiKey, productSlug } = ParamsSchema.parse(req.params);
    const product = await publicArService.resolveProduct(apiKey, productSlug);

    // v5.18 — tightened from max-age=300 to max-age=30. Brand product updates
    // (dimensions, name, GLB URL after regen) must reflect to shoppers within
    // ~1 minute without manual cache-bust. `stale-while-revalidate=60` keeps
    // latency low: shoppers see slightly-stale data instantly while the CDN
    // refreshes in the background. Per-product targeted invalidation on
    // updates is a Phase 2 refinement.
    res.set(
      'Cache-Control',
      'public, max-age=30, s-maxage=30, stale-while-revalidate=60',
    );

    res.json(product);
  }),
);

export const publicArRoutes: Router = router;
