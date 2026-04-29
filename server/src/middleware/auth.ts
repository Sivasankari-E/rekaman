import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getEnv } from '../shared/env.js';
import {
  AuthenticationRequiredError,
  InvalidTokenError,
  InsufficientRoleError,
} from '../shared/errors.js';

export interface AuthContext {
  userId: string;
  brandId: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  isSuperAdmin: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
      brandId?: string;
    }
  }
}

function extractToken(req: Request): string | null {
  const cookieToken = req.cookies?.rk_auth;
  if (typeof cookieToken === 'string' && cookieToken.length > 0) {
    return cookieToken;
  }

  const header = req.headers.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice(7);
  }

  return null;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return next(new AuthenticationRequiredError());
  }

  try {
    const env = getEnv();
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthContext;
    req.auth = payload;
    req.brandId = payload.brandId;

    if (req.log) {
      req.log = req.log.child({
        userId: payload.userId,
        brandId: payload.brandId,
      });
    }

    next();
  } catch {
    next(new InvalidTokenError());
  }
}

export function requireRole(...allowed: AuthContext['role'][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(new AuthenticationRequiredError());
    }
    if (req.auth.isSuperAdmin) return next();
    if (!allowed.includes(req.auth.role)) {
      return next(
        new InsufficientRoleError(
          `Role ${req.auth.role} not in allowed: ${allowed.join(', ')}`
        )
      );
    }
    next();
  };
}
