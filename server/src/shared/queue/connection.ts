import { Redis } from 'ioredis';
import { getEnv } from '../env.js';
import { logger } from '../logger.js';
import { ExternalServiceError } from '../errors.js';

/**
 * BullMQ + Upstash Redis connection.
 *
 * Constraints from BullMQ + Upstash:
 * - `maxRetriesPerRequest: null` is REQUIRED. BullMQ uses blocking commands
 *   (BLPOP, BRPOPLPUSH) for job pickup; the default IORedis retry-per-request
 *   logic surfaces as ETIMEDOUT after the configured retries and tears down the
 *   worker.
 * - `enableReadyCheck: false` because Upstash's Redis serverless tier does not
 *   support the `INFO` command used by IORedis's ready check on every connect.
 * - Eviction must be DISABLED on the Redis side. BullMQ stores job state in
 *   hashes that must persist; with eviction enabled, an in-flight job's state
 *   can disappear mid-processing. Upstash's "Eviction" toggle was set to
 *   Disabled when we provisioned the DB (Week 5 Day 3).
 *
 * Lazy singleton: we don't open the connection at import time. `getRedis()`
 * builds it on first call. This way the api server (which doesn't strictly
 * need Redis until generation routes are exercised) and worker (which always
 * does) both share the same construction path, and a missing REDIS_URL fails
 * loudly the first time someone reaches for the queue rather than at boot of
 * unrelated services.
 */

let cached: Redis | undefined;

export function getRedis(): Redis {
  if (cached) return cached;

  const env = getEnv();
  if (!env.REDIS_URL) {
    throw new ExternalServiceError(
      'redis',
      'REDIS_URL is not configured — generation queue is unavailable',
    );
  }

  const conn = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    // Reconnect aggressively on transient network errors. After 10 attempts
    // we stop retrying — the process exits and Railway restarts the service,
    // which is preferable to silently degrading.
    retryStrategy: (times) => {
      if (times > 10) {
        logger.error({ times }, 'redis reconnect attempts exhausted');
        return null;
      }
      return Math.min(times * 200, 2000);
    },
  });

  conn.on('error', (err) => {
    // 'error' is emitted on every reconnect attempt while the network is
    // flapping. Log at warn so we don't spam Sentry; the retryStrategy above
    // escalates to fatal (process exit) if the situation is truly unrecoverable.
    logger.warn({ err: err.message }, 'redis connection error');
  });

  conn.on('connect', () => {
    logger.info('redis connected');
  });

  conn.on('reconnecting', () => {
    logger.warn('redis reconnecting');
  });

  cached = conn;
  return conn;
}

/**
 * Build a separate Redis connection for a BullMQ Worker.
 *
 * Workers issue blocking commands (BLPOP, BRPOPLPUSH) to wait for new jobs.
 * Sharing the same connection between a Queue (publisher) and a Worker (blocking
 * consumer) can starve Queue ops while a BLPOP is in flight. BullMQ's official
 * guidance is one connection per Worker.
 *
 * `duplicate()` inherits the `maxRetriesPerRequest: null` + retryStrategy from
 * the primary connection — required by BullMQ.
 */
export function getWorkerRedis(): Redis {
  return getRedis().duplicate();
}

/**
 * Gracefully close the Redis connection. Safe to call multiple times.
 * Server / worker entry points invoke this from their SIGTERM handlers
 * after `server.close()` / worker `close()` finishes draining.
 */
export async function disconnectRedis(): Promise<void> {
  if (!cached) return;
  try {
    await cached.quit();
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'redis disconnect error');
  } finally {
    cached = undefined;
  }
}
