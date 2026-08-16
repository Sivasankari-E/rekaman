import { Router } from 'express';
import type { Request, Response } from 'express';
import { billingService } from './billing.service.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';

/*
 * Public (no-auth) billing reads. Pricing plans aren't secret — the marketing
 * site (rekaman.io) fetches them so its pricing always matches the DB. Mounted
 * at /v1/billing BEFORE the authed billing router, so GET /v1/billing/plans is
 * public while every other /v1/billing/* route still requires auth.
 */
const router = Router();

router.get(
  '/plans',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ plans: await billingService.getPlans() });
  }),
);

export const publicBillingRoutes: Router = router;
