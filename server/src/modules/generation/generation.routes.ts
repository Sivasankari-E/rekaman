import { Router, type Request, type Response } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { generationService } from './generation.service.js';
import {
  productIdParamSchema,
  requestGenerationSchema,
} from './generation.validators.js';

const router = Router();

router.use(requireAuth);

/**
 * POST /v1/products/:productId/generate
 * Auth: required (brand JWT). Role: any member.
 * Body: { photoUrls: string[1..4], config?: { ...overrides } }
 *
 * Returns 202 Accepted. Generation runs asynchronously in the worker; clients
 * poll the status endpoint below for progress.
 */
router.post(
  '/products/:productId/generate',
  requireRole('OWNER', 'ADMIN', 'MEMBER'),
  asyncHandler(async (req: Request, res: Response) => {
    const { productId } = productIdParamSchema.parse(req.params);
    const input = requestGenerationSchema.parse(req.body);
    const result = await generationService.requestGeneration(
      req.brandId!,
      productId,
      input,
    );
    res.status(202).json({
      ok: true,
      meshyTaskId: result.meshyTaskId,
      attemptNumber: result.attemptNumber,
      status: result.status,
      jobId: result.jobId,
    });
  }),
);

/**
 * GET /v1/products/:productId/generation-status
 * Auth: required.
 * Cheap projection of the product's generation state — safe to poll at 2–5 s
 * intervals from the dashboard.
 */
router.get(
  '/products/:productId/generation-status',
  asyncHandler(async (req: Request, res: Response) => {
    const { productId } = productIdParamSchema.parse(req.params);
    const result = await generationService.getGenerationStatus(
      req.brandId!,
      productId,
    );
    res.json({ ok: true, ...result });
  }),
);

export const generationRoutes: Router = router;
