import express, { type Express, type Request } from 'express';
import type { IncomingMessage } from 'http';
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
import { brandsRoutes } from './modules/brands/brands.routes.js';
import { publicArRoutes } from './modules/publicAr/publicAr.routes.js';
import { arSessionsRoutes } from './modules/arSessions/arSessions.routes.js';
import { generationRoutes } from './modules/generation/generation.routes.js';
import { analyticsRoutes } from './modules/analytics/analytics.routes.js';
import { teamRoutes } from './modules/team/team.routes.js';
import { meshyWebhookRoutes } from './modules/webhooks/meshy.webhook.js';
import { razorpayWebhookRoutes } from './modules/webhooks/razorpay.webhook.js';
import { billingRoutes } from './modules/billing/billing.routes.js';
import { prisma } from './shared/db.js';
import { NotFoundError } from './shared/errors.js';

// Inbound webhooks (Meshy, Razorpay) need the *raw* request bytes for HMAC
// signature verification. Capturing via `express.json`'s `verify` hook lets
// us keep a single global JSON parser AND preserve the raw buffer on
// `req.rawBody` for routes that need it. No special middleware ordering
// required.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

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
  // True production stays on the strict whitelist. STAGING (NODE_ENV=production
  // but APP_ENV=staging) ALSO allows localhost, so the dashboard/landing can be
  // developed locally against the staging api. Local dev/tests (NODE_ENV!==prod)
  // reflect any origin.
  const strictOrigins = [
    env.DASHBOARD_URL,
    'https://rekaman.io',
    'https://dashboard.rekaman.io',
  ].filter((o): o is string => Boolean(o));
  const localhostOrigins = ['http://localhost:3000', 'http://localhost:3001'];
  const dashboardCorsOptions: CorsOptions = {
    origin:
      env.NODE_ENV !== 'production'
        ? true
        : env.APP_ENV === 'staging'
          ? [...strictOrigins, ...localhostOrigins]
          : strictOrigins,
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
  app.use(
    express.json({
      limit: '1mb',
      // `verify` runs once per parsed JSON body and gives us the raw bytes
      // before parsing. Webhook handlers (Meshy today, Razorpay later) read
      // `req.rawBody` to compute the HMAC over the exact bytes Meshy signed
      // — re-stringifying req.body would change whitespace/key-order and
      // break the signature.
      verify: (req: IncomingMessage, _res, buf: Buffer) => {
        (req as Request).rawBody = Buffer.from(buf);
      },
    }),
  );
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
        appEnv: env.APP_ENV ?? env.NODE_ENV,
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

  // ── Inbound webhooks (HMAC-signed, no JWT) ──
  // Mounted before apiRateLimit so a slow Meshy retry storm can't get
  // throttled — verification + idempotency log absorb duplicates safely.
  app.use('/v1/webhooks', meshyWebhookRoutes);
  app.use('/v1/webhooks', razorpayWebhookRoutes);

  // ── Authenticated API routes ──
  app.use(apiRateLimit);
  app.use('/v1/auth', authRoutes);
  app.use('/v1/products', productsRoutes);
  app.use('/v1/api-keys', apiKeysRoutes);
  app.use('/v1/brands', brandsRoutes);
  app.use('/v1/analytics', analyticsRoutes);
  app.use('/v1/team', teamRoutes);
  app.use('/v1/billing', billingRoutes);
  // Generation routes share the `/v1/products/:productId/...` prefix with
  // productsRoutes but live in their own module — mount at `/v1` so the
  // router's internal paths (e.g. `/products/:productId/generate`) compose
  // cleanly without coupling the two modules.
  app.use('/v1', generationRoutes);

  // 404 for unmatched routes
  app.use((_req, _res, next) => {
    next(new NotFoundError('Route'));
  });

  // Error handler — MUST be last
  app.use(errorHandler);

  return app;
}
