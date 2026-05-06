/**
 * Generate a presigned S3 URL for a product GLB. Used during pipeline
 * validation BEFORE the products bucket has a public-read policy in place.
 *
 * Usage (from server/):
 *   node --env-file=.env scripts/presign-glb.mjs <s3-key>
 *
 * Example:
 *   node --env-file=.env scripts/presign-glb.mjs \
 *     brands/cmotyhdv20002uig5vxldw4g8/products/cmotyi48u0006uig5s1bhy1p7/v1/model.glb
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const key = process.argv[2];
if (!key) {
  console.error('usage: node --env-file=.env scripts/presign-glb.mjs <s3-key>');
  process.exit(2);
}

const bucket = process.env.AWS_S3_BUCKET_PRODUCTS;
const region = process.env.S3_REGION ?? 'ap-south-1';
if (!bucket) { console.error('AWS_S3_BUCKET_PRODUCTS not loaded'); process.exit(2); }
if (!process.env.AWS_ACCESS_KEY_ID) { console.error('AWS creds not loaded'); process.exit(2); }

const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const url = await getSignedUrl(
  s3,
  new GetObjectCommand({ Bucket: bucket, Key: key }),
  { expiresIn: 3600 }, // 1 hour
);

console.log(url);
