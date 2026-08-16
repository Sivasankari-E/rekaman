import { Router } from 'express';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { billingService } from './billing.service.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';

const router = Router();
router.use(requireAuth);

const SubscribeSchema = z.object({ planId: z.string().min(1) });
const CancelSchema = z.object({ atPeriodEnd: z.boolean().default(true) });

/** GET /v1/billing/plans — public pricing plans (for the subscribe UI). */
router.get(
  '/plans',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ plans: await billingService.getPlans() });
  }),
);

/** GET /v1/billing/subscription — the caller brand's current subscription + plan. */
router.get(
  '/subscription',
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await billingService.getSubscription(req.brandId!));
  }),
);

/** GET /v1/billing/invoices — payment history. */
router.get(
  '/invoices',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ invoices: await billingService.getInvoices(req.brandId!) });
  }),
);

/** POST /v1/billing/subscribe — start a Razorpay subscription (OWNER/ADMIN). */
router.post(
  '/subscribe',
  requireRole('OWNER', 'ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const { planId } = SubscribeSchema.parse(req.body);
    res.json(await billingService.subscribe(req.brandId!, planId));
  }),
);

/** POST /v1/billing/cancel — cancel (default: at period end) (OWNER/ADMIN). */
router.post(
  '/cancel',
  requireRole('OWNER', 'ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const { atPeriodEnd } = CancelSchema.parse(req.body);
    res.json(await billingService.cancel(req.brandId!, atPeriodEnd));
  }),
);

export const billingRoutes: Router = router;
