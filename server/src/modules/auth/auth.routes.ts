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

function setAuthCookie(res: Response, token: string) {
  const env = getEnv();
  res.cookie('rk_auth', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/',
  });
}

function clearAuthCookie(res: Response) {
  const env = getEnv();
  res.clearCookie('rk_auth', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/',
  });
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
