#!/usr/bin/env node
/**
 * seed-demo-catalog.mjs — provision the 6-category Rekaman demo catalogue.
 *
 * Item 4 of the Coimbatore-readiness sprint. Creates 6 demo products on the
 * FOUNDER brand (one brand, one API key — avoids the 5/hr signup rate limit
 * that 6 separate brand-signups would hit), generates each 3D model via
 * Meshy, then wires the API key + hero photo into the 6 demo HTML pages.
 *
 * The founder runs this ONCE. ~6 × 30 = ~180 Meshy credits (~₹300-500).
 *
 * ── BEFORE RUNNING ──────────────────────────────────────────────────────
 * All 6 photoUrls in CATALOG below are pre-filled with verified, clean,
 * watermark-free Pexels images (May 2026). Swap any if you prefer a
 * different product look — just keep them public HTTPS, single product,
 * plain background. Then get an auth token for the founder brand:
 *      cd server
 *      TOKEN=$(node --env-file=.env scripts/mint-jwt.mjs founder@rekaman.io 2>/dev/null)
 *    (If mint-jwt's JWT_SECRET has drifted from Railway's, use /v1/auth/login
 *     instead — see scripts/mint-jwt.mjs header.)
 *
 * ── RUN ─────────────────────────────────────────────────────────────────
 *      AUTH_TOKEN=$TOKEN node --env-file=.env scripts/seed-demo-catalog.mjs
 *
 * ── AFTER ───────────────────────────────────────────────────────────────
 * The script edits the 6 HTML files in apps/demo/public/. Review, then:
 *      git add apps/demo/public && git commit -m "..." && git push
 * Vercel auto-deploys. The catalogue is live at demo.rekaman.io.
 *
 * Re-runnable: products that already exist are reused; products already
 * READY are not re-generated (no wasted credits). The HTML rewrite uses
 * regex on the attributes, so re-running with a fresh key still works.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env, exit } from 'node:process';

const API_BASE = env.REKAMAN_API_BASE || 'https://api.rekaman.io';
const TOKEN = env.AUTH_TOKEN;
const POLL_INTERVAL_MS = Number(env.POLL_INTERVAL_MS || 10000);
const POLL_TIMEOUT_MS = Number(env.POLL_TIMEOUT_MS || 900_000); // 15 min for 6

const PUBLIC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../apps/demo/public');

// ── CATALOG ───────────────────────────────────────────────────────────────
// Dimensions in cm (W × H × D) — drive real-world AR scale. Fill photoUrl
// for the 5 empty entries before running (1-4 HTTPS URLs each; 1 is fine).
const CATALOG = [
  {
    name: 'Oslo Lounge Chair', slug: 'cat-furniture-armchair', category: 'furniture',
    widthCm: 76, heightCm: 86, depthCm: 78,
    htmlFile: 'furniture-armchair.html',
    photoUrls: ['https://images.pexels.com/photos/447592/pexels-photo-447592.jpeg?auto=compress&cs=tinysrgb&w=1200'],
  },
  {
    name: 'Halo Pendant Lamp', slug: 'cat-decor-lamp', category: 'decor',
    widthCm: 30, heightCm: 38, depthCm: 30,
    htmlFile: 'decor-pendant-lamp.html',
    photoUrls: ['https://images.pexels.com/photos/5812176/pexels-photo-5812176.jpeg?auto=compress&cs=tinysrgb&w=1400'],
  },
  {
    name: 'Classic Aviator', slug: 'cat-eyewear-aviator', category: 'eyewear',
    widthCm: 14, heightCm: 5, depthCm: 14,
    htmlFile: 'eyewear-aviator.html',
    photoUrls: ['https://images.pexels.com/photos/2659705/pexels-photo-2659705.jpeg?auto=compress&cs=tinysrgb&w=1400'],
  },
  {
    name: 'Solitaire Statement Ring', slug: 'cat-jewelry-ring', category: 'jewelry',
    widthCm: 2.2, heightCm: 2.5, depthCm: 2.2,
    htmlFile: 'jewelry-ring.html',
    photoUrls: ['https://images.pexels.com/photos/32988587/pexels-photo-32988587.jpeg?auto=compress&cs=tinysrgb&w=1400'],
  },
  {
    name: 'Meridian Chronograph', slug: 'cat-watch-chrono', category: 'watches',
    widthCm: 4.2, heightCm: 1.1, depthCm: 4.6,
    htmlFile: 'watches-chronograph.html',
    photoUrls: ['https://images.pexels.com/photos/190819/pexels-photo-190819.jpeg?auto=compress&cs=tinysrgb&w=1400'],
  },
  {
    // Footwear photo swapped from the founder-supplied iStock URL (watermarked
    // comp image — the watermark would bake into the 3D texture) to a clean
    // watermark-free Pexels shot of sneakers on a white background.
    name: 'Studio Court Sneaker', slug: 'cat-footwear-sneaker', category: 'footwear',
    widthCm: 10, heightCm: 11, depthCm: 29,
    htmlFile: 'footwear-sneaker.html',
    photoUrls: ['https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=1400'],
  },
];

// ── Preflight ─────────────────────────────────────────────────────────────
if (!TOKEN) {
  console.error('AUTH_TOKEN env var is required. See the header of this file.');
  exit(2);
}
const missing = CATALOG.filter((c) => !c.photoUrls.length || !c.photoUrls.every((u) => u.startsWith('https://')));
if (missing.length) {
  console.error('These catalogue items need photoUrls filled (1-4 HTTPS URLs each):');
  missing.forEach((c) => console.error(`  • ${c.slug} (${c.name})`));
  console.error('\nEdit the CATALOG array at the top of this file, then re-run.');
  exit(1);
}

// ── HTTP helper ───────────────────────────────────────────────────────────
async function api(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { raw: text }; }
  return { ok: res.ok, status: res.status, body: parsed };
}

function log(msg) { console.error(msg); }

// ── Steps ─────────────────────────────────────────────────────────────────

async function ensureProduct(item) {
  // Try to create; if the slug already exists (re-run), find + reuse it.
  const create = await api('POST', '/v1/products', {
    name: item.name,
    slug: item.slug,
    arMode: 'placement',
    category: item.category,
    widthCm: item.widthCm,
    heightCm: item.heightCm,
    depthCm: item.depthCm,
  });
  if (create.ok && create.body?.product?.id) return create.body.product;

  if (create.status === 409) {
    const list = await api('GET', '/v1/products');
    const existing = (list.body?.products ?? []).find((p) => p.slug === item.slug);
    if (existing) return existing;
  }
  throw new Error(`create product ${item.slug} failed: ${create.status} ${JSON.stringify(create.body)}`);
}

async function ensureGenerating(item, productId) {
  // Skip if already READY (re-run — don't waste credits).
  const status = await api('GET', `/v1/products/${productId}/generation-status`);
  if (status.body?.status === 'READY') {
    log(`  • ${item.slug}: already READY — skipping generation`);
    return 'READY';
  }
  if (status.body?.status === 'PROCESSING') {
    log(`  • ${item.slug}: already PROCESSING — will poll`);
    return 'PROCESSING';
  }
  const gen = await api('POST', `/v1/products/${productId}/generate`, { photoUrls: item.photoUrls });
  if (gen.ok) {
    log(`  ↑ ${item.slug}: generation queued (${item.photoUrls.length} photo${item.photoUrls.length > 1 ? 's' : ''}, ${gen.body?.meshyTaskId ?? '?'})`);
    return 'PROCESSING';
  }
  // 409 can mean "already has a GLB" or a race — treat as already-handled.
  if (gen.status === 409) { log(`  • ${item.slug}: generation already in progress / done`); return 'PROCESSING'; }
  throw new Error(`generate ${item.slug} failed: ${gen.status} ${JSON.stringify(gen.body)}`);
}

async function pollAll(products) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  const status = new Map(products.map((p) => [p.id, 'PENDING']));
  while (Date.now() < deadline) {
    const pending = [...status.entries()].filter(([, s]) => s !== 'READY' && s !== 'FAILED');
    if (!pending.length) break;
    await Promise.all(pending.map(async ([id]) => {
      const r = await api('GET', `/v1/products/${id}/generation-status`);
      const s = r.body?.status;
      if (s && s !== status.get(id)) {
        status.set(id, s);
        const item = products.find((p) => p.id === id);
        log(`  → ${item.slug}: ${s}`);
      }
    }));
    if ([...status.values()].every((s) => s === 'READY' || s === 'FAILED')) break;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  return status;
}

async function createApiKey() {
  const r = await api('POST', '/v1/api-keys', { name: 'Demo catalogue' });
  if (!r.ok || !r.body?.key?.key) {
    throw new Error(`create API key failed: ${r.status} ${JSON.stringify(r.body)}`);
  }
  return r.body.key.key;
}

function wireHtml(item, apiKey) {
  const path = resolve(PUBLIC_DIR, item.htmlFile);
  let html = readFileSync(path, 'utf8');
  // Regex-replace so a re-run with a fresh key/photo still works (matches
  // either the placeholder or a previously-written value).
  html = html.replace(/data-rk-key="[^"]*"/, `data-rk-key="${apiKey}"`);
  html = html.replace(
    /(<div class="hero"><img src=")[^"]*(")/,
    `$1${item.photoUrls[0]}$2`,
  );
  writeFileSync(path, html);
}

// ── Main ──────────────────────────────────────────────────────────────────
console.error(`▶ Seeding demo catalogue — ${CATALOG.length} products on the founder brand`);
console.error(`  API base: ${API_BASE}\n`);

try {
  const products = [];
  for (const item of CATALOG) {
    const product = await ensureProduct(item);
    log(`✓ product: ${item.slug}  (id=${product.id})`);
    products.push({ ...item, id: product.id });
  }

  log('');
  for (const p of products) await ensureGenerating(p, p.id);

  log('\n⏳ polling all generations to READY...');
  const finalStatus = await pollAll(products);

  const apiKey = await createApiKey();
  log(`\n✓ API key minted for the demo catalogue: ${apiKey.slice(0, 16)}…`);

  for (const p of products) wireHtml(p, apiKey);
  log(`✓ wired API key + hero photos into ${products.length} HTML files`);

  const ready = products.filter((p) => finalStatus.get(p.id) === 'READY');
  const notReady = products.filter((p) => finalStatus.get(p.id) !== 'READY');

  console.log('\n──────────────── SUMMARY ────────────────');
  console.log(`READY:     ${ready.map((p) => p.slug).join(', ') || '(none)'}`);
  if (notReady.length) {
    console.log(`NOT READY: ${notReady.map((p) => `${p.slug} (${finalStatus.get(p.id)})`).join(', ')}`);
    console.log('  → re-run this script to retry the not-ready ones, or check Meshy.');
  }
  console.log('\nNext: review the 6 edited HTML files, then:');
  console.log('  git add apps/demo/public && git commit -m "shiva | feat(demo): multi-category catalog" && git push');
  console.log('Vercel auto-deploys → demo.rekaman.io');
} catch (err) {
  console.error(`\n✗ ${err.message}`);
  exit(1);
}
