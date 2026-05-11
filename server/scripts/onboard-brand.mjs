#!/usr/bin/env node
// server/scripts/onboard-brand.mjs
//
// Concierge MVP brand provisioning — Week 6+ deliverable.
//
// Reads a YAML config file describing a brand + their products,
// hits prod API endpoints sequentially to:
//   1. create brand + owner user (via /v1/auth/signup)
//   2. mint a live API key (via /v1/api-keys)
//   3. create each product (via /v1/products)
//   4. queue Meshy generation for each (via /v1/products/:id/generate)
//   5. poll /v1/products/:id/generation-status until all READY
//   6. print a ready-to-paste integration snippet email
//
// Designed for the founder to run manually for each new paying customer
// during the Concierge MVP phase (Weeks 6-12). Replaces the Week 7+
// dashboard self-serve flow until the dashboard ships.
//
// Idempotency caveat: signup is NOT idempotent. If you re-run with the same
// owner email, /v1/auth/signup returns 409. Use --resume <brandId> in that
// case (TODO: not yet implemented, scoped for v1.1).
//
// Usage (from server/ directory):
//   pnpm add -D js-yaml          # one-time, adds to server/package.json
//   node --env-file=.env scripts/onboard-brand.mjs ../brand-onboarding/example.yaml
//
// Environment variables read:
//   REKAMAN_API_BASE   default: https://api.rekaman.io
//   POLL_INTERVAL_MS   default: 8000
//   POLL_TIMEOUT_MS    default: 600000 (10 min — covers up to 6 sequential 90s Meshy jobs)
//
// Sample YAML at end of file via --help.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, basename, dirname } from 'node:path';
import { argv, env, exit, stdout } from 'node:process';
import { randomBytes } from 'node:crypto';
import yaml from 'js-yaml';

// ─── Config ───────────────────────────────────────────────────────────

const API_BASE = env.REKAMAN_API_BASE || 'https://api.rekaman.io';
const POLL_INTERVAL_MS = Number(env.POLL_INTERVAL_MS || 8000);
const POLL_TIMEOUT_MS = Number(env.POLL_TIMEOUT_MS || 600_000);

const yamlPath = argv[2];
if (!yamlPath || yamlPath === '--help' || yamlPath === '-h') {
  printHelp();
  exit(yamlPath === '--help' || yamlPath === '-h' ? 0 : 1);
}

// ─── Main ─────────────────────────────────────────────────────────────

const config = parseConfig(yamlPath);
validateConfig(config);

console.log(`▶ Onboarding brand: ${config.brand.companyName}`);
console.log(`  API base: ${API_BASE}`);
console.log(`  Products: ${config.products.length}`);
console.log('');

const startedAt = Date.now();

try {
  const tempPassword = generateTempPassword();
  const { token, brand, user } = await signupBrand(config.brand, tempPassword);
  log(`✓ brand created: ${brand.companyName}  (id=${brand.id}, slug=${brand.slug})`);
  log(`✓ owner user created: ${user.email}  (id=${user.id})`);

  const apiKey = await createApiKey(token, 'Production website');
  log(`✓ API key minted: ${apiKey.prefix}***  (id=${apiKey.id})`);

  const created = [];
  for (const productCfg of config.products) {
    const p = await createProduct(token, productCfg);
    log(`  ✓ product created: ${p.name}  (slug=${p.slug}, id=${p.id})`);
    created.push({ ...p, _photoUrls: productCfg.photoUrls });
  }

  for (const p of created) {
    await queueGeneration(token, p.id, p._photoUrls);
    log(`  ↑ queued generation for: ${p.slug}  (${p._photoUrls.length} photos)`);
  }

  log('');
  log(`⏳ polling generations to READY (${POLL_TIMEOUT_MS / 60000} min timeout)...`);
  const final = await pollAllGenerations(token, created);

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  log('');
  log(`✓ all done in ${elapsed}s`);
  log('');

  // Persist + print summary
  const summary = buildSummary({
    brand,
    user,
    tempPassword,
    apiKey: apiKey.key,         // ← full key, only available on create response
    apiKeyPrefix: apiKey.prefix,
    products: final,
  });
  const out = writeSummary(yamlPath, summary);

  console.log('━'.repeat(72));
  console.log('SEND THIS TO THE BRAND:');
  console.log('━'.repeat(72));
  console.log('');
  console.log(summary.emailBody);
  console.log('━'.repeat(72));
  console.log('');
  console.log(`Summary written to: ${out}`);
  console.log(`Brand owner login: ${user.email} / ${tempPassword}  (tell them to reset!)`);
  console.log('');
} catch (err) {
  console.error('');
  console.error(`✗ onboarding failed: ${err.message}`);
  if (err.requestId) console.error(`  requestId: ${err.requestId}`);
  if (err.body) console.error(`  body: ${JSON.stringify(err.body).slice(0, 500)}`);
  exit(1);
}

// ─── Steps ────────────────────────────────────────────────────────────

async function signupBrand(brandCfg, password) {
  // POST /v1/auth/signup returns flat: { token, user, brand, membership }
  const r = await api('POST', '/v1/auth/signup', null, {
    email: brandCfg.ownerEmail,
    password,
    name: brandCfg.ownerName ?? brandCfg.companyName,
    companyName: brandCfg.companyName,
  });
  return { token: r.token, brand: r.brand, user: r.user };
}

async function createApiKey(token, name) {
  // POST /v1/api-keys returns { key: { id, key, prefix, name, scopes, createdAt } }
  // The full `key` field is included ONLY on this create response — after this,
  // GET /v1/api-keys returns only the prefix. We MUST capture the full key here
  // and pass it to the brand. Note: server-side field is `prefix` (not `keyPrefix`),
  // and `key` (not `fullKey`) — different from earlier drafts of this script.
  const r = await api('POST', '/v1/api-keys', token, { name });
  if (!r?.key?.key) {
    throw new Error('API key response missing key.key field — server contract changed?');
  }
  return r.key;
}

async function createProduct(token, p) {
  // POST /v1/products returns { product: {...} } — unwrap.
  // Server schema accepts: name, slug, arMode, category, widthCm, heightCm, depthCm
  // (arMode + category added in Week 6 Day 2 schema extension for onboarding parity).
  const body = {
    name: p.name,
    slug: p.slug,
    arMode: p.arMode ?? 'placement',
    category: p.category ?? null,
    widthCm: p.widthCm ?? null,
    heightCm: p.heightCm ?? null,
    depthCm: p.depthCm ?? null,
  };
  const r = await api('POST', '/v1/products', token, body);
  if (!r?.product?.id) {
    throw new Error('Product response missing product.id — server contract changed?');
  }
  return r.product;
}

async function queueGeneration(token, productId, photoUrls) {
  return await api('POST', `/v1/products/${productId}/generate`, token, {
    photoUrls,
  });
}

async function getGenerationStatus(token, productId) {
  // GET /v1/products/:id/generation-status returns flat: { ok, productId, status, glbUrl, ... }
  return await api('GET', `/v1/products/${productId}/generation-status`, token);
}

async function pollAllGenerations(token, products) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  const status = new Map(products.map((p) => [p.id, p.status ?? 'PENDING']));
  const glbUrls = new Map();

  while (Date.now() < deadline) {
    const pending = [...status.entries()].filter(([, s]) => s !== 'READY' && s !== 'FAILED');
    if (pending.length === 0) break;

    await Promise.all(
      pending.map(async ([id]) => {
        try {
          const s = await getGenerationStatus(token, id);
          if (s.status !== status.get(id)) {
            status.set(id, s.status);
            if (s.glbUrl) glbUrls.set(id, s.glbUrl);
            const product = products.find((p) => p.id === id);
            log(`  · ${product.slug}: ${s.status}${s.glbUrl ? '  → ' + s.glbUrl.slice(0, 80) + '…' : ''}`);
          }
        } catch (err) {
          log(`  ! ${id}: poll failed — ${err.message}`);
        }
      }),
    );

    if (![...status.values()].every((s) => s === 'READY' || s === 'FAILED')) {
      await sleep(POLL_INTERVAL_MS);
    }
  }

  // Annotate the products with final state
  return products.map((p) => ({
    ...p,
    status: status.get(p.id) ?? 'TIMEOUT',
    glbUrl: glbUrls.get(p.id) ?? null,
  }));
}

// ─── HTTP helper ──────────────────────────────────────────────────────

async function api(method, path, token, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body == null ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let parsed;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { raw: text }; }

  if (!res.ok) {
    const err = new Error(
      `${method} ${path} → ${res.status} ${res.statusText}: ${parsed?.message ?? parsed?.error ?? text.slice(0, 200)}`,
    );
    err.status = res.status;
    err.requestId = res.headers.get('x-request-id');
    err.body = parsed;
    throw err;
  }

  return parsed;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function parseConfig(p) {
  const text = readFileSync(resolve(p), 'utf8');
  const isYaml = /\.ya?ml$/i.test(p);
  return isYaml ? yaml.load(text) : JSON.parse(text);
}

function validateConfig(c) {
  const errors = [];
  if (!c?.brand?.companyName) errors.push('brand.companyName is required');
  if (!c?.brand?.ownerEmail) errors.push('brand.ownerEmail is required');
  if (!Array.isArray(c?.products) || c.products.length === 0) errors.push('products[] must have at least 1 entry');
  if (c?.products?.length > 20) errors.push('products[] capped at 20 per onboarding (split into multiple runs)');

  c?.products?.forEach((p, i) => {
    if (!p.name) errors.push(`products[${i}].name is required`);
    if (!p.slug) errors.push(`products[${i}].slug is required`);
    if (!/^[a-z0-9-]+$/.test(p.slug ?? '')) errors.push(`products[${i}].slug "${p.slug}" must be lowercase letters, numbers, and dashes only`);
    if (!Array.isArray(p.photoUrls) || p.photoUrls.length === 0) errors.push(`products[${i}].photoUrls[] is required (1-5 https URLs)`);
    p.photoUrls?.forEach((u, j) => {
      if (!u.startsWith('https://')) errors.push(`products[${i}].photoUrls[${j}] must be HTTPS`);
    });
    if (p.arMode && !['placement', 'tryon-face', 'tryon-wrist', 'tryon-hand', 'tryon-foot', 'tryon-photo', 'multi-scene', 'audio-preview'].includes(p.arMode)) {
      errors.push(`products[${i}].arMode "${p.arMode}" is not valid`);
    }
  });

  if (errors.length) {
    console.error('Config validation failed:');
    errors.forEach((e) => console.error(`  • ${e}`));
    exit(1);
  }
}

function generateTempPassword() {
  // 16 URL-safe characters, ~96 bits of entropy.
  // We hand this to the brand once; they reset on first login.
  return randomBytes(12).toString('base64url');
}

function buildSummary({ brand, user, tempPassword, apiKey, apiKeyPrefix, products }) {
  const integrationSnippet = renderIntegrationSnippet(apiKey, products);
  const emailBody = renderEmailBody({ brand, user, tempPassword, apiKey, products, integrationSnippet });
  return { brand, user, tempPassword, apiKey, apiKeyPrefix, products, integrationSnippet, emailBody };
}

function renderIntegrationSnippet(apiKey, products) {
  const sample = products[0]?.slug ?? 'your-product-slug';
  return [
    '<!-- 1) Add this ONCE before </body> in your theme/layout -->',
    '<script src="https://cdn.rekaman.io/v1/sdk.js" defer></script>',
    '',
    '<!-- 2) Add this WHERE the AR button should appear, on each product page -->',
    '<!-- Shopify Liquid: -->',
    `<div data-rk-product="{{ product.handle }}" data-rk-key="${apiKey}"></div>`,
    '',
    '<!-- WooCommerce PHP: -->',
    `<div data-rk-product="<?php echo $product->get_slug(); ?>" data-rk-key="${apiKey}"></div>`,
    '',
    '<!-- React/Next.js custom site: -->',
    `<div data-rk-product={product.slug} data-rk-key="${apiKey}" />`,
    '',
    `<!-- Working example: data-rk-product="${sample}" -->`,
  ].join('\n');
}

function renderEmailBody({ brand, user, tempPassword, apiKey, products, integrationSnippet }) {
  const ready = products.filter((p) => p.status === 'READY');
  const failed = products.filter((p) => p.status === 'FAILED' || p.status === 'TIMEOUT');

  return `Subject: Your AR is ready — 2-line install for ${brand.companyName}

Hi ${user.name?.split(' ')[0] ?? 'there'},

Welcome to Rekaman! Your account is set up and ${ready.length} of ${products.length} products
are AR-ready right now. Add these 2 lines to your store and your shoppers
will see "View in your room" working on every product page.

INTEGRATION (paste these into your theme):

${integrationSnippet}

PRODUCTS READY (${ready.length}):
${ready.map((p) => `  • ${p.name} (slug: ${p.slug})`).join('\n') || '  (none yet)'}
${failed.length ? `\nPRODUCTS NEEDING REVIEW (${failed.length}):\n${failed.map((p) => `  • ${p.name} (slug: ${p.slug}) — status: ${p.status}`).join('\n')}\n(I'll regenerate these and email you when ready.)` : ''}

YOUR LOGIN (please reset password on first login):
  Dashboard: https://dashboard.rekaman.io   (going live week of May 19)
  Email:     ${user.email}
  Password:  ${tempPassword}
  Brand:     ${brand.slug}

API KEY (treat like a password — anyone with this can use your AR sessions):
  ${apiKey}

Want me to install it for you on a Zoom call? Reply with a 30-min slot
and I'll do it live — usually takes 20 minutes end to end.

— Sivasankari, Founder
   founder@rekaman.io · WhatsApp +91 8248 524449
`;
}

function writeSummary(yamlPath, summary) {
  const dir = resolve(dirname(yamlPath), 'completed');
  mkdirSync(dir, { recursive: true });
  const outPath = resolve(dir, basename(yamlPath).replace(/\.(ya?ml|json)$/, '.completed.json'));
  writeFileSync(outPath, JSON.stringify(summary, null, 2));
  return outPath;
}

function log(line) {
  stdout.write(line + '\n');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function printHelp() {
  console.log(`
onboard-brand.mjs — Concierge MVP brand provisioning

USAGE:
  node --env-file=.env scripts/onboard-brand.mjs <path-to-config>

  Config can be YAML (.yaml, .yml) or JSON (.json).

ENV:
  REKAMAN_API_BASE    default: https://api.rekaman.io
  POLL_INTERVAL_MS    default: 8000
  POLL_TIMEOUT_MS     default: 600000

EXAMPLE YAML:
  brand:
    companyName: "Woodcraft Chennai"
    ownerName: "Pradeep Krishnan"
    ownerEmail: "owner@woodcraftchennai.com"
    website: "woodcraftchennai.com"
    plan: "starter"
  products:
    - name: "Royal Sheesham Coffee Table"
      slug: "royal-sheesham-coffee-table"
      arMode: "placement"
      category: "furniture"
      widthCm: 120
      heightCm: 45
      depthCm: 60
      photoUrls:
        - "https://woodcraftchennai.com/cdn/sheesham-table-front.jpg"
        - "https://woodcraftchennai.com/cdn/sheesham-table-side.jpg"

OUTPUT:
  Writes <config>.completed.json next to your config (in completed/ subdir)
  containing: brandId, userId, apiKey, all product IDs and statuses, and
  the email body to send the customer.
`);
}
