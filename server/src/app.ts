import express, { type Express, type Request } from 'express';
import cors, { type CorsOptions, type CorsOptionsDelegate } from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { getEnv } from './shared/env.js';
import { requestContext } from './middleware/requestContext.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiRateLimit } from './middleware/rateLimiter.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { productsRoutes } from './modules/products/products.routes.js';
import { apiKeysRoutes } from './modules/apiKeys/apiKeys.routes.js';
import { publicArRoutes } from './modules/publicAr/publicAr.routes.js';
import { arSessionsRoutes } from './modules/arSessions/arSessions.routes.js';
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

  // CORS is path-aware:
  //   - /v1/ar/* (public SDK endpoint embedded on third-party brand sites): permissive `*`,
  //     no credentials, applied to all responses including 404/500 + OPTIONS preflights.
  //   - everything else: strict whitelist + credentials for the dashboard.
  const dashboardCorsOptions: CorsOptions = {
    origin:
      env.NODE_ENV === 'production'
        ? [env.DASHBOARD_URL, 'https://rekaman.io', 'https://dashboard.rekaman.io']
        : true,
    credentials: true,
  };
  const publicSdkCorsOptions: CorsOptions = {
    origin: '*',
    // GET for /v1/ar/* (product metadata), POST for /v1/events (analytics ingestion)
    methods: ['GET', 'POST', 'OPTIONS'],
    maxAge: 86400,
  };
  // Public SDK paths: /v1/ar/* (product metadata) and /v1/events (analytics ingestion).
  const isPublicSdkPath = (p: string) =>
    p.startsWith('/v1/ar/') || p === '/v1/events' || p.startsWith('/v1/events/');
  const corsDelegate: CorsOptionsDelegate<Request> = (req, callback) => {
    if (isPublicSdkPath(req.path)) {
      callback(null, publicSdkCorsOptions);
    } else {
      callback(null, dashboardCorsOptions);
    }
  };
  app.use(cors(corsDelegate));

  app.use(compression());

  // sendBeacon may post events as Content-Type: text/plain; capture as string,
  // route-level middleware in arSessions parses it to JSON.
  app.use(express.text({ type: 'text/plain', limit: '500kb' }));
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

  // ── Public SDK routes (mounted BEFORE apiRateLimit so the 100/min global doesn't
  // pre-empt these endpoints' own higher limits; SDK is on every shopper page) ──
  app.use('/v1/ar', publicArRoutes);
  app.use('/v1/events', arSessionsRoutes);

  // ── Authenticated API routes ──
  app.use(apiRateLimit);
  app.use('/v1/auth', authRoutes);
  app.use('/v1/products', productsRoutes);
  app.use('/v1/api-keys', apiKeysRoutes);

  // 404 for unmatched routes
  app.use((_req, _res, next) => {
    next(new NotFoundError('Route'));
  });

  // Error handler — MUST be last
  app.use(errorHandler);

  return app;
}
