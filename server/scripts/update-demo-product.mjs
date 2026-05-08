/**
 * Week 6 Day 1 — point the demo brand's `oslo-sofa` product at the canonical
 * Meshy armchair GLB (the one generated on May 9 from the Pexels armchair photo).
 *
 * Why we don't move the GLB: the products bucket is public-readable and the
 * key paths are unguessable cuids — pointing one brand's product at a GLB
 * physically stored under another brand's key path is operationally fine.
 * If we ever need a brand-scoped copy, this script can be extended to first
 * `s3 cp` the object and then update the URL.
 *
 * Usage (from server/ directory):
 *   node --env-file=.env scripts/update-demo-product.mjs
 *
 * Idempotent: re-running re-applies the same values (no diff). Safe to commit
 * + leave in CI if we ever automate demo refresh.
 */

import { PrismaClient } from '@prisma/client';

const DEMO_BRAND_SLUG = 'sdk-demo-brand-3722';
const DEMO_PRODUCT_SLUG = 'oslo-sofa';

const ARMCHAIR_GLB_URL =
  'https://rekaman-products-prod-975050270919-ap-south-1-an.s3.ap-south-1.amazonaws.com' +
  '/brands/cmotyhdv20002uig5vxldw4g8/products/cmou3lwe9000337mk8223jby3/v1/model.glb';

// Verified May 9 e2e run: 13,474 KB, 24,867 vertices, ~76 cm tall on the long axis.
const ARMCHAIR_GLB_SIZE_KB = 13_474;

// W × D × H in cm — matches the seller copy on the demo HTML so the AR engine
// scales the Meshy mesh to real-world dimensions consistently.
const DIMENSIONS = { widthCm: 76, depthCm: 78, heightCm: 86 };

const NEW_NAME = 'Oslo Lounge Chair';

const prisma = new PrismaClient();

console.error('▶ update-demo-product.mjs — Week 6 Day 1 demo fix\n');

const brand = await prisma.brand.findUnique({
  where: { slug: DEMO_BRAND_SLUG },
  select: { id: true, slug: true, companyName: true },
});
if (!brand) {
  console.error(`✗ no brand with slug=${DEMO_BRAND_SLUG} — refusing to proceed`);
  await prisma.$disconnect();
  process.exit(1);
}
console.error(`✓ found brand: ${brand.companyName} (id=${brand.id})`);

const product = await prisma.product.findFirst({
  where: { brandId: brand.id, slug: DEMO_PRODUCT_SLUG, deletedAt: null },
  select: {
    id: true,
    name: true,
    glbUrl: true,
    glbSizeKb: true,
    widthCm: true,
    heightCm: true,
    depthCm: true,
    status: true,
  },
});
if (!product) {
  console.error(`✗ no product with slug=${DEMO_PRODUCT_SLUG} on brand ${brand.slug}`);
  await prisma.$disconnect();
  process.exit(1);
}
console.error(`✓ found product: ${product.name} (id=${product.id})`);
console.error(`  current glbUrl:    ${product.glbUrl ?? '(null)'}`);
console.error(`  current dimensions: ${product.widthCm}×${product.depthCm}×${product.heightCm} cm`);
console.error(`  current status:    ${product.status}`);
console.error('');

const updated = await prisma.product.update({
  where: { id: product.id },
  data: {
    name: NEW_NAME,
    glbUrl: ARMCHAIR_GLB_URL,
    glbSizeKb: ARMCHAIR_GLB_SIZE_KB,
    widthCm: DIMENSIONS.widthCm,
    heightCm: DIMENSIONS.heightCm,
    depthCm: DIMENSIONS.depthCm,
    // Keep status READY — placement requires it (publicAr.service.ts).
    // arMode + slug stay untouched; the SDK still queries by `oslo-sofa`.
  },
  select: {
    id: true,
    name: true,
    slug: true,
    glbUrl: true,
    glbSizeKb: true,
    widthCm: true,
    heightCm: true,
    depthCm: true,
    status: true,
  },
});

console.error('✓ UPDATED:');
console.error(`  id:         ${updated.id}`);
console.error(`  name:       ${updated.name}`);
console.error(`  slug:       ${updated.slug}`);
console.error(`  glbUrl:     ${updated.glbUrl}`);
console.error(`  glbSizeKb:  ${updated.glbSizeKb}`);
console.error(`  dimensions: ${updated.widthCm}×${updated.depthCm}×${updated.heightCm} cm`);
console.error(`  status:     ${updated.status}`);
console.error('');
console.error('Verify on prod:');
console.error(
  `  curl -s "https://api.rekaman.io/v1/ar/<demo-api-key>/${DEMO_PRODUCT_SLUG}" | python3 -m json.tool`,
);

await prisma.$disconnect();
