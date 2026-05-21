import { Router } from 'express';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { brandsService } from './brands.service.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';

const router = Router();
router.use(requireAuth);

// 6-digit hex, e.g. #5A4FCF. We don't accept 3-digit shorthand or named
// colours — keeps the SDK's contrast math simple and the stored value
// canonical.
const HexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'must be a 6-digit hex colour like #5A4FCF');

// PATCH semantics: every field optional (only provided fields change) AND
// nullable (explicit null clears the field back to the Rekaman default).
const UpdateThemeSchema = z
  .object({
    primaryColor: HexColor.nullable().optional(),
    textColor: HexColor.nullable().optional(),
    buttonStyle: z.enum(['pill', 'rounded', 'square']).nullable().optional(),
    buttonLabel: z.string().min(1).max(40).nullable().optional(),
  })
  // Reject an empty body — a PATCH with nothing to change is a client bug.
  .refine((o) => Object.keys(o).length > 0, {
    message: 'Provide at least one theme field to update',
  });

/**
 * PATCH /v1/brands/me — update the caller's brand AR-button theme.
 *
 * Auth: brand JWT, role OWNER or ADMIN (theme is brand identity, not a
 * MEMBER-level setting). brandId is taken from the JWT — a caller can only
 * ever patch their own brand.
 *
 * Used today by `scripts/onboard-brand.mjs` during Concierge onboarding;
 * the Week 8 dashboard's "Branding" page will call the same endpoint.
 */
router.patch(
  '/me',
  requireRole('OWNER', 'ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const input = UpdateThemeSchema.parse(req.body);
    const brand = await brandsService.updateTheme(req.brandId!, input);
    res.json({ brand });
  }),
);

export const brandsRoutes: Router = router;
