/**
 * Week 7 Day 1 — point the demo brand's `oslo-sofa` product at the FRESH
 * Meshy run that includes USDZ (verified May 17, product cmp9ssxc9000137sz4cfdch4h).
 *
 * Preserves the public demo URL `rekaman-demo.vercel.app/oslo-sofa.html` (which
 * is referenced in cold emails, CLAUDE.md, LinkedIn assets, etc.) while making
 * iOS shoppers see the new USDZ path. Android continues to get GLB.
 *
 * Why we don't move the S3 objects: products bucket is public-readable and
 * keys are unguessable cuids — pointing one brand's product at GLBs/USDZs
 * physically stored under another brand's key path is operationally fine.
 * Same rationale as update-demo-product.mjs (Week 6 Day 1) which we're
 * superseding here.
 *
 * Usage (from server/ directory, on founder's laptop where Neon is reachable):
 *   node --env-file=.env scripts/update-demo-with-usdz.mjs
 *
 * Idempotent: re-running re-applies the same values (no diff).
 */

import { PrismaClient } from '@prisma/client';

const DEMO_BRAND_SLUG = 'sdk-demo-brand-3722';
const DEMO_PRODUCT_SLUG = 'oslo-sofa';

// Fresh May 17 Meshy run: founder-brand product cmp9ssxc9000137sz4cfdch4h, v1/.
// Both formats verified in S3 — GLB 14,099 KB, USDZ 15,185 KB.
const FOUNDER_BRAND_ID = 'cmotyhdv20002uig5vxldw4g8';
const NEW_PRODUCT_ID = 'cmp9ssxc9000137sz4cfdch4h';
const BUCKET_BASE =
  'https://rekaman-products-prod-975050270919-ap-south-1-an.s3.ap-south-1.amazonaws.com';

const ARMCHAIR_GLB_URL = `${BUCKET_BASE}/brands/${FOUNDER_BRAND_ID}/products/${NEW_PRODUCT_ID}/v1/model.glb`;
const ARMCHAIR_GLB_SIZE_KB = 14_099;
const ARMCHAIR_USDZ_URL = `${BUCKET_BASE}/brands/${FOUNDER_BRAND_ID}/products/${NEW_PRODUCT_ID}/v1/model.usdz`;
const ARMCHAIR_USDZ_SIZE_KB = 14_830; // 15,185,743 bytes ≈ 14,830 KB

const DIMENSIONS = { widthCm: 76, depthCm: 78, heightCm: 86 };
const NEW_NAME = 'Oslo Lounge Chair';

const prisma = new PrismaClient();

console.error('▶ update-demo-with-usdz.mjs — Week 7 Day 1 USDZ wire-up\n');

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
    usdzUrl: true,
    usdzSizeKb: true,
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
console.error(`  current glbUrl:     ${product.glbUrl ?? '(null)'}`);
console.error(`  current usdzUrl:    ${product.usdzUrl ?? '(null)'}`);
console.error(`  current status:     ${product.status}`);
console.error('');

const updated = await prisma.product.update({
  where: { id: product.id },
  data: {
    name: NEW_NAME,
    glbUrl: ARMCHAIR_GLB_URL,
    glbSizeKb: ARMCHAIR_GLB_SIZE_KB,
    usdzUrl: ARMCHAIR_USDZ_URL,
    usdzSizeKb: ARMCHAIR_USDZ_SIZE_KB,
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
    usdzUrl: true,
    usdzSizeKb: true,
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
console.error(`  usdzUrl:    ${updated.usdzUrl}`);
console.error(`  usdzSizeKb: ${updated.usdzSizeKb}`);
console.error(`  dimensions: ${updated.widthCm}×${updated.depthCm}×${updated.heightCm} cm`);
console.error(`  status:     ${updated.status}`);
console.error('');
console.error('Verify on prod:');
console.error(
  `  curl -s "https://api.rekaman.io/v1/ar/rk_live_wW8dUxrRLB1_IOEUZj_5vZNFE95PUTGE/${DEMO_PRODUCT_SLUG}" | python3 -m json.tool`,
);
console.error('Expected: both glbUrl AND usdzUrl populated, status READY.');

await prisma.$disconnect();
