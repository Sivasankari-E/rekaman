import { z } from 'zod';
import { logger } from './logger.js';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // Deployment-stage marker, independent of NODE_ENV (which stays 'production'
  // for the optimized build on BOTH prod and staging). Set APP_ENV=staging on
  // the Railway staging env so /metrics + telemetry can tell them apart.
  APP_ENV: z.string().optional(),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  SERVICE_NAME: z.string().default('api'),

  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  JWT_EXPIRY: z.string().default('7d'),
  COOKIE_DOMAIN: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),

  SENTRY_DSN: z.string().url().optional(),
  DASHBOARD_URL: z.string().url().default('http://localhost:5173'),

  // ── Generation pipeline (Week 5+) ──
  // Optional at the schema level so CI / dev environments without Meshy / Redis
  // don't fail to boot. Code that USES these checks `if (!env.X) throw …` per
  // the External API Boundaries pattern in CLAUDE.md.
  MESHY_API_KEY: z
    .string()
    .startsWith('msy', 'Meshy API key must start with "msy"')
    .optional(),
  MESHY_API_BASE: z.string().url().default('https://api.meshy.ai'),
  MESHY_WEBHOOK_SECRET: z
    .string()
    .min(32, 'Webhook secret must be ≥32 chars')
    .optional(),

  REDIS_URL: z
    .string()
    .regex(/^rediss?:\/\//, 'REDIS_URL must start with redis:// or rediss://')
    .optional(),

  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('ap-south-1'),
  S3_REGION: z.string().default('ap-south-1'),
  S3_BUCKET_NAME: z.string().optional(), // legacy — prefer AWS_S3_BUCKET_PRODUCTS
  AWS_S3_BUCKET_PRODUCTS: z.string().optional(),

  // Worker tuning knobs — defaulted, override per environment if needed.
  GENERATION_POLL_INTERVAL_MS: z.coerce.number().int().min(1000).max(30000).default(5000),
  GENERATION_MAX_DURATION_MS: z.coerce.number().int().min(60000).max(900000).default(300000),
  GENERATION_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(3),

  // ── Phase 1+ (placeholders, wired later) ──
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().optional(), // e.g. "Rekaman <founder@rekaman.io>"
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;

  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    logger.fatal({ errors: parsed.error.flatten() }, 'Invalid environment configuration');
    process.exit(1);
  }

  cached = parsed.data;
  return cached;
}
