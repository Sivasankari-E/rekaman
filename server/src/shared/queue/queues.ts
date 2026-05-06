import { Queue } from 'bullmq';
import { getRedis } from './connection.js';

/**
 * Generation queue: photos → Meshy task → poll → S3 upload → product READY.
 *
 * Job ID convention: `gen:{productId}:{attempt}` (set by the service when
 * enqueueing). Same ID never enqueues twice — natural BullMQ dedup. Retries
 * use a fresh attempt number so they get a distinct ID.
 *
 * Default job options:
 * - `removeOnComplete: 1000` — keep N most recent successful jobs for
 *   debugging, then auto-prune. Without this, Redis fills with old hashes.
 * - `removeOnFail: 5000` — keep more failures around for post-mortem.
 * - `attempts: 1` — we deliberately do NOT use BullMQ's built-in retry.
 *   Generation jobs spend Meshy credits; a blind retry can double-charge.
 *   Retry decisions live in `generation.service.ts retryGeneration` (Day 5+),
 *   which inspects the failure mode and only retries transient errors.
 */

export type GenerationConfigSnapshot = {
  aiModel: 'meshy-6' | 'latest';
  shouldRemesh: boolean;
  shouldTexture: boolean;
  enablePbr: boolean;
  targetPolycount?: number;
  autoSize: boolean;
};

export type GenerationJobData = {
  productId: string;
  brandId: string;
  attemptNumber: number;
  photoUrls: string[];
  config: GenerationConfigSnapshot;
};

let cached: Queue<GenerationJobData> | undefined;

export function getGenerationQueue(): Queue<GenerationJobData> {
  if (cached) return cached;
  cached = new Queue<GenerationJobData>('generation', {
    connection: getRedis(),
    defaultJobOptions: {
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
      attempts: 1,
    },
  });
  return cached;
}

export async function closeGenerationQueue(): Promise<void> {
  if (!cached) return;
  await cached.close();
  cached = undefined;
}

export const GENERATION_QUEUE_NAME = 'generation' as const;
export const GENERATION_JOB_NAME = 'process-meshy-task' as const;
