import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getEnv } from '../env.js';
import { logger } from '../logger.js';
import { ExternalServiceError } from '../errors.js';

/**
 * S3 client for the **products** bucket (Meshy GLB destination + product photos).
 *
 * Identity: uses the `rekaman-server` IAM user keys (AWS_ACCESS_KEY_ID /
 * AWS_SECRET_ACCESS_KEY) — scoped via `rekaman-server-policy` to ONLY this
 * bucket. The laptop's `rekaman-deploy-cli` user CANNOT reach this bucket
 * (verified by negative smoke test on Week 5 Day 3).
 *
 * Lazy singleton: the SDK client itself is constructed on first use so the
 * api server can boot in environments without AWS credentials (CI, local dev
 * without Meshy). Code reaching for s3 functions throws ExternalServiceError
 * at call time if creds are missing.
 */

let cached: S3Client | undefined;

function getClient(): { s3: S3Client; bucket: string; region: string } {
  const env = getEnv();
  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
    throw new ExternalServiceError(
      's3',
      'AWS credentials are not configured',
    );
  }
  if (!env.AWS_S3_BUCKET_PRODUCTS) {
    throw new ExternalServiceError(
      's3',
      'AWS_S3_BUCKET_PRODUCTS is not configured',
    );
  }
  if (!cached) {
    cached = new S3Client({
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return { s3: cached, bucket: env.AWS_S3_BUCKET_PRODUCTS, region: env.S3_REGION };
}

/**
 * Multi-tenant-safe S3 key conventions for the products bucket.
 * EVERY key starts with `brands/{brandId}/` — keeps blast radius tenant-scoped
 * if a key is ever leaked into logs / URLs / share links.
 */
export const s3Keys = {
  productGlb: (brandId: string, productId: string, version: number) =>
    `brands/${brandId}/products/${productId}/v${version}/model.glb`,
  productThumbnail: (brandId: string, productId: string, version: number) =>
    `brands/${brandId}/products/${productId}/v${version}/thumbnail.png`,
  productPhoto: (brandId: string, productId: string, photoUuid: string, ext: string) =>
    `brands/${brandId}/products/${productId}/photos/${photoUuid}.${ext}`,
  tempDownload: (jobId: string, filename: string) =>
    `temp/${jobId}/${filename}`,
};

/**
 * Build the public URL for a key in the products bucket.
 *
 * Phase 1: direct virtual-hosted-style S3 URL (CORS enabled on bucket).
 * Phase 2: switch to CloudFront (`products.rekaman.io/...`) with OAC.
 * Versioned keys mean we can change the URL pattern without invalidating
 * anything — old products keep their current URLs in DB.
 */
export function publicProductUrl(key: string): string {
  const env = getEnv();
  const bucket = env.AWS_S3_BUCKET_PRODUCTS;
  if (!bucket) {
    throw new ExternalServiceError('s3', 'AWS_S3_BUCKET_PRODUCTS is not configured');
  }
  return `https://${bucket}.s3.${env.S3_REGION}.amazonaws.com/${key}`;
}

/**
 * Upload a buffer to the products bucket.
 * Default Cache-Control assumes the key is versioned (immutable); pass an
 * explicit value for non-versioned keys (e.g. `temp/...`).
 */
export async function uploadToProductsBucket(
  key: string,
  body: Buffer,
  contentType: string,
  cacheControl?: string,
): Promise<void> {
  const { s3, bucket } = getClient();
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: cacheControl ?? 'public, max-age=31536000, immutable',
      }),
    );
    logger.info({ key, sizeKb: Math.round(body.length / 1024) }, 's3 upload ok');
  } catch (err) {
    const msg = (err as Error).message;
    logger.warn({ key, err: msg }, 's3 upload failed');
    throw new ExternalServiceError('s3', `Upload failed: ${msg}`);
  }
}

/**
 * Best-effort delete. Used for `temp/` cleanup when the lifecycle rule is too
 * slow. Errors are logged but not thrown — callers should not abort their
 * primary flow because a cleanup couldn't proceed.
 */
export async function deleteFromProductsBucket(key: string): Promise<void> {
  const { s3, bucket } = getClient();
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (err) {
    logger.warn({ key, err: (err as Error).message }, 's3 delete failed');
  }
}

/**
 * Existence check — returns true/false; throws only on non-404 errors.
 * Used by the worker to short-circuit re-uploads on idempotent retries.
 */
export async function objectExistsInProductsBucket(key: string): Promise<boolean> {
  const { s3, bucket } = getClient();
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (err) {
    const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (e.$metadata?.httpStatusCode === 404 || e.name === 'NotFound') {
      return false;
    }
    throw new ExternalServiceError('s3', `HEAD failed: ${(err as Error).message}`);
  }
}
