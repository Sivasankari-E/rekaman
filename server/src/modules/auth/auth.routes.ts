import { Router } from 'express';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { authService } from './auth.service.js';
import { requireAuth } from '../../middleware/auth.js';
import { authRateLimit } from '../../middleware/rateLimiter.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { getEnv } from '../../shared/env.js';
import type { AuthResponse } from './auth.types.js';

const router = Router();

const SignupSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(72),
  companyName: z.string().min(2).max(100),
  name: z.string().min(1).max(100).optional(),
});

const LoginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(72),
});

const GoogleSchema = z.object({
  idToken: z.string().min(10).max(2048),
});

/**
 * Cookie attributes shared by set + clear (they MUST match — path/domain/
 * sameSite/secure are part of a cookie's identity, so clearCookie only removes
 * it when they line up).
 *
 * SameSite:
 *  - Production: dashboard.rekaman.io ↔ api.rekaman.io are same-site (same
 *    registrable domain rekaman.io), so `lax` sends the cookie on the
 *    dashboard's credentialed fetches AND resists CSRF from third-party sites.
 *  - Staging: the dashboard is developed on http://localhost against the
 *    staging api (*.up.railway.app) — that's cross-site, where `lax` won't
 *    send the cookie. `none` is required, and it's only valid with Secure,
 *    which holds because staging runs NODE_ENV=production.
 *  - Local http api: `lax` (Secure is off, so `none` would be rejected).
 */
function cookieBaseOptions() {
  const env = getEnv();
  const secure = env.NODE_ENV === 'production';
  const sameSite: 'lax' | 'none' = secure && env.APP_ENV === 'staging' ? 'none' : 'lax';
  return {
    httpOnly: true as const,
    secure,
    sameSite,
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/',
  };
}

function setAuthCookie(res: Response, token: string) {
  res.cookie('rk_auth', token, { ...cookieBaseOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 });
}

function clearAuthCookie(res: Response) {
  res.clearCookie('rk_auth', cookieBaseOptions());
}

router.post(
  '/signup',
  authRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const input = SignupSchema.parse(req.body);
    const result: AuthResponse = await authService.signup(input);
    setAuthCookie(res, result.token);
    res.status(201).json(result);
  })
);

router.post(
  '/login',
  authRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const input = LoginSchema.parse(req.body);
    const result: AuthResponse = await authService.login(input);
    setAuthCookie(res, result.token);
    res.json(result);
  })
);

router.post(
  '/google',
  authRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const input = GoogleSchema.parse(req.body);
    const result: AuthResponse = await authService.loginWithGoogle(input.idToken);
    setAuthCookie(res, result.token);
    res.json(result);
  })
);

router.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const me = await authService.getMe(req.auth!.userId);
    res.json({
      ...me,
      activeBrandId: req.auth!.brandId,
      activeRole: req.auth!.role,
    });
  })
);

export const authRoutes: Router = router;
