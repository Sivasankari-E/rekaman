import { Router } from 'express';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { teamService } from './team.service.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';

const router = Router();
router.use(requireAuth);

const InviteSchema = z.object({
  email: z.string().email().max(255),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});
const AcceptSchema = z.object({ token: z.string().min(10).max(255) });
const RoleSchema = z.object({ role: z.enum(['OWNER', 'ADMIN', 'MEMBER']) });

/** GET /v1/team — members + pending invites (any member of the brand). */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const team = await teamService.getTeam(req.brandId!, req.auth!.userId);
    res.json(team);
  }),
);

/** POST /v1/team/invite — create/refresh a link invite (OWNER or ADMIN). */
router.post(
  '/invite',
  requireRole('OWNER', 'ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, role } = InviteSchema.parse(req.body);
    const invitation = await teamService.invite(
      req.brandId!,
      req.auth!.role,
      req.auth!.userId,
      email,
      role,
    );
    res.status(201).json({ invitation });
  }),
);

/**
 * POST /v1/team/accept — the invited user (logged in, email must match the
 * invite) joins the brand. Any authenticated user can call it; the token +
 * email-match are the authorization.
 */
router.post(
  '/accept',
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = AcceptSchema.parse(req.body);
    const result = await teamService.accept(token, req.auth!.userId, req.auth!.email);
    res.json(result);
  }),
);

/** PATCH /v1/team/:userId/role — change a member's role (OWNER only). */
router.patch(
  '/:userId/role',
  requireRole('OWNER'),
  asyncHandler(async (req: Request, res: Response) => {
    const { role } = RoleSchema.parse(req.body);
    await teamService.updateRole(req.brandId!, req.auth!.userId, String(req.params.userId), role);
    res.json({ ok: true });
  }),
);

/** DELETE /v1/team/invitations/:id — revoke a pending invite (OWNER or ADMIN). */
router.delete(
  '/invitations/:id',
  requireRole('OWNER', 'ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    await teamService.revokeInvite(req.brandId!, String(req.params.id));
    res.json({ ok: true });
  }),
);

/** DELETE /v1/team/:userId — remove a member (OWNER or ADMIN, per hierarchy). */
router.delete(
  '/:userId',
  requireRole('OWNER', 'ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    await teamService.removeMember(req.brandId!, req.auth!.role, req.auth!.userId, String(req.params.userId));
    res.json({ ok: true });
  }),
);

export const teamRoutes: Router = router;
