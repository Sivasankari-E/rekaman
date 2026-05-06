/**
 * Recovery utility — re-enqueues a stuck generation job after a worker bug
 * was fixed. Re-runs against the SAME meshyTaskId (already in product
 * metadata), so no fresh Meshy charge.
 *
 * Use case: worker crashed mid-poll OR a code bug rejected the Meshy
 * response. Product is stuck in PROCESSING with metadata.generation.meshyTaskId
 * pointing at a Meshy task that's already SUCCEEDED (or will be).
 *
 * Usage (from server/ directory):
 *   node --env-file=.env scripts/recover-stuck-generation.mjs <productId>
 */

import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';

const productId = process.argv[2];
if (!productId) {
  console.error('usage: node --env-file=.env scripts/recover-stuck-generation.mjs <productId>');
  process.exit(2);
}
if (!process.env.REDIS_URL) {
  console.error('REDIS_URL not loaded — check --env-file=.env');
  process.exit(2);
}

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
const queue = new Queue('generation', { connection: redis });

const product = await prisma.product.findFirst({
  where: { id: productId, deletedAt: null },
  select: { id: true, brandId: true, status: true, metadata: true },
});

if (!product) {
  console.error(`product ${productId} not found`);
  process.exit(1);
}
const meta = (product.metadata ?? {}).generation ?? {};
if (!meta.meshyTaskId) {
  console.error(`product ${productId} has no metadata.generation.meshyTaskId — nothing to recover`);
  process.exit(1);
}
const attempt = meta.attemptNumber ?? 1;

console.error('product:', { id: product.id, status: product.status, brandId: product.brandId });
console.error('meshy:', { taskId: meta.meshyTaskId, attempt });

const jobId = `gen:${productId}:${attempt}`;

// Clear any prior state for this job — failed/completed/stalled all leave
// hashes in Redis that would otherwise reject re-add.
const existing = await queue.getJob(jobId);
if (existing) {
  console.error('removing prior job:', jobId, 'state=', await existing.getState());
  await existing.remove();
}

await queue.add(
  'process-meshy-task',
  {
    productId,
    brandId: product.brandId,
    attemptNumber: attempt,
    photoUrls: [], // worker doesn't reuse — meshyTaskId is in metadata
    config: {
      aiModel: 'meshy-6',
      shouldRemesh: true,
      shouldTexture: true,
      enablePbr: true,
      autoSize: true,
    },
  },
  { jobId },
);

console.error(`✅ re-enqueued ${jobId}`);

await queue.close();
await redis.quit();
await prisma.$disconnect();
