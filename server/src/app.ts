import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { getEnv } from './shared/env.js';
import { requestContext } from './middleware/requestContext.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiRateLimit } from './middleware/rateLimiter.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { productsRoutes } from './modules/products/products.routes.js';
import { prisma } from './shared/db.js';
import { NotFoundError } from './shared/errors.js';

export function createApp(): Express {
  const env = getEnv();
  const app = express();

  // Trust the proxy (Railway sits behind a reverse proxy)
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );

  app.use(
    cors({
      origin:
        env.NODE_ENV === 'production'
          ? [env.DASHBOARD_URL, 'https://rekaman.io', 'https://dashboard.rekaman.io']
          : true,
      credentials: true,
    })
  );

  app.use(compression());

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  app.use(requestContext);

  // ── Public routes ──
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/metrics', async (_req, res, next) => {
    try {
      const dbUp = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);
      res.json({
        status: 'ok',
        uptimeSeconds: Math.floor(process.uptime()),
        db: dbUp ? 'up' : 'down',
        nodeVersion: process.version,
        env: env.NODE_ENV,
        service: env.SERVICE_NAME,
      });
    } catch (err) {
      next(err);
    }
  });

  // ── Authenticated API routes ──
  app.use(apiRateLimit);
  app.use('/v1/auth', authRoutes);
  app.use('/v1/products', productsRoutes);

  // 404 for unmatched routes
  app.use((_req, _res, next) => {
    next(new NotFoundError('Route'));
  });

  // Error handler — MUST be last
  app.use(errorHandler);

  return app;
}
