# Rekaman — Spatial Commerce AR Platform
## Project Context for Claude (v5.14)

> **Single source of truth.** This file is loaded into every Claude conversation about Rekaman. Update at the end of each sprint and after every major strategic shift. Companion document: `REKAMAN_ROADMAP.md` (long-horizon vision).

---

## 🧠 Founder Context

Solo software engineer based in **Thanjavur, Tamil Nadu, India** (native place; building Rekaman from home here). Full-time **remote** at a Chennai-based CRM product company (ML + full-stack) — works from Thanjavur. Building Rekaman on the side — **2–3 hrs/evening weekdays, full days on weekends**. (Note: customer-facing marketing copy says "Built in Tamil Nadu" — Thanjavur is less nationally recognized than the state; legal/registered-office docs use the precise "Thanjavur, Tamil Nadu".)

**Existing skills:** Node.js, Express, TypeScript, React, Next.js, PostgreSQL, Prisma, AWS basics, Docker basics, Python/ML.

**Learning for this project:** Three.js, WebXR, GLB/GLTF, Meshy.ai API, BullMQ, Razorpay Subscriptions, Shopify app dev, MediaPipe (Phase 3), Stable Diffusion (Phase 4), SwiftUI + visionOS (Year 2+).

**AI tools used while building:** Claude (architecture, debugging, code review), Cursor, Antigravity, v0.dev, GitHub Copilot.

**Hardware for testing:** Android phone with Chrome (primary). iPhone (borrowed from brother now; refurbished iPhone 12/13 base purchase by Week 8 — ~₹25-35K business expense).

**Business identity:** Google Workspace at `rekaman.io` is set up. Primary mailbox is `founder@rekaman.io` (admin). Aliases: `support@`, `billing@`, `hello@`, `sivasankari@` — all routing to the founder@ inbox. As of Week 5, all vendor accounts (AWS, Railway, Vercel, Neon, Sentry, Google Cloud / OAuth) have been migrated from `ekaramansivasankari@gmail.com` to `founder@rekaman.io`. GitHub and Namecheap stay on the personal account intentionally.

**AWS access discipline:** As of Week 5 Day 2, AWS daily operations flow through scoped IAM users (`rekaman-deploy-cli` for laptop, `rekaman-server` for Railway). Root account (founder@rekaman.io) is used ONLY for billing changes, account email changes, and IAM user management — never for deploys or daily ops. See **Operational Runbooks → AWS IAM Identity & Access Pattern** for full details.

---

## 🚀 The Product — Rekaman

**Name origin:** *Rekaman* (రికమన్ / रिकमन) means "recording/capture" in Indonesian & Malay (300M+ speakers). Also a perfect anagram of the founder's name "ekaraman."

**Tagline:** *Capture products. Place them anywhere.*

**One-line description:**
> A SaaS platform that lets any e-commerce brand add AR experiences ("View in your room," "Try it on") to their product pages in under 20 minutes — no 3D artists needed. Brands upload photos, our AI generates the assets, shoppers see products in their space or on themselves through their browser. No app download.

**The problem:** E-commerce brands suffer 25–30% return rates because shoppers can't visualize products before buying. Each return costs ₹2,000–₹5,000.

**The solution:** Multiple AR modes per product category, all working from the same SDK with one script tag. Photo-to-3D AI generation. Real-world scale rendering. Zero shopper app install.

**The differentiator:**
- Photos → 3D model in 90 seconds via AI (no competitor does this at our price point)
- Multiple AR modes (placement + face try-on + wrist try-on + AI photo try-on)
- Indian-market specific (multilingual UI, WhatsApp-native sharing, low-end Android fallback)
- Universal: works on Shopify, WooCommerce, AND every custom website

**Customer flow:**
1. Browse product on brand's website (any platform — Shopify, WooCommerce, custom)
2. Tap "View in your room" or "Try on yourself" (mode auto-selected by product category)
3. SDK loads, camera opens, product renders at real-world scale
4. Buy with confidence — no guesswork, fewer returns

---

## 🌐 Universal Reach — Rekaman Works on ANY Website

**Critical understanding:** Rekaman is NOT limited to Shopify/WooCommerce. It works on every website that can include a `<script>` tag and render a `<div>` — which is every modern e-commerce site.

**Three integration tiers (in order of customer effort):**

### Tier 1: Platform apps (zero code, Month 6+)
Brand clicks "Install" in Shopify/WooCommerce app store. Theme App Extensions auto-inject the snippet.

### Tier 2: Platform template edit (one-time, MVP)
```liquid
<!-- Shopify product.liquid -->
<div data-rk-product="{{ product.handle }}" data-rk-key="rk_live_xxx"></div>
```
```php
<!-- WooCommerce / WordPress -->
<div data-rk-product="<?php echo $product->get_slug(); ?>" data-rk-key="rk_live_xxx"></div>
```

Works for: Shopify, WooCommerce, Magento, BigCommerce, Webflow, Wix, Squarespace, OpenCart, PrestaShop.

### Tier 3: Custom site (manual injection)
```jsx
// React/Next.js product page
<div data-rk-product={product.slug} data-rk-key="rk_live_xxx"></div>
```

The `/install` dashboard page has THREE tabs: **Shopify | WooCommerce | Custom (Everything else)**. The Custom tab is just as important — likely 30%+ of brands use custom-built stores.

---

## 🔒 Locked Architecture Decisions

These are one-way doors. Don't revisit without a very good reason.

| Decision | Choice | Reason |
|----------|--------|--------|
| Package manager | **pnpm** | Fastest, strictest, best workspace protocol for monorepo |
| Node runtime | **Node 22 LTS** (pinned via `.nvmrc`) | Stable, long-term supported |
| Monorepo structure | **Single repo, npm workspaces via pnpm** | One version of code, shared types between SDK / dashboard / server |
| Backend architecture | **Modular monolith** (NEVER microservices for ≥3 years) | Solo dev, enforced boundaries via ESLint enable future extraction without splitting |
| Backend hosting | **Railway** (Month 1–15), then **Fly.io** | Simple to start, multi-region when needed |
| Database hosting | **Neon Postgres 17, Singapore region** (`ap-southeast-1`) | Mumbai unavailable on Neon; Singapore is closest. Branching for schema iteration, scale-to-zero |
| Redis hosting | **Upstash free** → Railway-native (Month 6+) | BullMQ + rate limiting |
| File storage | **AWS S3 + CloudFront** (`ap-south-1`) | GLB files, photos, global CDN |
| Frontend hosting | **Vercel** | Next.js native, free tier sufficient |
| SDK hosting | **CloudFront over S3** at `cdn.rekaman.io` | Immutable versioned URLs (`/v1/sdk.js`) |
| Billing (INR) | **Razorpay Subscriptions** | Phase 4: add Stripe for international |
| AI 3D pipeline | **Meshy.ai** | Industry leader. Don't build TripoSR backup until Meshy fails |
| AI clothing try-on (Phase 4) | **Replicate / Modal external services** | GPU inference as external service, not Rekaman code |
| Face/body tracking | **MediaPipe (client-side)** | Free, runs on-device, no privacy concerns |
| Error tracking | **Sentry** from Day 1 | Solo devs can't watch logs |
| Product analytics | **PostHog** (cloud) | On the dashboard, not on brands' sites |
| Email | **Resend** | Simple API, transactional only |
| Input validation | **Zod** on every endpoint | Schemas = docs |
| Logging | **Pino** (structured JSON, redacted PII) | Not `console.log` |
| CI/CD | **GitHub Actions** with Postgres service | Typecheck + lint + tenant isolation tests on every push |
| Auth | **JWT + bcrypt cost 12** + Google OAuth + future SAML | Cookie + Bearer header transport |
| ORM | **Prisma 5** | Type-safe, migrations built in |
| Test runner | **Vitest + Supertest** | Fast, ESM-native, integration-test friendly |
| API versioning | **`/v1/` URL prefix** for all routes | Future v2 lives in parallel without breaking integrations |

---

## 🏗️ The Tenant Model — Multi-Brand Membership

**One tenant = one brand = one company** (HomeTown, Urban Ladder, Woodcraft Chennai).

**Critical: Users belong to brands via `Membership`, not directly.** A user can be a member of multiple brands.

Each tenant has:
- Many **users** connected via Membership rows with roles: OWNER, ADMIN, MEMBER
- Many **products** (10 to 10,000)
- Multiple **API keys** (`ApiKey` table) — keys stored as SHA-256 hashes
- One or more **sites** running the SDK
- One **subscription** (linked to a `PricingPlan`)
- Many **invoices** (full payment history, amounts in paise)

**Tenant isolation enforced at THREE layers:**
1. **Auth middleware** — extracts `brandId` from verified JWT → `req.brandId`
2. **Repository signatures** — every DB query function takes `brandId` as required arg (compile-time enforcement)
3. **DB constraints** — `@@unique([brandId, slug])` enforces brand-scoped uniqueness

**Multi-tenant isolation verified by 7 automated tests** that run on every commit via CI.

---

## 📦 The SDK Philosophy (CRITICAL — Read Carefully)

**There is ONE `sdk.js` file. Globally. Forever.**

`https://cdn.rekaman.io/v1/sdk.js` — same for every brand, cached for 1 year in every browser.

### How it works

```html
<!-- One time in theme.liquid (or equivalent) before </body> -->
<script src="https://cdn.rekaman.io/v1/sdk.js" defer></script>

<!-- In product page template, where button should appear -->
<div data-rk-product="{{ product.handle }}"
     data-rk-key="rk_live_abc123"></div>
```

### How the SDK runs on a shopper's page
1. Scans DOM for `<div data-rk-product="...">`
2. Reads product + key attributes
3. Calls `GET /v1/ar/:apiKey/:productSlug` → gets product metadata + arMode + asset URLs
4. Routes to the correct AR mode chunk (placement, face-tryon, wrist-tryon, photo-tryon, etc.)
5. Injects "View in your room" / "Try on yourself" button (Shadow DOM-isolated) — early, before product fetch resolves, so it appears within ~50ms of page load
6. On tap: lazy-loads the appropriate engine chunk via `<script>` tag injection (NOT dynamic `import()` — see Critical rules below)
7. Fires analytics events via `navigator.sendBeacon` to `/v1/events`

### Critical rules for SDK
- **Tiny:** Main bundle ≤ 50KB gzipped (current: 3.0 KB)
- **Lazy chunks:** Each AR mode (placement, face-tryon, etc.) is a separate chunk loaded only when needed
- **Zero-config:** Script tag + div. Nothing else
- **Isolated:** No global leaks except `window.Rekaman`. No CSS leaks (Shadow DOM)
- **Versioned forever:** `/v1/sdk.js` never breaks. v2 gets a new URL
- **Lazy:** 99% of shoppers never tap AR — they pay zero cost beyond the loader
- **Idempotent:** `scan()` and `initAnalytics()` can run multiple times safely. The `[data-rk-mounted]` guard prevents double-mount; analytics tracks `listenersAttached` so `pagehide`/`visibilitychange` aren't bound multiple times when a page has multiple AR widgets.
- **Resilient delivery:** `flush()` tries `navigator.sendBeacon` first; if the UA queue refuses (returns `false`), falls back to `fetch(... { keepalive: true })`. Events aren't silently dropped when the page is unloading.
- **Errors carry requestId:** when `/v1/ar/...` returns 4xx/5xx, `fetchProduct` parses the `{ error, message, requestId }` envelope and surfaces it in the thrown Error message — so brand support tickets can be grepped in our logs/Sentry instantly.
- **Accessible:** AR button has `aria-label` matching the visible text; `aria-busy` toggles during chunk load. The decorative SVG icon is `aria-hidden`.
- **Non-blocking install:** Brands embed with `<script src="…/sdk.js" defer>`. The SDK's entry handles both `readyState === 'loading'` and the post-DOMContentLoaded case, so `defer` is always safe and prevents render-blocking on the brand's product page.
- **Chunks load via `<script>` tag, NOT `import()`:** Cross-origin module imports trip CORS preflight quirks across browsers (Brave, mobile webviews, CloudFront missing OPTIONS handling). The SDK's `loadChunk()` injects a `<script src="cdn.../v1/<chunk>.js">` and waits for `onload`. Each chunk is built as IIFE format and self-registers on `window.__rkChunks.<modeName>` so the launcher can call into it. Bypasses CORS entirely — same pattern Stripe/Segment/Intercom use.
- **AR session must NOT pin `document.body` as `domOverlay`:** Doing so renders the brand's entire page on top of the camera feed (looks broken). The placement engine requests `immersive-ar` without `dom-overlay`; the browser presents a clean camera-only view with a system-rendered exit button. Reference: Sentry incident 2026-05 — phones showed product page text overlapping the AR model.

### SDK Build Pipeline Conventions

The `packages/sdk` package uses esbuild via `build.config.ts`. Conventions every new chunk must follow:

- **Compile-time constants** — `__SDK_VERSION__`, `__API_BASE__`, `__CDN_BASE__` are injected via esbuild's `define` (zero runtime cost). Declared as ambient globals in `src/globals.d.ts` so source code references typecheck. Override at build time with `SDK_API_BASE=` / `SDK_CDN_BASE=` env vars.
- **Clean before build** — `dist/` is wiped on every non-watch build for deterministic output (no stale chunks served from CDN).
- **Size budget enforced in build** — `build.config.ts` measures gzipped size of `sdk.js` and warns if it exceeds the 50KB rule above. Adding feature code to the main bundle that pushes it over should fail review; move to a lazy chunk instead.
- **Watch mode covers main + chunks** — `pnpm build:watch` watches all bundles, not just the main one.
- **Versioned chunk filenames** — `placement-engine-v2.js` is the current production chunk (immutable URL pattern). When ANY content changes in a chunk, bump the version and ship the new file alongside the old one — never edit content at an existing `-vN` URL because clients have cached it as immutable for a year. Old SDK loaders keep working with the old version for as long as the brand has the old `sdk.js` cached (≤ 24 hr at edge, ≤ 5 min in browser). v1 of the placement chunk shipped with a `dom-overlay` bug; v2 fixed it. Lesson learned the hard way (May 2026).
- **Production builds via `pnpm build:prod`** — sets `NODE_ENV=production` which enables `minify`, disables sourcemaps (no internal path leaks to brand sites), and strips dev defines.

### SDK Chunk Architecture

```
cdn.rekaman.io/v1/
├── sdk.js                          (~15KB) Main loader, runs on every page
├── chunks/
│   ├── placement-engine.js         (~150KB) Three.js + WebXR (Phase 1)
│   ├── face-tryon-engine.js        (~180KB) MediaPipe FaceMesh + Three.js (Phase 3)
│   ├── wrist-tryon-engine.js       (~180KB) MediaPipe Hand + Three.js (Phase 3)
│   ├── hand-tryon-engine.js        (~180KB) MediaPipe Hand + Three.js (Phase 3)
│   ├── photo-tryon-engine.js       (~50KB)  Photo upload + AI orchestration (Phase 4)
│   └── multi-scene-engine.js       (~200KB) Multi-product placement (Phase 3)
└── i18n/
    ├── hi.js                       (~5KB) Hindi translations (Phase 2)
    ├── ta.js                       (~5KB) Tamil translations (Phase 2)
    └── ...
```

---

## 🏛️ The 5 Architectural Layers

### 1. Marketing Site (`rekaman.io`)
Next.js static site. Landing, pricing, docs, blog. Vercel.

### 2. Brand Dashboard (`dashboard.rekaman.io`)
Next.js 14 App Router. Where brands live. Separate deployment from marketing site.

### 3. Embeddable SDK (`cdn.rekaman.io/v1/sdk.js`)
TypeScript → esbuild → IIFE. Main bundle ~15KB, mode chunks lazy-loaded.

### 4. Core API (modular monolith)
Express + TypeScript. Two entry points sharing the same codebase:
- `server.ts` → HTTP API
- `worker.ts` → BullMQ job processor

Deployed as multiple Railway services (`api`, `generation-worker`, `analytics-worker`, `email-worker` over time) sharing code + database, scaling independently.

### 5. Data Tier
- **Neon Postgres** — primary source of truth (Singapore)
- **Upstash Redis** — BullMQ queue + rate limiting (Week 5+)
- **AWS S3 + CloudFront** — GLB files, product photos (Mumbai)
- **External services**: Meshy.ai (3D gen), Replicate/Modal (AI try-on, Phase 4), Razorpay (billing), Resend (email), Sentry (errors)

---

## 🗂️ Server Module Structure (Modular Monolith)

Every domain module has the **same 3-file shape** — enforced by ESLint:

```
server/src/
  modules/
    auth/                         # Built Week 3
    products/                     # Built Week 3 (extended Week 4 with arMode)
    apiKeys/                      # Built Week 4
    publicAr/                     # Built Week 4 — public AR endpoint
    arSessions/                   # Built Week 4 — analytics events
    generation/                   # Week 5 — Meshy orchestration
    conversions/                  # Phase 2 — ROI tracking
    billing/                      # Week 10 — Razorpay
    webhooks/                     # Week 10 — inbound (Razorpay, Shopify)
    outboundWebhooks/             # Phase 2 — brand-facing webhooks
    audit/                        # Phase 2 — audit logs
    auditLogs/                    # Phase 2
    teamInvitations/              # Week 8
    productAssets/                # Phase 3 — multi-asset products
    tryOnFace/                    # Phase 3 — face try-on backend logic
    tryOnPhoto/                   # Phase 4 — AI photo try-on orchestration
  workers/
    generation.worker.ts          # Week 5 — Meshy 3D generation
    aiTryOn.worker.ts             # Phase 4 — Replicate/Modal calls
    notifications.worker.ts       # Phase 2 — email, WhatsApp, SMS
  middleware/
    requestContext.ts             # Built Week 3
    auth.ts                       # Built Week 3
    errorHandler.ts               # Built Week 3
    rateLimiter.ts                # Built Week 3 (per-plan in Phase 2)
    asyncHandler.ts               # Built Week 3
  shared/
    db.ts, logger.ts, sentry.ts, errors.ts, env.ts, crypto.ts, slug.ts
    clients/                      # External-service SDK wrappers (Week 5+)
      meshy.client.ts             # Meshy.ai image-to-3D
      s3.client.ts                # AWS S3 products bucket
    queue/                        # BullMQ infra (Week 5+)
      connection.ts               # Lazy IORedis singleton
      queues.ts                   # `generation` queue + job types
  __tests__/
    setup.ts
    tenantIsolation.test.ts       # 7 critical tests
  app.ts, server.ts, worker.ts
```

### Module rules (enforced by ESLint)
- Modules expose only their **service** layer publicly
- `billing.service` can call `products.service.getProduct()`
- `billing.service` NEVER imports `products.repository.ts` directly
- Repositories are the ONLY files that touch Prisma
- Routes are thin: validate input (Zod), call service, format response
- Services throw **typed DomainError subclasses** (not strings)
- Error handler converts errors → consistent HTTP responses

---

## 🛠 Implementation Patterns (Production-Earned)

These conventions can't be derived from reading code — they encode *why* certain choices were made and *what would break* without them. New modules must follow these.

### Process Lifecycle (graceful shutdown)

Shutdown is split between `server.ts`/`worker.ts` and `shared/db.ts`. Both register signal handlers, but with different responsibilities:

- **`shared/db.ts`** runs `prisma.$disconnect()` on `SIGINT`/`SIGTERM`/`beforeExit`. It uses an idempotency flag (`shuttingDown`) and try/catch around disconnect so concurrent signals or disconnect failures don't blow up. **It does NOT call `process.exit`** — that would race with the entry point and kill in-flight HTTP requests before `server.close()` drains them.
- **`server.ts` / `worker.ts`** own the final exit. On `SIGINT`/`SIGTERM` they:
  1. `server.close()` — stop accepting new connections, drain in-flight requests
  2. Call `prisma.$disconnect()` (idempotent — db.ts may have already done it)
  3. `process.exit(0)`
  4. Force-exit via `setTimeout` after 10s as a safety net

`prisma.$disconnect()` is safe to call multiple times. Splitting responsibilities this way keeps `db.ts` reusable in scripts that don't run a long-lived server, while letting the server orchestrate graceful HTTP shutdown.

### Race-prone Mutations (pre-check + P2002 catch)

Pre-check + try/catch on the Prisma unique-constraint error code is the standard pattern for "is this slug/email/key taken?":

```ts
const existing = await repo.findBySlug(brandId, slug);
if (existing) throw new SlugAlreadyExistsError();   // friendly UX in common case

try {
  return await repo.create(brandId, data);
} catch (err) {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    throw new SlugAlreadyExistsError();             // race-safety in rare case
  }
  throw err;
}
```

Without the catch, two simultaneous creates that both pass the pre-check would surface as `500 INTERNAL_ERROR` (P2002 leaking from Prisma) instead of our `409 SLUG_EXISTS`. Reference: `modules/products/products.service.ts`.

**For idempotent-insert (no error desired)**, prefer `createMany({ data: [row], skipDuplicates: true })` over `upsert({ ..., update: {} })`. The former compiles to atomic Postgres `INSERT ... ON CONFLICT DO NOTHING`; the latter does NOT atomically check-and-insert and **will** throw P2002 under concurrent batches. We hit this in Sentry issue `2d26c02a` (May 2026) — concurrent SDK event batches with the same sessionId crashed the second batch's upsert, dropping all `ar_button_tapped` / `ar_session_started` events. Reference: `modules/arSessions/arSessions.repository.ts upsertSession`.

### Path-aware CORS for the Public SDK Endpoints

The SDK runs on **arbitrary brand websites** — `hometown.co.in`, `urbanladder.com`, etc. — none of which are in our dashboard CORS whitelist. To support this without weakening dashboard security:

`app.ts` uses a `corsOptionsDelegate` (one global `cors()` call) that branches on `req.path`. Public SDK paths (currently `/v1/ar/*` for product metadata and `/v1/events` for analytics ingestion) get permissive CORS; everything else gets strict CORS.

- **Public SDK paths:** `origin: '*'`, `methods: ['GET', 'POST', 'OPTIONS']`, `maxAge: 86400`, **no credentials**. Applies to all responses including 404/500 + handles OPTIONS preflights so the SDK can read error bodies and avoid misleading "CORS error" messages.
- **Everything else:** strict whitelist `[DASHBOARD_URL, rekaman.io, dashboard.rekaman.io]` + `credentials: true` for cookie-based auth.

When adding a new public SDK route, extend `isPublicSdkPath()` in `app.ts` — single source of truth.

**Don't add `Access-Control-Allow-Origin` inline in handlers** — the global delegate already covers all responses. Inline `res.set` only sets headers on the success path; errors miss them.

### External API Boundaries (Google, Razorpay, Meshy, S3, Replicate)

Calls to external services must wrap throwing operations in a try/catch that converts the underlying error into a typed `DomainError`. An uncaught throw leaks as `500 INTERNAL_ERROR` and pollutes Sentry with garbage from public-internet attackers spamming the endpoint with malformed inputs.

Pattern: catch the external error, log it at `warn` level (not `error` → Sentry) since this is the expected failure mode for client-supplied inputs, then throw the appropriate typed error.

```ts
let ticket;
try {
  ticket = await oauthClient.verifyIdToken({ idToken, audience });
} catch (err) {
  logger.warn({ err }, 'google id token verification failed');
  throw new ValidationError('Invalid Google ID token');
}
```

Reference: `modules/auth/auth.service.ts loginWithGoogle`. Apply the same pattern when wiring Razorpay (Phase 1), Meshy (Week 5), Replicate/Modal (Phase 4).

### Testing (DB safety guard — prevents prod-DB nukes)

**Tests use a SEPARATE database from dev.** The `afterEach` hook in `__tests__/setup.ts` runs `deleteMany()` on every Brand, Product, Membership, ApiKey, ARSession, AREvent, Subscription, Invoice, OrgInvitation row in whatever database `DATABASE_URL` points to. Running tests against the dev/prod Neon DB would wipe all data including the seeded PricingPlans.

**The setup enforces this with a hard refusal.** `beforeAll` checks `DATABASE_URL`:
- ✅ Allowed: `localhost`, `127.0.0.1`, `::1`
- ✅ Allowed: any URL **only if** `RUN_DESTRUCTIVE_TESTS=true` is also set (explicit opt-in)
- ❌ Refused: anything else, with the offending host name in the error message

**Local test workflow:**
1. Spin up an isolated Postgres: `docker run -d --name rekaman-test-db -p 5433:5432 -e POSTGRES_PASSWORD=test postgres:17`
2. `cp .env.test.example .env.test` (already gitignored)
3. Apply schema: `DATABASE_URL='postgresql://postgres:test@localhost:5433/postgres' pnpm prisma migrate deploy`
4. `pnpm test`

`vitest.config.ts` loads `.env.test` before vitest spawns workers, so `process.env.DATABASE_URL` is set before `shared/db.ts` instantiates the Prisma client.

**Rate limiters skip in `NODE_ENV=test`.** `middleware/rateLimiter.ts` has `skip: () => NODE_ENV === 'test'` on both `authRateLimit` and `apiRateLimit`. Without this, a 7-test suite signing up 2 brands per `beforeEach` would hit the 5/hr auth limit on test 3. Production behavior is unchanged.

**CI uses a fresh Postgres service container** per run (`.github/workflows/ci.yml`). No opt-in needed there because the URL is `localhost`. Prisma scripts in CI must use the explicit script names (`prisma:generate`, `prisma:deploy`) — pnpm 9's `--filter <pkg> <bin>` only matches scripts and silently exits 0 when no script matches, so `pnpm --filter @rekaman/server prisma migrate deploy` is a no-op trap.

### TypeScript / ESLint Conventions

Two non-obvious patterns are unavoidable across modules:

1. **Router exports require explicit `: Router` annotation.** Because `declaration: true` is set in `tsconfig.base.json`, TS emits `.d.ts` files. An inferred `Router` type pulls in deeply-nested `@types/express-serve-static-core` paths that aren't portable, causing TS2742. Every route file must declare `export const xRoutes: Router = router`.

2. **Express request augmentation uses `declare global { namespace Express }` with a per-file lint disable.** The augmentation pattern (adding `requestId`, `auth`, etc. to `Request`) is the idiom shipped by `@types/express` itself, but conflicts with `@typescript-eslint/no-namespace`. Use `// eslint-disable-next-line @typescript-eslint/no-namespace` immediately above each `namespace Express` line. References: `middleware/requestContext.ts`, `middleware/auth.ts`.

3. **Production builds exclude tests.** `tsconfig.json` excludes both `**/*.test.ts` AND `src/__tests__/**` so `setup.ts` (which imports `vitest`, a devDependency) doesn't leak into the production bundle.

### Git Conventions

**Commit message format:** `shiva | <type>(<scope>): <short description>`

- **`shiva |`** prefix is required on every commit — identifies the author at a glance in `git log`.
- **`<type>`** follows Conventional Commits: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ci`.
- **`<scope>`** is the affected area: `server`, `sdk`, `dashboard`, `landing`, `db`, `ci`, etc. Optional but encouraged.
- Description is imperative present-tense and ≤ 72 characters.

Examples:
- `shiva | feat(server): production-grade auth, products, tenant isolation`
- `shiva | fix(auth): catch Google verifier throws as 400 instead of 500`
- `shiva | docs: update CLAUDE.md to v5 with full feature catalog and roadmap`

Every Claude-authored commit must use the `shiva | …` prefix.

---

## 🚦 Operational Runbooks

These encode "how we operate the live system" — separate from "how we write code." Hard-won during Weeks 3–5; capturing so future you / future Claude doesn't repeat them.

### Secrets & Env Var Locations

Every secret has exactly TWO copies (production + local dev). One is gitignored, one is on the vendor's servers. **Never commit either.** `.env.example` carries the schema (var names) but no values.

| Secret | Production location | Local-dev location | In git? |
|---|---|---|---|
| `DATABASE_URL` (Neon) | Railway → `api` + `worker` Variables | `server/.env` | No (gitignored) |
| `JWT_SECRET` | Railway → `api` Variables | `server/.env` | No |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Railway → `api` + `worker` Variables | `server/.env` | No |
| `GOOGLE_REDIRECT_URI` | Railway → `api` Variables | `server/.env` | No |
| `SENTRY_DSN` | Railway → `api` + `worker` Variables | `server/.env` | No |
| `MESHY_API_KEY` (Week 5+) | Railway → `worker` Variables | `server/.env` | No |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (from `rekaman-server` IAM user; Week 5 Day 3+) | Railway → `api` + `worker` Variables | `server/.env` | No |
| `S3_REGION` (`ap-south-1`) | Railway → `api` + `worker` Variables | `server/.env` | No |
| `AWS_S3_BUCKET_PRODUCTS` (`rekaman-products-prod-975050270919-ap-south-1-an`) | Railway → `api` + `worker` Variables | `server/.env` | No |
| Razorpay keys (Week 10+) | Railway → `api` Variables | `server/.env` | No |
| Test DB URL | n/a | `server/.env.test` (different file) | No |
| Schema/var names only | n/a | `server/.env.example` | **Yes** (committed) |

**When you rotate a secret, update BOTH places** (Railway + local `.env`). Rotating only one leads to "works locally, broken in prod" or vice versa. Skipping the worker service is a footgun if any future code change makes the worker import that env var.

When adding a new env var:
1. Add to `server/src/shared/env.ts` Zod schema (with `.optional()` if not yet used)
2. Add to `server/.env.example` (commit) — no value, just `KEY=`
3. Set value in Railway api + worker (both, even if only api needs it now — saves work later)
4. Set value in `server/.env` for local dev
5. If sensitive, store in password manager too

### AWS IAM Identity & Access Pattern

**Established Week 5 Day 2 (May 4, 2026).** AWS access flows through scoped IAM users — root account is locked out of daily operations.

**The three identities:**

| Identity | Type | Used by | Used for | Where credentials live |
|---|---|---|---|---|
| Root user (founder@rekaman.io) | AWS root | Human (founder only) | Billing changes, account email, account closure | Password manager + MFA on phone (Authy/Google Authenticator). NEVER in any code, env var, or laptop config. |
| `rekaman-deploy-cli` | IAM user | Laptop AWS CLI | SDK builds → S3 uploads → CloudFront cache invalidation | `~/.aws/credentials` profile `rekaman` on founder's laptop |
| `rekaman-server` | IAM user | Railway api + worker (deferred to Week 5 Day 3) | Server-side uploads of Meshy-generated GLBs to products S3 bucket | Railway env vars `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` (BOTH services) + local `server/.env` |

**Custom IAM policies (NOT AWS-managed `*FullAccess`):**

`rekaman-deploy-cli-policy` grants:
- `s3:ListBucket`, `s3:GetBucketLocation` on the SDK bucket only
- `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:GetObjectAcl`, `s3:PutObjectAcl` on `rekaman-sdk-prod-975050270919-ap-south-1-an/*`
- `cloudfront:CreateInvalidation`, `cloudfront:GetInvalidation`, `cloudfront:ListInvalidations`, `cloudfront:GetDistribution` on distribution `E1L37VUXZMO4QV` only

`rekaman-server-policy` grants (smaller, tighter):
- `s3:ListBucket`, `s3:GetBucketLocation` on the products bucket only
- `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:GetObjectAcl`, `s3:PutObjectAcl` on `rekaman-products-prod-975050270919-ap-south-1-an/*`
- NO CloudFront access (server doesn't manage cache; new files = new keys, no invalidation needed)

**Defense-in-depth verification (run periodically to confirm scoping):**

```bash
# What the laptop user CAN do (positive tests)
aws s3 ls s3://rekaman-sdk-prod-975050270919-ap-south-1-an/v1/ --profile rekaman   # ✅ list
aws cloudfront list-distributions --profile rekaman                                # ✅ list

# What the laptop user CANNOT do (negative tests — should ALL fail with AccessDenied)
aws s3 ls s3://rekaman-products-prod-975050270919-ap-south-1-an --profile rekaman  # ❌ denied
aws s3api list-buckets --profile rekaman                                           # ❌ denied
aws iam list-users --profile rekaman                                               # ❌ denied
```

If any negative test SUCCEEDS, the policy is too broad — fix immediately.

**Access key rotation:**

- Rotation cadence: every **90 days** (calendar reminder May 4 → August 2 → November 1)
- Rotation procedure for `rekaman-deploy-cli`:
  1. IAM Console → user → Security credentials → Create access key (gives you a SECOND active key)
  2. Update `~/.aws/credentials` profile `rekaman` with new keys
  3. Test: `aws sts get-caller-identity --profile rekaman` → confirm new ARN matches
  4. Test: SDK deploy with new keys
  5. After 24 hours of confirmed working: deactivate old key (don't delete yet — keeps audit trail)
  6. After 7 days: delete old key
  7. Update password manager + CSV backup with new keys

- Rotation procedure for `rekaman-server`: same pattern, but update Railway env vars (BOTH api + worker) + local `.env` instead of `~/.aws/credentials`

**Compromise response:**

- If `rekaman-deploy-cli` keys leak (laptop stolen, accidental git commit): IAM Console → user → Security credentials → Deactivate old key → create new → update `~/.aws/credentials`. Blast radius: SDK bucket + CloudFront invalidation only. Cleanup: `aws s3 ls` to check no foreign uploads, CloudFront audit log.
- If `rekaman-server` keys leak (Railway compromise, env var leak): IAM Console → deactivate → create new → update Railway env vars (both services) + local `.env`. Blast radius: products bucket only. Cleanup: list products bucket for unexpected files.
- If root credentials leak: AWS Support ticket immediately. Reset password, re-issue MFA, audit IAM users for unauthorized changes.

**The root account discipline:**

- Sign in as root only when you MUST: billing changes, account email change, account closure, IAM user creation/deletion
- Daily operations (deploys, S3 work, CloudFront invalidations, monitoring) ALWAYS via IAM user
- If Claude or any tutorial says "sign in to AWS Console" for daily work, mentally reroute: "use IAM user via CLI" instead
- `aws configure` on a fresh laptop should NEVER use root credentials. Ever.

**Why we chose access keys (not IAM Roles Anywhere):**

AWS recommends IAM Roles Anywhere for non-AWS workloads (temporary credentials via X.509 certs). We deferred this because:
- Solo founder, small bucket, pre-PMF
- Roles Anywhere requires PKI setup (5-10x more complexity)
- Standard SaaS pattern: access keys + 90-day rotation + scoped permissions
- Revisit at Phase 4 (Months 13-18) when SOC 2 prep makes it worthwhile

### Deployment Ownership

What auto-deploys on `git push origin main`, what doesn't:

| Surface | Triggered by | How long | Notes |
|---|---|---|---|
| Railway `api` service | Git push to `main` | ~2 min | Auto-redeploys on env var changes too |
| Railway `worker` service | Git push to `main` | ~2 min | Same as api |
| Vercel demo | Git push to `main` | ~30 sec | **Requires Settings → Git → Production Branch = `main`.** First-time CLI deploys without git connection don't auto-deploy on push — explicit setup needed. |
| CloudFront / S3 SDK | **MANUAL** | 5 min upload + 3 min invalidation | `pnpm build:prod` → S3 console drag-drop → CloudFront invalidate `/v1/sdk.js` (chunk URLs are versioned, no invalidation needed) |
| Neon schema | **MANUAL** | seconds | `pnpm exec prisma migrate dev --name <slug>` locally → committing the migration file → deploys via `prisma migrate deploy` step in CI (or run manually for first-time prod) |
| DNS / domain | **MANUAL** | 5–30 min | Namecheap → Advanced DNS. Wait for propagation. |

Future Claude must NOT assume "git push deploys SDK" — that's the trap that cost us a debug session. SDK is always manual S3 upload.

### SDK Release Workflow

The exact sequence when shipping new SDK code. Skipping a step = stale clients OR broken AR.

**Pre-flight: confirm IAM profile is active.** Every AWS command in this workflow uses `--profile rekaman` (the `rekaman-deploy-cli` IAM user). Verify with `aws sts get-caller-identity --profile rekaman` — ARN should end in `user/rekaman-deploy-cli`. If you ever see ARN ending in `root`, STOP — root must NOT do deploys.

1. **Decide if chunk content changes.** If you edit `src/chunks/*.ts` AT ALL — even a comment — the bundled chunk content changes. **Bump the chunk filename version** (`-vN` → `-vN+1`) in `build.config.ts` AND `ar-launcher.ts`. The "immutable" cache header forbids editing content at an existing URL. Rule of thumb: any time `pnpm build` produces different bytes for the chunk, the filename must change.

2. **Build:** From `packages/sdk/`:
   ```bash
   SDK_API_BASE=https://api.rekaman.io \
   SDK_CDN_BASE=https://cdn.rekaman.io \
   NODE_ENV=production \
   pnpm build
   ```
   Verify URL substitution: `grep -o 'https://api\.rekaman\.io' dist/sdk.js | head -1` and same for `cdn.rekaman.io`.

3. **Verify size budget:** main bundle output should print `≤ 50 KB gzipped`. If it warns, move feature code into a chunk before shipping.

4. **Upload to S3** (via `rekaman-deploy-cli` IAM user, not Console drag-drop):

   ```bash
   # Main bundle (stable filename, short cache + stale-while-revalidate)
   aws s3 cp dist/sdk.js \
     s3://rekaman-sdk-prod-975050270919-ap-south-1-an/v1/sdk.js \
     --cache-control "public, max-age=300, s-maxage=86400, stale-while-revalidate=86400" \
     --content-type "application/javascript" \
     --profile rekaman

   # New versioned chunk (immutable cache — only when chunk content changed + filename bumped)
   aws s3 cp dist/placement-engine-vN.js \
     s3://rekaman-sdk-prod-975050270919-ap-south-1-an/v1/placement-engine-vN.js \
     --cache-control "public, max-age=31536000, immutable" \
     --content-type "application/javascript" \
     --profile rekaman
   ```

   - DON'T delete older chunk versions — they're fallbacks for clients with cached older `sdk.js`.

5. **CloudFront invalidate ONLY `/v1/sdk.js`** — chunk URLs are versioned, never need invalidation:

   ```bash
   aws cloudfront create-invalidation \
     --distribution-id E1L37VUXZMO4QV \
     --paths "/v1/sdk.js" \
     --profile rekaman
   ```

   Wait ~60s for edge nodes to drop old cache.

6. **Verify served bytes match local:**
   ```bash
   diff <(curl -s https://cdn.rekaman.io/v1/sdk.js) packages/sdk/dist/sdk.js
   curl -sI https://cdn.rekaman.io/v1/placement-engine-vN.js | grep -i cache-control
   curl -sI https://cdn.rekaman.io/v1/sdk.js | grep -iE 'x-cache|age|last-modified'
   ```
   Look for `x-cache: Miss from cloudfront` and `age: 0` after invalidation propagates.

7. **Commit:** `pnpm build` outputs are gitignored, so the commit only includes source changes (chunk version bump in build.config.ts + ar-launcher.ts).

**Historical note:** Week 4 deploys went via AWS Console drag-drop using root credentials. From Week 5 Day 2 onwards, all deploys go via `--profile rekaman` (IAM user). If you find yourself opening S3 Console to drag a file, STOP — use the CLI commands above instead.

### Production Data Hygiene

The prod DB is shared with dev (Week 5 design). Two consequences:

- **Test signups accumulate in prod.** Manual smoke tests, cleanup needed monthly. Use the email-pattern allowlist approach:
  ```ts
  const KEEP_PATTERNS = [
    /^sdk-demo\+/,                    // SDK Demo Brand
    /^founder@rekaman\.io$/,          // founder ops
    /^sivasankari@rekaman\.io$/,      // founder personal alias
  ];
  // Delete every brand whose owner does NOT match → cascades clear sessions/events/products
  ```
  Reference: ad-hoc script we ran in Week 5 (cleanup pattern documented in chat history; not committed because production-only).

- **Never seed test data into prod.** The `prisma/seed.ts` only seeds `PricingPlan` rows (3 of them). If you add seed data, scope by `NODE_ENV` so it never runs in production.

When real customers exist (Week 6+), splitting dev and prod DBs becomes mandatory — make this a Week 6 milestone.

### Cross-Service Health Check (one-shot)

```bash
# Run this any time to verify the whole stack:
echo '─── api ───';   curl -sI https://api.rekaman.io/health | head -1
echo '─── cdn ───';   curl -sI https://cdn.rekaman.io/v1/sdk.js | head -1
echo '─── demo ───';  curl -sI https://demo.rekaman.io/oslo-sofa | head -1
echo '─── db (via api/metrics) ───'; curl -s https://api.rekaman.io/metrics | python3 -m json.tool | grep -E '"db"|"env"'
echo '─── google oauth wired ───'; \
  curl -s -X POST https://api.rekaman.io/v1/auth/google -H 'Content-Type: application/json' \
    -d '{"idToken":"fake-but-long-enough"}' | python3 -c "import json,sys;d=json.load(sys.stdin);print('OK' if 'Google ID token' in (d.get('message') or '') else 'CHECK ENV VARS')"
```

If all five are green, the system is healthy. If any fails, the failing line tells you which layer to investigate.

### Rollback Mechanics

| What broke | How to roll back | Notes |
|---|---|---|
| Server code regression | `git revert <sha> && git push` → Railway auto-deploys old version (~2 min) | Don't `git push --force` — leaves an audit trail |
| SDK bundle regression | Re-upload previous `sdk.js` from a prior `git checkout <sha>` build using `aws s3 cp ... --profile rekaman` → invalidate `/v1/sdk.js` via `aws cloudfront create-invalidation ... --profile rekaman` | Keep `dist/` of last good build in a backup folder before risky changes. NEVER use root credentials for rollback. |
| Schema regression | **Don't auto-rollback.** Apply a compensating migration that reverts the change. `prisma migrate resolve --rolled-back` only marks status, doesn't undo SQL. | Always test schema changes against a Neon branch first |
| Env var change broke prod | Railway → service → Variables → revert the value → save (auto-redeploys) | Railway shows variable history |
| OAuth client misconfigured | Old client kept active for 7 days post-rotation as fallback (per Account Ownership notes) — switch Railway env back to old `CLIENT_ID`/`SECRET` | Why we don't delete old OAuth client immediately |
| Demo (Vercel) regression | Vercel dashboard → Deployments → find last good → "Promote to Production" | One-click rollback, doesn't require git revert |

**Note on AWS:** S3 + CloudFront have no native rollback. SDK rollback strategy = always keep the last 2–3 builds backed up locally before publishing a new version.

### Production-Touching Action Checklist

Before any action that hits production data or services, ask:

1. Does this affect rows in the prod Neon DB? → backup or scope to soft-delete first
2. Does this change a public CDN URL? → versioned filename, not in-place edit
3. Does this rotate a secret? → update Railway api + worker + local `.env` (3 places)
4. Does this change DNS? → DNS propagation is 5-30 min; schedule for low-traffic hours when real customers exist

If the answer to any is yes and you're operating without a co-founder review, double-check before pressing the button.

### Generation Pipeline Runbook (Week 5 close — May 9 2026)

This subsection captures the operational reality of the Meshy → S3 → READY pipeline as proven end-to-end against prod. Read this before touching the generation flow or onboarding the first paying brand.

#### Live Production Identifiers (cuids — DO NOT regenerate; copy these)

| Resource | Value | Notes |
|---|---|---|
| Founder Rekaman account email | `founder@rekaman.io` | **Different from vendor account at the same email.** This is a Rekaman-DB user, password-auth, created via `POST /v1/auth/signup` on May 9 2026. Password lives in password manager. NOT Google-OAuth-only. |
| Founder user.id | `cmotyhdkj0001uig5onuktwq0` | Use for JWT minting / DB lookups |
| Founder brand.id | `cmotyhdv20002uig5vxldw4g8` | Brand: "Rekaman", role OWNER |
| Founder brand.slug | `rekaman-b943` | Auto-generated from companyName "Rekaman" |
| Legacy demo user | `sdk-demo+1777499799@rekaman.io` | Week 4 demo brand `sdk-demo-brand-3722` (oslo-sofa). Leave in place. |
| Products S3 bucket | `rekaman-products-prod-975050270919-ap-south-1-an` | **Public-readable** as of May 9 2026 (Phase 1 Path A). CORS allow `*`. |
| SDK S3 bucket | `rekaman-sdk-prod-975050270919-ap-south-1-an` | Public via CloudFront `cdn.rekaman.io`. |
| Railway services | `api`, `worker` (project `romantic-heart`, env `production`) | api.rekaman.io is `api`; `worker` is internal-only (no public URL). |
| First successful prod GLB (e2e test product) | `cmou3lwe9000337mk8223jby3` (founder brand, May 9, 2-min Railway-only run) | Public URL: `https://rekaman-products-prod-975050270919-ap-south-1-an.s3.ap-south-1.amazonaws.com/brands/cmotyhdv20002uig5vxldw4g8/products/cmou3lwe9000337mk8223jby3/v1/model.glb` — use this for cold emails / demo links. |

#### Pipeline Lifecycle (what happens when a brand triggers generation)

```
Brand              Rekaman api          BullMQ (Upstash)    Worker (Railway)    Meshy.ai             S3 (products)        DB (Neon)
  │                     │                       │                  │                  │                     │                    │
  │── POST /v1/products ┼>─ create row ─────────┼──────────────────┼──────────────────┼─────────────────────┼─── INSERT product ─>│
  │                     │                       │                  │                  │                     │                    │
  │── POST .../generate ┼>─ POST meshy task ────┼──────────────────┼─────────────────>│                     │                    │
  │                     │<── { taskId } ────────┼──────────────────┼──────────────────┤                     │                    │
  │                     │── markProductProcessing ──────────────────────────────────────────────────────────┼─── UPDATE → PROCESSING + meshyTaskId
  │                     │── enqueue ──────────> bull:generation:delayed                                     │                    │
  │<── 202 Accepted ────┤                       │                  │                  │ (running AI ~60-180s)                   │
  │                     │                       │ (5s delay)       │                  │                     │                    │
  │                     │                       └────> wait ──────>│                  │                     │                    │
  │                     │                                          │── poll every 5s ─>│                     │                    │
  │── poll status ──────┼──────────────────────────────────────────┼────── status === SUCCEEDED ◄──┐         │                    │
  │<── PROCESSING ──────┤                                          │                              │         │                    │
  │   (repeat ~60-180s) │                                          │── GET model_urls.glb ───────>│         │                    │
  │                     │                                          │<── GLB bytes (Meshy CDN) ────┤         │                    │
  │                     │                                          │── PutObject (versioned key) ─┼────────>│                    │
  │                     │                                          │── markProductReady ──────────┼─────────┼─── UPDATE → READY + glbUrl + glbSizeKb
  │                     │                                          │                              │         │                    │
  │── poll status ──────┤                                                                         │         │                    │
  │<── READY + glbUrl ──┤                                                                         │         │                    │
  │                     │                                                                         │         │                    │
  │── GET <glbUrl> ─────┼─────────────────────────────────────────────────────────────────────────┼────────>│                    │
  │<── GLB bytes ───────┤                                                                         │         │                    │
```

**Latency budget:** typical ~90-180 s end-to-end (Meshy = 60-150 s, our pipeline overhead = 5-15 s). Worker `GENERATION_MAX_DURATION_MS=300000` (5 min) is the hard cap; jobs over that get `markProductFailed isTransient=true`.

**Cost per generation (verified May 9):** 30 Meshy credits = ~₹40-80 / ~$0.50.

**Scope of one job:** ONE photo → ONE GLB. Multi-photo image-to-3D is Phase 2 (Meshy v2 endpoint). Re-running generation on the same product creates `attemptNumber+1` and uploads to a new versioned S3 key (e.g. `v2/model.glb`); the prior `v1/` is left in place as historical record.

#### Tool Cookbook (`server/scripts/*.mjs` — when to run which)

All scripts live under `server/scripts/` and are run as `node --env-file=.env scripts/<name>.mjs ...` from the `server/` directory (Node ESM resolves `@prisma/client` from there).

| Script | When to use | Example |
|---|---|---|
| `mint-jwt.mjs <email>` | Local `JWT_SECRET` differs from Railway's, OR account is Google-OAuth-only and `/v1/auth/login` rejects. **Note:** the JWT is signed with whatever `JWT_SECRET` is in your local `.env` — if that doesn't match Railway, prod will reject the token. Better fix is to sync local `.env` to Railway's value. | `node --env-file=.env scripts/mint-jwt.mjs founder@rekaman.io` |
| `recover-stuck-generation.mjs <productId>` | Worker bug fix landed; existing in-flight job is stuck in BullMQ (delayed/active/failed). Re-enqueues against the SAME `meshyTaskId` already in product metadata — **no fresh Meshy charge**. | `node --env-file=.env scripts/recover-stuck-generation.mjs cmou3lwe9000337mk8223jby3` |
| `presign-glb.mjs <s3-key>` | QA needs to view a GLB BEFORE the products bucket has a public-read policy (Day 7 era). 1-hr expiry. Stop using once Path A bucket policy is live and bare S3 URLs return 200. | `node --env-file=.env scripts/presign-glb.mjs 'brands/.../v1/model.glb'` |
| `list-users.mjs` | Diagnostic: who's in the prod DB, what auth modes they have, what brands they own. Used early-Day-7 to discover `founder@rekaman.io` didn't exist yet. | `node --env-file=.env scripts/list-users.mjs` |

The repo-root `scripts/e2e-generation.sh` is the smoke-test driver. Accepts either `FOUNDER_PASSWORD` (prod login) OR `AUTH_TOKEN` (pre-minted JWT). With Path A bucket policy live and Railway worker active, a successful run prints a bare-S3 `glbUrl` you can paste into 3dviewer.net or use directly in cold emails.

#### Common Gotchas (real failures we hit + their fixes)

These are not theoretical — every one of these blocked Day 7 progress until we worked around it. Keep this list handy.

1. **`founder@rekaman.io` 401 on `/v1/auth/login`.** That email is a vendor account label (Sentry/AWS/Railway/etc) — Rekaman has its own auth. **Fix:** sign up via prod `POST /v1/auth/signup` to create the user + brand. Save the password immediately; there's no password-reset endpoint until Week 8.

2. **`mint-jwt.mjs` token rejected by prod with 401.** Local `.env` `JWT_SECRET` drifted from Railway's. JWT is signed correctly but with the wrong key. **Fix:** copy `JWT_SECRET` from Railway → `api` service → Variables → paste into local `server/.env`. Day-7 workaround was `/v1/auth/signup` instead (returns a Railway-signed JWT directly).

3. **S3 bucket policy save fails: "conflicts with your Block Public Access settings".** AWS forces a 2-step unblock-then-policy order. **Critical sub-gotcha:** the four BPA checkboxes have INVERTED meaning that's easy to confuse:
   - Boxes 1+2 (ACLs) — **keep CHECKED** (defense in depth; ACLs are disabled at Object Ownership level anyway)
   - Boxes 3+4 (public bucket policies) — **UNCHECK these** to allow our policy
   
   We hit this exact reversal on Day 7. If your save still fails after unblocking, you uncheckmarked the wrong pair. The four-box correct state for a public-read products bucket:
   ```
   ☑ Block public access ... new ACLs
   ☑ Block public access ... any ACLs
   ☐ Block public access ... new public bucket or access point policies
   ☐ Block public and cross-account ... any public bucket or access point policies
   ```

4. **Railway worker first deploy crashes "Can't reach database server" (Prisma).** Neon scales to zero after ~5 min idle. When Railway boots a new worker container, the first `prisma.$queryRaw\`SELECT 1\`` fires before Neon wakes. **Fix:** Railway auto-retries within ~30 s; the second attempt succeeds. If it doesn't, hit `https://api.rekaman.io/metrics` from your laptop to wake Neon, then redeploy.

5. **Railway worker silent — jobs stuck in `bull:generation:delayed`.** Either the worker service has a wrong `Start Command` (must be `pnpm --filter @rekaman/server start:worker`, not `pnpm start`), OR `REDIS_URL` is missing/wrong in worker Variables (must match api's exactly). **Fix:** Settings → Custom Start Command, then Variables → confirm REDIS_URL value matches api's. Logs should show `generation worker subscribed`.

6. **BullMQ "Missing lock for job" + "job stalled more than allowable limit".** Default `lockDuration: 30000` (30 s) is far less than our 5-min poll budget. Lock expires mid-poll, job marked stalled. Fixed in worker code (`lockDuration: GENERATION_MAX_DURATION_MS + 60_000`). **If you see this error in logs**, check `GENERATION_MAX_DURATION_MS` env var hasn't been bumped past `lockDuration` (keep the `+ 60_000` invariant).

7. **Meshy poll fails with "response shape unexpected".** Meshy v1 image-to-3d returns `task_error: null` (not undefined), `consumed_credits` (not `credits_used`), `texture_urls[].emission` (extra field). Schema fix landed May 9 in `meshy.client.ts` — uses `.nullish()` everywhere. **If a future Meshy API version adds new nullable fields**, extend the schema with `.nullish()` (NOT `.optional()`).

8. **`gltf-viewer.donmccurdy.com` no longer has a URL input box.** As of May 2026 it's drag-drop / file-picker only. **Workarounds:**
   - **3dviewer.net** — has URL input, paste the bare S3 URL there
   - **Download + drag** — `curl -sS -o /tmp/model.glb '<url>' && file /tmp/model.glb` then drag `/tmp/model.glb` into gltf-viewer
   - **modelviewer.dev/editor/** — Google's tool, also accepts URLs

9. **AWS Console S3 → Bucket policy editor: "you don't have permissions to edit".** This message is misleading — usually the actual cause is "your policy conflicts with BPA settings", not an IAM permission issue. Check BPA first (gotcha #3) before debugging IAM.

10. **The first Day-7 e2e run completed locally (not Railway), then reproduced on Railway after fixing.** When validating an end-to-end flow, ALWAYS verify against Railway-only run: kill all `pnpm dev:worker` processes locally, then run e2e. If status reaches READY without local processes, the prod stack is truly self-serve. Otherwise you're masking a Railway-side problem.

#### Recovery Procedure: stuck product

If a brand's product is stuck in `PROCESSING` for >10 min:

1. Check Meshy status directly: `curl -H "Authorization: Bearer $MESHY_API_KEY" https://api.meshy.ai/openapi/v1/image-to-3d/<taskId>` (taskId from `metadata.generation.meshyTaskId`).
2. **If Meshy says SUCCEEDED:** the GLB is sitting waiting; our worker just isn't picking up. Run `recover-stuck-generation.mjs <productId>` — re-enqueues the SAME meshyTaskId, no charge.
3. **If Meshy says IN_PROGRESS:** wait. Meshy occasionally takes 5+ min on complex inputs.
4. **If Meshy says FAILED/CANCELED:** the worker should have already marked the product FAILED. If it hasn't, our worker is dead — restart Railway `worker` service.
5. **If Meshy returns 404 (taskId unknown):** task expired (3-day window) or never existed. Mark product FAILED manually + offer brand a free retry.

#### Phase 2 Migration Trigger (recap)

Move products bucket from public-read (Path A) to CloudFront + OAC at `products.rekaman.io` when ANY fires:
- Total products-bucket egress > 50 GB/month
- Any single GLB > 1 GB egress in 24 h (viral product)
- A brand asks for a private/B2B catalog
- SOC 2 / DPDP audit requires single ingress point
- We provision `rekaman-billing-prod` (good time to architect both buckets properly)

Migration is one afternoon: set up CloudFront → swap `publicProductUrl()` in `s3.client.ts` → tighten bucket policy to OAC. **No data migration required** — keys stay the same.

---

## 🗃️ Database Schema (Prisma) — Production v3

This is the locked schema. All future changes are ADDITIVE (new tables/columns, never restructure existing).

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── IDENTITY & ACCESS ──

model User {
  id            String          @id @default(cuid())
  email         String          @unique
  passwordHash  String?
  googleId      String?         @unique
  name          String?
  emailVerified Boolean         @default(false)
  isSuperAdmin  Boolean         @default(false)
  preferredLanguage String      @default("en")    // for Phase 2 multilingual
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  lastLoginAt   DateTime?
  deletedAt     DateTime?

  memberships     Membership[]
  invitationsSent OrgInvitation[] @relation("InvitedBy")

  @@index([googleId])
  @@index([email])
}

model Brand {
  id           String         @id @default(cuid())
  slug         String         @unique
  companyName  String
  primaryEmail String
  billingEmail String?
  website      String?
  whatsappBusinessId String?                       // Phase 2 — WhatsApp integration
  preferredLanguage String     @default("en")      // Phase 2 — brand's UI language
  trialEndsAt  DateTime?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  deletedAt    DateTime?

  memberships       Membership[]
  apiKeys           ApiKey[]
  products          Product[]
  sessions          ARSession[]
  events            AREvent[]
  conversions       ConversionEvent[]              // Phase 2
  subscription      Subscription?
  invoices          Invoice[]
  invitations       OrgInvitation[]
  outboundWebhooks  OutboundWebhook[]              // Phase 2

  @@index([slug])
  @@index([deletedAt])
}

model Membership {
  id        String   @id @default(cuid())
  userId    String
  brandId   String
  role      Role     @default(MEMBER)
  invitedBy String?
  joinedAt  DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  brand     Brand    @relation(fields: [brandId], references: [id], onDelete: Cascade)

  @@unique([userId, brandId])
  @@index([brandId])
  @@index([userId])
}

model OrgInvitation {
  id          String           @id @default(cuid())
  brandId     String
  email       String
  role        Role             @default(MEMBER)
  token       String           @unique
  invitedById String
  status      InvitationStatus @default(PENDING)
  expiresAt   DateTime
  acceptedAt  DateTime?
  createdAt   DateTime         @default(now())

  brand       Brand @relation(fields: [brandId], references: [id], onDelete: Cascade)
  invitedBy   User  @relation("InvitedBy", fields: [invitedById], references: [id])

  @@unique([brandId, email])
  @@index([brandId])
  @@index([email])
  @@index([token])
}

model ApiKey {
  id         String    @id @default(cuid())
  brandId    String
  keyHash    String    @unique
  keyPrefix  String
  name       String?
  scopes     String[]  @default([])
  lastUsedAt DateTime?
  expiresAt  DateTime?
  revokedAt  DateTime?
  createdAt  DateTime  @default(now())

  brand      Brand     @relation(fields: [brandId], references: [id], onDelete: Cascade)

  @@index([brandId])
  @@index([keyHash])
}

// ── PRODUCTS ──

model Product {
  id         String        @id @default(cuid())
  brandId    String
  name       String
  slug       String
  arMode     String        @default("placement")  // 'placement' | 'tryon-face' | 'tryon-wrist' | 'tryon-hand' | 'tryon-foot' | 'tryon-photo' | 'multi-scene' | 'audio-preview'
  category   String?                              // 'furniture', 'eyewear', 'apparel', 'jewelry', 'watches', etc.
  status     ProductStatus @default(PENDING)
  glbUrl     String?                              // primary GLB (placement, Android WebXR, desktop)
  glbSizeKb  Int?
  usdzUrl    String?                              // v5.16: iOS AR Quick Look (Apple-native USDZ from Meshy)
  usdzSizeKb Int?
  photoUrls  String[]      @default([])
  widthCm    Float?
  heightCm   Float?
  depthCm    Float?
  variants   Json?
  metadata   Json?
  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt
  deletedAt  DateTime?

  brand      Brand           @relation(fields: [brandId], references: [id], onDelete: Cascade)
  assets     ProductAsset[]                       // Phase 3 — multi-asset products
  sessions   ARSession[]
  events     AREvent[]
  conversions ConversionEvent[]                   // Phase 2

  @@unique([brandId, slug])
  @@index([brandId, status])
  @@index([brandId, deletedAt])
  @@index([brandId, arMode])
}

// Multi-asset products (e.g., a watch needs placement GLB + wrist try-on GLB)
model ProductAsset {
  id          String      @id @default(cuid())
  productId   String
  assetType   String                              // 'glb-placement', 'glb-face-mask', 'glb-wrist-mount', 'photo-tryon-prompt', 'thumbnail'
  url         String?
  metadata    Json?                               // mode-specific config
  status      AssetStatus @default(PENDING)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  product     Product     @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId, assetType])
}

// ── ANALYTICS (split: session vs event) ──

model ARSession {
  id           String     @id @default(cuid())
  sessionId    String     @unique
  brandId      String
  productId    String?
  arMode       String                              // which mode the session used
  startedAt    DateTime   @default(now())
  endedAt      DateTime?
  durationMs   Int?
  deviceType   String                              // 'ios', 'android', 'desktop'
  countryCode  String?
  city         String?
  language     String     @default("en")           // detected language
  userAgent    String?
  referrer     String?
  didPlace     Boolean    @default(false)
  didAddToCart Boolean    @default(false)
  productCount Int        @default(0)

  brand        Brand      @relation(fields: [brandId], references: [id], onDelete: Cascade)
  product      Product?   @relation(fields: [productId], references: [id], onDelete: SetNull)
  events       AREvent[]

  @@index([brandId, startedAt])
  @@index([productId, startedAt])
  @@index([brandId, arMode])
}

model AREvent {
  id         String    @id @default(cuid())
  sessionId  String
  brandId    String
  productId  String?
  eventType  String                                // 'ar_opened', 'ar_placed', 'variant_changed', 'shared', etc.
  payload    Json?
  timestamp  DateTime  @default(now())

  session    ARSession @relation(fields: [sessionId], references: [sessionId], onDelete: Cascade)
  brand      Brand     @relation(fields: [brandId], references: [id], onDelete: Cascade)
  product    Product?  @relation(fields: [productId], references: [id], onDelete: SetNull)

  @@index([brandId, timestamp])
  @@index([sessionId])
  @@index([eventType, timestamp])
}

// Conversion tracking (Phase 2)
model ConversionEvent {
  id            String      @id @default(cuid())
  brandId       String
  productId     String?
  sessionId     String?
  eventType     String                              // 'page_view', 'add_to_cart', 'purchase', 'return'
  amountInPaise Int?                                // for purchases
  metadata      Json?                               // SKU variant, quantity, etc.
  source        String                              // 'ar' | 'non_ar'
  timestamp     DateTime    @default(now())

  brand         Brand       @relation(fields: [brandId], references: [id], onDelete: Cascade)
  product       Product?    @relation(fields: [productId], references: [id], onDelete: SetNull)

  @@index([brandId, timestamp])
  @@index([brandId, eventType, timestamp])
  @@index([sessionId])
}

// ── BILLING ──

model PricingPlan {
  id            String         @id @default(cuid())
  code          String         @unique
  tier          Plan
  displayName   String
  amountInPaise Int                                 // 399900 for ₹3,999 — NEVER float
  currency      String         @default("INR")
  billingPeriod BillingPeriod
  sessionLimit  Int
  productLimit  Int
  arModesIncluded String[]     @default([])         // which arModes the plan includes
  features      String[]       @default([])
  isPublic      Boolean        @default(true)
  createdAt     DateTime       @default(now())
  deprecatedAt  DateTime?

  subscriptions Subscription[]
}

model Subscription {
  id                 String             @id @default(cuid())
  brandId            String             @unique
  pricingPlanId      String
  razorpaySubId      String             @unique
  status             SubscriptionStatus
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  cancelAtPeriodEnd  Boolean            @default(false)
  canceledAt         DateTime?
  trialEndsAt        DateTime?
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  brand              Brand              @relation(fields: [brandId], references: [id], onDelete: Cascade)
  pricingPlan        PricingPlan        @relation(fields: [pricingPlanId], references: [id])
  invoices           Invoice[]

  @@index([status])
  @@index([currentPeriodEnd])
}

model Invoice {
  id                String        @id @default(cuid())
  brandId           String
  subscriptionId    String
  razorpayInvoiceId String?       @unique
  amountInPaise     Int
  currency          String        @default("INR")
  status            InvoiceStatus
  periodStart       DateTime
  periodEnd         DateTime
  paidAt            DateTime?
  invoiceUrl        String?
  createdAt         DateTime      @default(now())

  brand             Brand         @relation(fields: [brandId], references: [id], onDelete: Cascade)
  subscription      Subscription  @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  @@index([brandId, createdAt])
}

// ── WEBHOOKS ──

// Inbound (Razorpay, Shopify) — idempotency log
model InboundWebhookEvent {
  id          String    @id @default(cuid())
  provider    String                                // 'razorpay', 'shopify'
  eventId     String                                // dedup key
  payload     Json
  processedAt DateTime?
  createdAt   DateTime  @default(now())

  @@unique([provider, eventId])
  @@index([provider, processedAt])
}

// Outbound (Phase 2) — brand systems get notified of Rekaman events
model OutboundWebhook {
  id            String    @id @default(cuid())
  brandId       String
  url           String
  secret        String                              // HMAC signing key
  events        String[]                            // ['ar.session.completed', 'ar.placed', 'product.ready']
  isActive      Boolean   @default(true)
  failureCount  Int       @default(0)
  lastFailedAt  DateTime?
  createdAt     DateTime  @default(now())

  brand         Brand     @relation(fields: [brandId], references: [id], onDelete: Cascade)
  deliveries    OutboundWebhookDelivery[]

  @@index([brandId])
}

model OutboundWebhookDelivery {
  id           String   @id @default(cuid())
  webhookId    String
  eventType    String
  payload      Json
  statusCode   Int?
  responseBody String?
  attempt      Int      @default(1)
  deliveredAt  DateTime?
  createdAt    DateTime @default(now())

  webhook      OutboundWebhook @relation(fields: [webhookId], references: [id], onDelete: Cascade)

  @@index([webhookId, createdAt])
}

// ── AUDIT (Phase 2) ──

model AuditLog {
  id         String   @id @default(cuid())
  brandId    String?
  userId     String?
  action     String                                // 'product.deleted', 'apikey.revoked'
  entityType String?
  entityId   String?
  diff       Json?                                 // before/after
  ipAddress  String?
  userAgent  String?
  timestamp  DateTime @default(now())

  @@index([brandId, timestamp])
  @@index([entityType, entityId])
}

// ── ENUMS ──

enum Role { OWNER ADMIN MEMBER }
enum InvitationStatus { PENDING ACCEPTED EXPIRED REVOKED }
enum Plan { STARTER PRO ENTERPRISE CUSTOM }
enum BillingPeriod { MONTHLY YEARLY }
enum ProductStatus { PENDING PROCESSING READY FAILED ARCHIVED }
enum AssetStatus { PENDING PROCESSING READY FAILED }
enum SubscriptionStatus { TRIALING ACTIVE PAST_DUE CANCELED PAUSED EXPIRED }
enum InvoiceStatus { DRAFT PENDING PAID FAILED REFUNDED }
```

### Schema principles (NEVER VIOLATE)
- **Money in paise (`Int`), never `Float`.** Float arithmetic on money compounds errors.
- **Append-only event logs.** `AREvent`, `ConversionEvent`, `AuditLog` rows never updated/deleted.
- **Soft deletes on Brand, Product, User.** Restoreable, GDPR/DPDP-compliant.
- **Cascade on Brand deletion.** All related data goes with the brand.
- **Indexes on every `brandId` column.** Query performance scales with data.
- **Denormalized fields where it matters:** `Brand.primaryEmail`, `AREvent.brandId`.
- **Schema is additive.** New features add tables/columns. Never restructure existing.

---

## 📚 The Complete Feature Catalog

Organized by what Rekaman offers, broken down by phase.

### 🎯 AR Modes (Shopper Experiences)

| Mode | Phase | Tech Stack | Best For |
|---|---|---|---|
| **Placement AR** | 1 (MVP) | WebXR + Three.js + GLB | Furniture, decor, electronics |
| **iOS AR Quick Look** | 1 (MVP) | Native iOS handoff | All products on iPhone |
| **Face Try-On** | 3 | MediaPipe FaceMesh + Three.js | Glasses, sunglasses, earrings, hats |
| **Wrist Try-On** | 3 | MediaPipe Hand + Three.js | Watches, bracelets |
| **Hand Try-On** | 3 | MediaPipe Hand + Three.js | Rings, bangles |
| **Foot Try-On** | 3 | Foot tracking + Three.js | Shoes, sandals |
| **Photo Try-On (AI)** | 4 | Replicate/Modal + diffusion models | Clothing, sarees, kurtas |
| **Virtual Models** | 4 | Pre-baked AI generation | Privacy-friendly clothing alternative |
| **Multi-Product Scenes** | 3 | Composed placement AR | Room planning, bundles |
| **Audio Preview** | 5 | Spatial audio simulation | Speakers, soundbars |
| **Texture/Material Swap** | 3 | Live shader manipulation | Customizable furniture |
| **AR Lite (low-end Android)** | 2 | 360° rotating + 2D overlay | Cheap phones without WebXR |

### 🏢 Brand-Facing Features (Dashboard)

#### Phase 1 (MVP, Months 1-3)
- Auth: signup/login + Google OAuth
- Multi-brand membership (Slack-style switcher when needed)
- Photo upload + AI 3D generation (Meshy)
- Product CRUD with status tracking
- 3D preview before approval
- Embed code generator (Shopify / WooCommerce / Custom tabs)
- API key management (create, revoke, rotate)
- Basic analytics (sessions, placements)

#### Phase 2 (Months 4-6 — Indian Differentiators)
- **Multi-lingual AR UI** (Hindi, Tamil, Telugu, Marathi, Bengali, Kannada, Gujarati)
- **WhatsApp-native AR sharing** (link previews work in WhatsApp)
- **Low-end Android fallback** (AR Lite mode)
- **AR-driven upsell engine** (suggest complementary products in AR)
- **Returns reduction analytics** (compare with-AR vs without-AR)
- **Heatmaps of AR engagement** (where shoppers look at the model)
- **A/B testing for AR button placement**
- **Bulk CSV import** + bulk generation
- **Variant management** (5 fabric colors → 5 GLBs, switch in AR)
- **Branded AR button customization** (colors, fonts)
- **Outbound webhooks** to brand's systems
- **Public status page** (`status.rekaman.io`)
- **Public API documentation** (`docs.rekaman.io`)
- **Audit log** (compliance)
- **GDPR/DPDP data export + delete**
- **Per-plan rate limiting**
- **WhatsApp Business analytics digest** (daily summary to brand owner)

#### Phase 3 (Months 7-12 — Try-On Expansion)
- Face Try-On (glasses, jewelry, hats)
- Wrist Try-On (watches, bracelets)
- Hand Try-On (rings)
- Multi-product scenes ("Room Builder")
- Festival/cultural templates (Diwali, weddings, Christmas)
- Live shopping mode (shopper + sales rep view together via WebRTC)
- AR product comparison (place 2 products side by side)
- Auto-generated product pages (AI writes copy from photos)
- Approval workflows (senior approves before live)
- Custom domains (`ar.brandsite.com/v1/sdk.js`)

#### Phase 4 (Months 13-18 — AI Try-On + International)
- AI photo try-on for clothing
- Virtual model alternative (privacy-friendly)
- PII handling infrastructure
- Multi-region API deployment (Fly.io)
- Stripe billing for international
- SOC 2 / ISO 27001 prep
- SSO (SAML, Google Workspace)
- Smart sizing recommendations

#### Phase 5 (Year 2-3 — Platform Maturity)
- Apple Vision Pro app (visionOS)
- Voice-driven AR controls
- Audio AR (spatial sound preview for speakers)
- Public app marketplace
- Open API ecosystem
- Customer support AR (assembly help overlay)
- Augmented packaging (scan box → assembly instructions)

### 🛍️ Shopper-Facing Features (SDK Runtime)

#### Phase 1 (MVP)
- "View in your room" button (customizable)
- iOS AR Quick Look + Android WebXR routing
- Tap-to-place with reticle
- Single-replacement placement mode
- Real-world scale rendering
- Pre-AR explainer (first-time UX)

#### Phase 2
- **Multilingual AR UI** (regional Indian languages)
- **Pinch to scale, twist to rotate**
- **Drag placed model to reposition**
- **Variant switcher in AR**
- **Save AR scene for later** (wishlist)
- **Share AR scene** via QR code or WhatsApp link
- **Shadows on floor** (realism boost)
- **AR Lite fallback** for low-end phones

#### Phase 3
- **"Try with these" suggestions** (cross-sell in AR)
- **Lighting estimation** (realistic environment matching)
- **Multi-product placement** (sofa + table + lamp)
- **AR comparison view** (side-by-side)

#### Phase 4
- **Photo upload for clothing try-on**
- **AI-generated "you in this outfit"**
- **Virtual model selection** (pick body type closest to yours)

#### Phase 5
- **Voice-driven controls** ("make it bigger", "show in red")
- **Live shopping with sales rep**

### 🔧 Platform Features (Infrastructure)

| Feature | Phase | Notes |
|---|---|---|
| Multi-tenant isolation (3 layers) | 1 | Built Week 3 |
| API key management with rotation | 1 | Built Week 4 |
| Razorpay subscriptions | 1 | Week 10 |
| Plan gating middleware | 1 | Week 10 |
| Webhook ingestion (Razorpay + Shopify) | 1 | Week 10 |
| `/v1/` API versioning | 1 | Week 4 |
| Outbound webhooks | 2 | Month 4-5 |
| Per-plan rate limiting | 2 | Week 10+ (with Redis) |
| Public status page | 2 | Month 5 |
| Public API docs | 2 | Month 5 |
| GDPR/DPDP compliance endpoints | 2 | Month 4-5 |
| Audit log | 2 | Month 4-5 |
| Disaster recovery procedure | 2 | Month 6 |
| Customer health monitoring | 2 | Month 6 (internal tool) |
| PII handling for try-on photos | 3 | Month 9+ |
| Multi-region deployment | 4 | Month 13+ |
| SOC 2 / ISO 27001 | 5 | Year 2+ |
| SLAs for enterprise | 4 | When first ₹50K+ deal lands |

---

## 🇮🇳 Indian-Market Differentiation (Defensibility)

These are unique to Indian e-commerce and form Rekaman's competitive moat. International competitors (Threekit, Zakeke) won't bother building these.

### 1. WhatsApp-Native AR Sharing (Phase 2)
Brand sends product link via WhatsApp Business → recipient taps → AR opens in WhatsApp's WebView. No app install. India is WhatsApp-first.

### 2. Multi-Lingual AR UI (Phase 2)
SDK auto-detects browser language → "View in your room" becomes "अपने कमरे में देखें" or "உங்கள் அறையில் பார்க்கவும்". 5 languages launch (Hindi, Tamil, Telugu, Marathi, Bengali). 3 days of work.

### 3. Festival/Cultural AR Templates (Phase 3)
Pre-built multi-product scenes for Diwali, weddings, Pongal, Christmas, Eid. Brands customize products that fit each occasion.

### 4. Low-End Android Fallback (Phase 2)
200M+ Indian Androids run cheap phones without WebXR. Detect → show 360° rotating product + draggable 2D overlay. Better than nothing.

### 5. WhatsApp + UPI Checkout from AR (Phase 3)
Shopper sees product in AR → "Buy now" → opens UPI app → pays. Skips brand's checkout entirely (with permission).

### 6. AR Analytics in Brand's WhatsApp/Slack (Phase 2)
Daily message: "Yesterday, 47 shoppers tried AR. 32 placed Oslo Sofa. Estimated revenue impact: ₹1,15,000."

### 7. Post-AR SMS Follow-up (Phase 2)
Shopper places product, doesn't buy → automated SMS in 24h: "Liked the Oslo Sofa? Code OSLO500 expires today."

---

## 🚫 The Anti-Roadmap (Things to NEVER Build)

Equally important as the roadmap. These are explicitly forbidden:

- **Custom 3D modeling tool** — we're not Vectary
- **Consumer marketplace** — different business, kills B2B focus
- **Custom branded apps for individual brands** — kills 4 months for ₹10L revenue
- **Real-time multiplayer AR** — solves zero customer problems
- **Vision Pro app first** — ~10K units in India, Year 2-3 problem
- **Our own 3D AI model** — Meshy/Hunyuan/TripoSR exist
- **Real-time full-body clothing AR** — companies with $200M+ have failed
- **NFT/Web3/blockchain** — pure distraction for Indian SaaS
- **Generic chatbot** — don't try to be Intercom
- **SEO tools for brands** — different product, different sales motion
- **Email marketing platform** — different product, refer to Mailmodo/Klaviyo
- **Shopify alternative** — stay a layer ABOVE Shopify, not competitor TO it

---

## 🗺️ The 5-Phase Roadmap

### Phase 1: MVP — Months 1-3 ✅ (in progress)
**Goal:** Ship placement AR, get 4-5 paying customers

- ✅ Week 1: Three.js + GLB foundations
- ✅ Week 2: WebXR + AR placement (Android Chrome + iOS Quick Look)
- ✅ Week 3: Production backend (multi-tenant, deployed to Railway)
- ✅ Week 4: SDK + CloudFront/S3 CDN + Public AR endpoint + Events ingestion + v3 schema hooks + Vercel demo. End-to-end AR working on Android Chrome and iOS Safari from the live demo URL.
- **Week 5-6 (current): Meshy.ai + first paying customer (Concierge MVP)**
- Week 7-9: Dashboard MVP + analytics
- Week 10-12: Razorpay + plan gating + 4 paying customers, ₹40K MRR

### Phase 2: Indian-Market Differentiation — Months 4-6
**Goal:** ₹3-5L MRR, 15-25 customers, lock in defensibility

- Multi-lingual AR UI (Hindi, Tamil, Telugu)
- Low-end Android fallback (AR Lite)
- WhatsApp-native AR sharing
- AR-driven upsell suggestions
- Heatmaps + advanced analytics
- Public status page + docs
- Audit log + GDPR/DPDP endpoints
- Outbound webhooks
- Bulk CSV import for catalogs
- Returns reduction analytics
- Product Hunt launch

### Phase 3: Try-On Expansion — Months 7-12
**Goal:** ₹15-25L MRR, 50+ customers across 3 verticals

- Face Try-On (glasses, jewelry, hats)
- Wrist Try-On (watches)
- Hand Try-On (rings)
- Multi-product scenes
- Festival/cultural templates
- Live shopping mode
- Auto-generated product pages
- Approval workflows
- Conversion event tracking + ROI dashboard

### Phase 4: AI Clothing + International — Months 13-18
**Goal:** ₹30-50L MRR, 100+ customers, Series A closed

- AI photo try-on for clothing
- Virtual model alternative
- PII handling infrastructure
- Multi-region deployment (Fly.io)
- Stripe for international
- SOC 2 prep
- SAML SSO

### Phase 5: Platform Maturity — Year 2-3
**Goal:** ₹2-3 Cr MRR, category leader

- Apple Vision Pro app
- Live shopping mode (WebRTC)
- Voice-driven AR
- Audio AR for speakers
- Open API ecosystem
- Apple/Shopify deep integrations
- Public app marketplace

---

## 🎯 Dashboard Pages Map

### MVP (Weeks 7-12)
- `/signup`, `/login`, `/forgot-password`
- `/onboarding` (3-step wizard)
- `/brands` (brand switcher when user has multiple memberships)
- `/products` (list with status badges)
- `/products/new` (upload flow)
- `/products/:id` (preview, approve, embed code)
- `/products/:id/analytics`
- `/analytics` (dashboard-wide)
- `/install` (Shopify / WooCommerce / Custom tabs)
- `/api-keys` (create, revoke, view usage)
- `/team` (basic — invite via email)
- `/settings`, `/billing`

### Phase 2 (Months 4-6)
- `/team` (advanced — roles, audit log)
- `/variants` (colors, materials)
- `/bulk-upload` (CSV)
- `/integrations` (Shopify, WhatsApp, Slack, webhooks)
- `/branding` (AR button customization)
- `/webhooks` (outbound webhook management)
- `/insights` (returns reduction, ROI)
- `/audit` (compliance log)

### Phase 3 (Months 7-12)
- `/scenes` (multi-product scene composer)
- `/templates` (festival/cultural templates)
- `/experiments` (A/B testing)
- `/live` (live shopping mode)
- `/api-docs` (developer documentation)

---

## 🔌 Key API Endpoints

All routes prefixed with `/v1/` for future versioning.

```
# Auth (rate-limited: 5/hr per IP)
POST   /v1/auth/signup
POST   /v1/auth/login
POST   /v1/auth/google
POST   /v1/auth/logout
GET    /v1/auth/me
POST   /v1/auth/switch-brand/:brandId

# Products (authenticated, brand-scoped)
GET    /v1/products
POST   /v1/products
GET    /v1/products/:id
PATCH  /v1/products/:id
DELETE /v1/products/:id
POST   /v1/products/:id/upload-url
POST   /v1/products/:id/generate
GET    /v1/products/:id/status
GET    /v1/products/:id/embed-code
GET    /v1/products/:id/assets         # Phase 3 — multi-asset products
POST   /v1/products/:id/assets

# API Keys
GET    /v1/api-keys
POST   /v1/api-keys
DELETE /v1/api-keys/:id

# Public AR (API-key authenticated, rate-limited, cached)
GET    /v1/ar/:apiKey/:productSlug

# Events (SDK ingestion)
POST   /v1/events                       # batch AR session events

# Conversions (Phase 2 — brand-side)
POST   /v1/conversions                  # purchases, returns, etc.

# Analytics (authenticated)
GET    /v1/analytics/summary
GET    /v1/analytics/roi
GET    /v1/analytics/products/:id
GET    /v1/analytics/heatmaps           # Phase 2

# Billing (Week 10)
POST   /v1/billing/subscribe
GET    /v1/billing/portal
GET    /v1/billing/invoices

# Webhooks
POST   /v1/webhooks/razorpay            # Inbound (idempotent)
POST   /v1/webhooks/shopify             # Phase 2
GET    /v1/outbound-webhooks            # Phase 2 — outbound mgmt
POST   /v1/outbound-webhooks
DELETE /v1/outbound-webhooks/:id

# Team (Week 8+)
GET    /v1/team
POST   /v1/team/invite
POST   /v1/team/accept
PATCH  /v1/team/:userId/role
DELETE /v1/team/:userId

# Compliance (Phase 2)
POST   /v1/me/export                    # GDPR/DPDP data export
DELETE /v1/me/account                   # right-to-be-forgotten
GET    /v1/audit                        # audit log

# System
GET    /health                          # always 200, no auth, no version prefix
GET    /metrics                         # uptime, db status, version
```

### Universal error response format
```json
{
  "error": "EMAIL_EXISTS",
  "message": "Human-readable message",
  "details": {...},
  "requestId": "abc-123"
}
```

---

## 💰 Pricing (INR — India First)

Stored dynamically in `PricingPlan` table — pricing experiments without migrations.

### Phase 1 Pricing
| Plan | Price | Sessions | Products | AR Modes | Key Features |
|------|-------|----------|----------|----------|--------------|
| Starter | ₹3,999/mo | 500 | 10 | Placement only | Basic analytics, email support |
| Pro | ₹12,999/mo | 5,000 | 50 | Placement only | Full analytics, ROI, Shopify app |
| Enterprise | ₹49,999+/mo | Unlimited | Unlimited | All MVP modes | White-label SDK, dedicated support |

### Phase 3 Pricing (with try-on)
| Plan | Price | Sessions | Products | AR Modes | Key Features |
|------|-------|----------|----------|----------|--------------|
| Starter | ₹3,999/mo | 500 | 10 | Placement | Basic analytics |
| Pro | ₹12,999/mo | 5,000 | 50 | Placement + Face Try-On | Full analytics, Shopify app |
| Pro+ | ₹19,999/mo | 10,000 | 100 | All modes incl. wrist/hand try-on | Multi-product scenes |
| Enterprise | ₹49,999+/mo | Unlimited | Unlimited | All modes + AI photo try-on | White-label, SLA |

### Add-ons
- Manual 3D refinement: ₹500/product
- Extra AI generation credits: ₹99/model
- Annual plan: 2 months free
- AI photo try-on (Phase 4): ₹2-5 per generated image

**All amounts stored as paise (Int). Never use Float for money.**

---

## 🏆 Competitors & Positioning

| Competitor | Price | Weakness | Our Edge |
|------------|-------|----------|----------|
| Threekit | $50K+/yr | 6-month onboarding, US-focused | 20-min setup, ₹4K/mo, India-native |
| Zakeke | $30–$200/mo | Needs existing 3D files, no try-on | AI from photos, multi-mode |
| Vectary | Free–$14/mo | Design tool, no commerce | We're a commerce platform |
| Roomle | $200–$2K/mo | Complex UX, EU-focused | Simple, India-localized |
| ModiFace | Enterprise only | L'Oréal-owned, makeup-specific | Multi-category, accessible pricing |
| Snap AR | Free | Snapchat ecosystem | We're embedded in brand's site |

**Positioning:** "The Shopify of AR" — platform layer for any Indian brand without a $500K engineering budget. Universal across platforms (Shopify, custom, anything). Multi-mode (placement, try-on, AI). India-first features (multilingual, WhatsApp, UPI).

---

## 📊 Key Metrics

### Phase 1 Targets (Months 1-3)
- MRR: ₹40K
- Paying brands: 4-5
- Placement rate: > 70%
- Conversion lift: 3-4× AR vs non-AR
- Return rate reduction: 20-25% per brand

### Phase 2 Targets (Months 4-6)
- MRR: ₹3-5L
- Paying brands: 15-25
- Indian language adoption: 30%+ of sessions
- WhatsApp share rate: 10%+ of placements

### Phase 3 Targets (Months 7-12)
- MRR: ₹15-25L
- Paying brands: 50+
- Try-on conversion lift: 4-5× (higher than placement)

### Phase 4 Targets (Months 13-18)
- MRR: ₹30-50L
- Paying brands: 100+
- International revenue: 10%+

### Phase 5 Targets (Year 2-3)
- MRR: ₹2-3 Cr
- Paying brands: 500+
- Category leadership in India

### Universal SLAs (Always)
- API uptime: 99.5% (Pro), 99.9% (Enterprise)
- AR session p95 latency: < 2 seconds
- Churn: < 5%/month
- LTV:CAC: > 10:1

---

## 📁 Monorepo Structure

```
rekaman/
├── apps/
│   ├── dashboard/              # Next.js 14 App Router (Vercel)
│   ├── landing/                # rekaman.io marketing site (Vercel)
│   └── demo/                   # Static AR demo pages (Vercel)
├── packages/
│   ├── sdk/                    # Embeddable JS SDK (esbuild → IIFE → CloudFront)
│   │   ├── src/
│   │   │   ├── index.ts        # Main IIFE entry, exposes window.Rekaman
│   │   │   ├── ar-launcher.ts  # Mode router
│   │   │   ├── api-client.ts   # API calls
│   │   │   ├── analytics.ts    # sendBeacon event firing
│   │   │   ├── ui.ts           # Button injection (Shadow DOM)
│   │   │   ├── i18n/           # Phase 2 — language packs
│   │   │   └── chunks/
│   │   │       ├── placement-engine.ts    # Phase 1
│   │   │       ├── face-tryon-engine.ts   # Phase 3
│   │   │       ├── wrist-tryon-engine.ts  # Phase 3
│   │   │       ├── photo-tryon-engine.ts  # Phase 4
│   │   │       └── multi-scene-engine.ts  # Phase 3
│   │   ├── build.config.ts
│   │   └── package.json
│   ├── ar-engine/              # Shared Three.js + WebXR utilities
│   └── shared-types/           # Types shared between server + dashboard + sdk
├── server/                     # Node.js + Express (Railway)
│   ├── src/
│   │   ├── modules/            # auth, products, apiKeys, publicAr, arSessions, conversions, generation, billing, webhooks, outboundWebhooks, audit, team
│   │   ├── workers/
│   │   ├── middleware/
│   │   ├── shared/
│   │   ├── __tests__/
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       └── seed.ts
│   └── package.json
├── .github/workflows/ci.yml
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── package.json
├── CLAUDE.md                   # this file
└── REKAMAN_ROADMAP.md          # long-horizon strategic doc
```

---

## 🤖 How to Work with Claude on This Project

### Always include in prompts
1. Which layer: `[SDK]` / `[DASHBOARD]` / `[BACKEND]` / `[AR ENGINE]` / `[AI PIPELINE]` / `[BILLING]` / `[STRATEGY]` / `[REVIEW]` / `[DEBUG]`
2. What's already built in that area
3. Specific error or requirement
4. Tech stack context if unclear

### Great prompt templates
- `[AR ENGINE] Write the MediaPipe FaceMesh + Three.js code for face try-on with glasses.`
- `[BACKEND] Review this Prisma query for tenant leak risk — must filter by req.brandId.`
- `[AI PIPELINE] Write the BullMQ worker for Replicate-based AI photo try-on.`
- `[SDK] How do I lazy-load the wrist-tryon chunk only when arMode === 'tryon-wrist'?`
- `[STRATEGY] Should we ship Hindi UI in Phase 2 Week 1 or Week 4?`

### Claude's expected behavior
- Assume modular monolith with strict module boundaries
- Assume multi-tenant with `req.brandId` injection from JWT
- Assume Membership-based (User can belong to multiple Brands)
- Default to TypeScript + Zod validation + typed DomainErrors
- Money is always in paise (Int), never Float
- Repository functions ALWAYS take brandId as required argument
- Prefer boring, battle-tested tech
- Push back on premature abstraction or microservices
- Reference this file's decisions rather than suggesting new stacks
- Reference REKAMAN_ROADMAP.md for long-horizon questions

---

## 📍 Current Status

*Update every Sunday and after every major milestone.*

- **Week/Month:** Week 7 Day 1-2 closed (May 16-17, 2026)
- **Last completed:** Week 7 Day 1-2 — USDZ pipeline shipped + verified end-to-end on iPhone 13 (Apple AR Quick Look opens armchair, no black flash) + Android Chrome (WebXR placement regression-clean). Status endpoint bug (usdzUrl/usdzSizeKb missing from spread) caught + fixed. Demo wired to USDZ via `update-demo-with-usdz.mjs`. Founder-location sweep completed: marketing copy uses "Tamil Nadu, India", legal blocks use "Thanjavur, Tamil Nadu". DNS for `rekaman.io` + `demo.rekaman.io` wired + verified. Razorpay website verification submitted + approved. Vercel apex flipped to primary (www now 308→apex per SEO best practice). `privacy@rekaman.io` Google Workspace alias added (closes DPDP Act 2023 §10 compliance gap). All "rekaman-demo.vercel.app" references in codebase swept to "demo.rekaman.io". 4 commits pushed: 16b5dca (USDZ feat) → 19cc08f (v5.16 docs) → 0aadc9e (status-endpoint bug fix + Thanjavur sweep) → 98c8ae3 (demo URL refs).
- **Currently working on:** Week 7 Day 3 starts tomorrow — environment isolation (Railway staging env + long-lived Neon staging branch + GitHub Actions branch-based deploy where `dev`→staging, `main`→prod). Closes the "bad git push breaks live customer AR" gap BEFORE customer #1 onboards. Decision locked May 17 — chose staging-first over outreach-first since fixing the gap pre-emptively is cheaper than recovering from a prod incident after a paying brand is live. ~2-3 hrs active work. Outreach (30 cold emails + 15 LinkedIn DMs) starts Day 5 once staging is green.
- **Blocked on:** Nothing technical. Pvt Ltd registration still paused ~5 days awaiting physical PAN reissue (no business impact — Concierge MVP runs on sole-prop Razorpay).
- **Next milestone:** Week 7 Day 5-7 — first ₹3,999/mo paying brand onboarded via Concierge MVP (now demo-able on both iPhone + Android, materially strengthens close).
- **Current MRR:** ₹0
- **Paying clients:** 0
- **Deployed URLs:**
  - API: https://api.rekaman.io ✅ (Railway, custom domain live since Week 5; old `api-production-0a54.up.railway.app` still routes for backward compat)
  - Worker: deployed on Railway (no public URL — internal only, queue-driven). Subscribed to `bull:generation` since Week 5 close.
  - SDK CDN: https://cdn.rekaman.io ✅ (CloudFront → S3 ap-south-1, ACM wildcard cert `*.rekaman.io`; old `d3ens3al2ub47k.cloudfront.net` still routes for backward compat)
    - `/v1/sdk.js` — main bundle, 7.1 KB raw / 3.0 KB gzipped (loads chunks via `<script>` tag injection)
    - `/v1/placement-engine-v4.js` — Three.js + WebXR chunk, 572 KB raw / 149.8 KB gzipped (current). v1 deprecated (dom-overlay bug), v2 deprecated (Railway URL baked in), v3 deprecated (Week 6 Day 1: model floated below floor + followed camera). Older versions remain in S3 as fallbacks for SDKs still in browser cache.
  - Products S3: `rekaman-products-prod-975050270919-ap-south-1-an` ✅ public-read (Phase 1 Path A); canonical demo GLB at `cmou3lwe9000337mk8223jby3/v1/model.glb`
  - Demo: https://demo.rekaman.io/oslo-sofa ✅ live on custom domain (Vercel DNS wired May 17). Old `rekaman-demo.vercel.app/oslo-sofa` still resolves for backward compat. Shows real Meshy armchair with USDZ (iPhone) + GLB (Android) — verified end-to-end on iPhone 13 + Android Chrome May 17.
  - Dashboard: not live (Week 7-12 Plan A buildout)
  - Landing: https://rekaman.io ✅ live (Vercel, custom domain wired May 17, ACM SSL. Apex is primary, `www.rekaman.io` 308→apex per SEO best practice. 6 sections + 4 compliance pages — Privacy, Terms, Refund, Contact — all DPDP-compliant.)
  - Razorpay: https://dashboard.razorpay.com — sole-prop merchant `SIzmIUZLAwBxmz`. Website `https://rekaman.io` submitted + approved May 17. Live mode unlocked. Migration to Pvt Ltd post-COI per Plan A.

---

## 🌐 Live URLs

- Landing: `rekaman.io` ✅ live (Vercel, custom domain wired May 17, apex primary, ACM SSL)
- Dashboard: `dashboard.rekaman.io` (Week 7+ Plan A)
- API: `api.rekaman.io` ✅ live (Railway, TLS via Let's Encrypt)
- CDN: `cdn.rekaman.io` ✅ live (CloudFront, TLS via ACM `*.rekaman.io` cert)
- Demo: `demo.rekaman.io` ✅ live (Vercel, custom domain wired May 17, Week 7 Day 1)
- Status: `status.rekaman.io` (Phase 2 / Month 5)
- Docs: `docs.rekaman.io` (Phase 2 / Month 5)
- SDK global: `window.Rekaman`
- GitHub: private monorepo at `github.com/rekaman` (org reserved Week 6)

---

## ✅ Immediate Next Actions (Week 6 — May 12-18, 2026)

### Day 1 (Mon May 12) — Unblock everything

1. **Razorpay Rize signup** (~15 min) — visit `razorpay.com/rize/company-registration/private-limited/`, fill inquiry form, choose "Private Limited" + "₹10,000 paid-up capital", submit 4 name preferences (Rekaman Spatial / Commerce / Technologies / Innovations). Their team calls within 24 hrs.
2. **Demo fix** ✅ **DONE May 7 evening** (~2.5 hrs actual). Five bugs fixed in one shot — see v5.12 footer for full root-cause analysis. Shipped: (a) `apps/demo/public/oslo-sofa.html` polished with real Pexels armchair photo + brand bar + thumbnails + EMI/strikethrough price + trust badges + "Powered by Rekaman" attribution, (b) `server/scripts/update-demo-product.mjs` ran clean — demo brand's `oslo-sofa` product now points at canonical Meshy armchair GLB with name="Oslo Lounge Chair" + dimensions=76×78×86 cm, (c) SDK button-flicker fix in `index.ts` (defer button injection until product fetch resolves), (d) placement-engine bumped v3 → v4 with two AR fixes (model now sits on the floor via Group-wrapper preserving ground-correction; model no longer follows camera via `setReferenceSpaceType('local-floor')`). SDK rebuilt + deployed to S3 + CloudFront invalidated under `--profile rekaman`. Phone verification by founder on Android Chrome pending.
3. **Mother's documents** (~30 min) — collect PAN, Aadhaar, recent photo, address proof (her bank statement or utility bill). Scan to PDF, store in password manager.
4. **Logo selection** (10 min) — pick from 4 wordmark options (recommended: Spatial Cube). Generate SVG files at all sizes.

### Day 2-3 (Tue-Wed May 13-14) — Marketing site

5. **Marketing site `rekaman.io`** (~6-8 hours total across 2 days):
   - Single-page Next.js on Vercel (extend existing demo project OR new Next.js app)
   - 7 sections per spec (Nav/Hero/Problem/Solution/How-it-works/Pricing/Trust/Footer)
   - 4 compliance pages (Privacy/Terms/Refund/Contact via Termly templates)
   - Apply chosen logo + Fraunces+Inter typography + Rekaman purple `#5A4FCF` accent
   - Deploy to `rekaman.io` apex domain (DNS already wired)
6. **Razorpay website verification** (~5 min) — once site is live, submit `https://rekaman.io` in Razorpay Dashboard → Account & Settings → Business website details. 24-48 hr review.

### Day 3-4 (Wed-Thu May 14-15) — Brand identity

7. **LinkedIn Company Page** (~15 min) — create page, upload logo, write description, add founder profile. Cover image: clean AR demo screenshot (real armchair, NOT helmet).
8. **Reserve social handles** (~30 min) — X (`@rekaman_io`), GitHub org (`github.com/rekaman`), YouTube channel (`@rekaman`). Even dormant — prevents squatters.
9. **`server/scripts/onboard-brand.mjs`** (~3-4 hours) — YAML-driven brand provisioning script per Concierge MVP playbook. Test against staging brand. Output: brand summary, API key, integration snippet email.
10. **`onboarding-intake-form.html`** OR Google Form (~30 min) — 6-question form for brands to fill before founder runs onboard-brand.mjs.

### Day 5-7 (Fri-Sun May 16-18) — Sales execution

11. **50-brand outreach list** (~3 hours) — Indian e-commerce brands in furniture, decor, eyewear, jewelry. Chennai/Bangalore/Mumbai focus. Spreadsheet with: brand name, owner email, LinkedIn, "why I picked them" column.
12. **Demo video recording** (~2 hours) — 60-90s walkthrough on Android phone showing real armchair AR. Upload to YouTube unlisted.
13. **30 cold emails sent** (~3 hours) — personalized, demo URL + YouTube link, founder voice (no marketing speak). Track replies in spreadsheet.
14. **15 LinkedIn DMs** (~1 hour) — founder-to-founder tone, link to demo + YouTube.
15. **Book 3-5 demo calls for Week 7** — even if 1 reply, that's a win for Week 6.

### Background (in flight, no founder action this week)

- Razorpay Rize files DSC for both directors (Day 3-5)
- Razorpay Rize files SPICe+ Part A for name approval (Day 5-7)
- Razorpay reviews `rekaman.io` for verification (Day 3-4 after submission)

### Week 6 success criteria

- [ ] Demo page shows real armchair (no helmet)
- [ ] `rekaman.io` is live and looks credible
- [ ] Razorpay live mode unlocked (live keys received)
- [ ] Pvt Ltd name approval received (Razorpay Rize confirms)
- [ ] LinkedIn Company Page live with founder profile
- [ ] 30+ cold emails sent
- [ ] 3-5 demo calls booked for Week 7

If 5 of 7 criteria are met by Sunday May 18, Week 6 is a win. Plan A stays on track.

---

## 📜 Core Principles (Never Violate)

1. **Multi-tenancy from line 1** — every query filters by brandId, enforced at 3 layers
2. **SDK is a public API forever** — `data-rk-*` attributes and `/v1/` URL are frozen
3. **One-way doors get careful thought; two-way doors ship fast**
4. **Boring tech on the critical path** — no experiments in production
5. **Modular boundaries now so extraction is easy later** — enforced by ESLint
6. **Ship revenue before features** — Concierge MVP over perfect dashboard
7. **Measure before optimizing** — no premature caching/sharding/microservices
8. **Idempotent webhooks always** — every external event needs a dedup log
9. **Money in paise (Int), never Float** — no rounding errors compound
10. **Typed errors, never strings** — DomainError subclasses with stable codes
11. **Production-ready from Week 3** — patterns that work at customer #5000, not just #5
12. **Repository functions take brandId as required arg** — TypeScript prevents leaks at compile time
13. **Schema is additive** — new features add tables/columns, never restructure
14. **API versioned at `/v1/`** — future v2 lives alongside, never breaks integrations
15. **No microservices for ≥3 years** — modular monolith with extraction-ready boundaries
16. **External AI services, not in-house GPUs** — Meshy, Replicate, Modal stay external
17. **India-first features are the moat** — what international competitors won't bother building
18. **Anti-roadmap is sacred** — the things we won't build matter as much as what we will

---

## 🏢 Company Registration — Plan A (locked May 7, 2026)

Currently a **sole proprietor by default** (auto in India). Razorpay merchant account is registered as `SIVASANKARI E` with merchant ID `SIzmIUZLAwBxmz`. Test keys live (`rzp_test_Sm9b5evZZn5mWD`); live mode is gated on website verification (Razorpay won't issue live keys until `rekaman.io` is approved — Week 6).

### Structure decision: **Pvt Ltd with mother as 2nd director**

| Field | Value |
|---|---|
| Entity type | Private Limited Company |
| Director 1 | Sivasankari E (founder, 99% shareholding) |
| Director 2 | Mother (1% shareholding, passive role) |
| Registered office | Thanjavur home address (founder's actual operating location — must match where Rekaman is built; getting this wrong means a costly amendment filing post-COI) |
| Authorised capital | ₹1,00,000 |
| Paid-up capital | ₹10,000 (₹9,900 founder + ₹100 mother) |
| Service partner | **Razorpay Rize** (chosen over Vakilsearch) |
| Total cost | ~₹6,500 - ₹8,500 (₹1,499 + Govt fee + stamps) |
| Timeline | 12-18 days from form submission to bank current account |

**Why Pvt Ltd over OPC:** investors prefer it; mother as passive 2nd director adds zero ongoing complexity (signs 2-3 docs at incorporation, no quarterly involvement).

**Why Razorpay Rize over Vakilsearch:** (1) automatic Razorpay merchant migration sole-prop → Pvt Ltd (no manual support tickets), (2) ~$11K cloud credits perk (AWS/GCP/Azure/OpenAI), (3) better post-incorporation handholding, (4) Vakilsearch has reputation issues with aggressive upselling per Quora/Reddit. The ₹500-1,500 savings with Vakilsearch isn't worth the friction.

### Name preferences (in order — submit all 4 to MCA)

1. **Rekaman Spatial Private Limited** (top pick — distinctive, ties to "Spatial Commerce" tagline)
2. Rekaman Commerce Private Limited
3. Rekaman Technologies Private Limited
4. Rekaman Innovations Private Limited (backup)

**Brand name stays "Rekaman"** everywhere customer-facing — only legal docs / invoices / Razorpay checkout show "Rekaman Spatial Private Limited."

### GST decision: **DEFER to Month 4-5 (Phase 2 start)**

Skipping GST in Phase 1 by deliberate choice, NOT oversight. Rationale:
- TN service threshold is ₹20L turnover — months away even at best case
- Registering early = ~₹30-50K/year in compliance overhead (monthly GSTR-1, GSTR-3B, late penalties of ₹50-100/day per missed return) for Input Tax Credit savings of ~₹3-5K/month that only become meaningful at Phase 2 infra spend
- Customers (early Indian SMB e-commerce brands) don't require GST-registered vendors at ₹3,999 ticket size
- **Trigger to register:** ~₹15L turnover (~Phase 2, Month 4-5) or first inter-state enterprise customer

Razorpay Rize can add GST registration later for ₹1,500-2,000 when needed.

### Post-incorporation timeline (what happens automatically)

| Day | Event | Owner |
|---|---|---|
| Day 0 | Sign up + pay Razorpay Rize | Founder |
| Day 1-2 | Submit docs (PAN, Aadhaar, mother's PAN/Aadhaar, photos, address proof) | Founder + mother |
| Day 3-5 | DSC (Digital Signature Certificate) for both directors via Aadhaar e-KYC | Razorpay Rize files; founder + mother sign OTPs |
| Day 5-7 | SPICe+ Part A (name approval) filed at MCA | Razorpay Rize |
| Day 8-12 | SPICe+ Part B + MOA + AOA filed; DIN allocated; PAN + TAN applied | Razorpay Rize |
| Day 10-15 | Certificate of Incorporation (COI) issued by MCA | Issued via email |
| Day 13-18 | Open ICICI/HDFC current account in company name (video KYC) | Founder |
| Day 15-20 | Subscription money deposited (₹9,900 founder + ₹100 mother → company current account) | Founder transfers from savings |
| Day 20-25 | Auditor signs INC-20A confirming receipt of subscription | Razorpay Rize coordinates with bundled CA |
| Day 25-30 | INC-20A filed at MCA (Commencement of Business declaration) | Razorpay Rize |
| Day 30+ | Statutory auditor formally appointed via Board Resolution | Razorpay Rize compliance bundle (₹6-9K/year) |
| Post-COI | Razorpay merchant account migrated sole-prop → Pvt Ltd | Razorpay Rize emails Razorpay support; brand label changes from `SIVASANKARI E` to `REKAMAN PRIVATE LIMITED` |

**Travel required: zero.** Entire process is 100% online including bank account video KYC. ROC Chennai is the Registrar of Companies for *all* of Tamil Nadu — a Thanjavur-registered company files with ROC Chennai by jurisdiction (not by founder location), so no out-of-state coordination and no travel to Chennai is needed.

### What INC-20A is (and why it doesn't matter day-to-day)

INC-20A is a one-time MCA declaration that the company has actually started operating (subscription money received in current account). Without it filed within 180 days of COI, the company can't legally raise loans / sign contracts / issue invoices. **Razorpay Rize includes INC-20A in their package** — founder signs once with DSC, no manual portal work. Late penalty if missed: ₹50,000 + ₹1,000/day.

### What the Statutory Auditor does (and what to give them when)

A Pvt Ltd legally requires an appointed auditor (CA firm) within 30 days of incorporation. For pre-revenue startups in Year 1, their workload is light: sign INC-20A once at start, then once a year (March-September 2027) they verify books, sign annual filings (AOC-4, MGT-7), prepare Income Tax Return (ITR-6). Bundle cost: **₹6,000-9,000/year** (Razorpay Rize compliance plan, recommended for minimum-hassle path).

**Founder responsibility per FY:** maintain a Google Drive folder `Rekaman/Finance/FY-2026-27/` and dump every bill, invoice, bank statement, Razorpay payout report into it as it comes in. In April 2027, the auditor accesses the folder and prepares everything. No active monthly engagement needed.

### Phase 1.5: post-COI items (Months 2-3, after Pvt Ltd is live)

- Apply for **DPIIT Startup India recognition** (free online, 1-3 days, gives tax benefits + faster GST registration when needed)
- Apply for **MSME / Udyam registration** (free online, ~10 min, priority bank loans + govt subsidies)
- File **trademark for "Rekaman"** wordmark (Razorpay Rize add-on or via local TM agent ~₹6,500)

**No international entity** for Year 1 — Indian Pvt Ltd is the correct starting structure. International expansion (Stripe + multi-currency + UK/US/UAE customers) is a Phase 4 problem (Months 13-18).

---

## 🎨 Brand Identity (locked May 7, 2026)

### Logo direction

**Wordmark approach** — full custom design deferred to Phase 2-3 when revenue justifies a real designer (₹15-50K). For Phase 1, distinctive wordmark in a free Google Font is significantly better than mediocre custom logo.

Four candidate wordmarks designed (Claude-generated SVG, May 7 2026):
1. **Minimalist** — `rekaman` Inter Medium + small purple dot accent (`#5A4FCF`). Linear/Vercel feel.
2. **Bold Square** — `rekaman` + small electric-blue square (`#2563EB`). Confident SaaS look.
3. **Spatial Cube** — isometric cube outline + `rekaman` wordmark, purple `#5A4FCF`. AR-native, doubles as app icon for `dashboard.rekaman.io`.
4. **Slash Mono** — `rekaman/` JetBrains Mono with teal slash `#14B8A6`. Developer / API-first feel.

**Selected: TBD (Spatial Cube recommended — strongest brand-product fit for AR/3D platform; cube alone works as favicon/social avatar).**

When chosen, generate SVG files at multiple sizes:
- `rekaman-wordmark.svg` (full logo, light bg)
- `rekaman-wordmark-dark.svg` (full logo, dark bg)
- `rekaman-icon.svg` (cube only, 64×64 / 256×256)
- `rekaman-favicon.svg` (cube only, 32×32 simplified)
- `rekaman-favicon.ico` (legacy 16×16 fallback)

### Colour system

- **Primary text**: `#0F0F0F` (near-black, not pure black — softer)
- **Secondary text**: `#6B6B6B`
- **Faint text**: `#A0A0A0`
- **Background light**: `#FAFAF7` (warm white) or `#FFFFFF`
- **Background dark**: `#0F0F0F`
- **Accent (Rekaman purple)**: `#5A4FCF` (light bg) / `#8B7FFF` (dark bg)
- **Success**: `#2F7D4F`
- **Warning**: `#E0A030`
- **Danger**: `#D4493B`

### Typography system

- **Display / headlines**: Fraunces (serif, free Google Font, 9-144 optical sizing) — for marketing site H1/H2 and editorial moments
- **UI / body**: Inter (sans, free Google Font, 400/500/600 weights only) — for dashboard, body text, buttons
- **Mono / code**: JetBrains Mono — for code samples, API docs, dev-facing surfaces

### Social handles to reserve (Week 6 — even if dormant)

| Platform | Handle | Status | Priority |
|---|---|---|---|
| LinkedIn Company Page | `linkedin.com/company/rekaman` | TBD | ✅ Week 6 — set up properly with logo, description, founder profile |
| X / Twitter | `@rekaman_io` (fallback `@rekamanhq`, `@getrekaman`) | TBD | ✅ Week 6 — reserve handle, post later |
| GitHub Org | `github.com/rekaman` | TBD | ✅ Week 6 — even if all repos stay private, prevents squatters |
| YouTube channel | `@rekaman` | TBD | ✅ Week 6 — for unlisted demo videos initially |
| Instagram | `@rekaman.io` | Skip Phase 1 | ⏸️ Phase 3+ if consumer-facing AR launches |
| Facebook Page | n/a | Skip permanently | ❌ Wrong audience for B2B SaaS |
| Product Hunt profile | `rekaman` | Reserve only | ⏸️ Big launch lever for Month 5-6 (Phase 2) |

LinkedIn page setup (15 min, free):
- Page name: **Rekaman** (brand name, not legal name)
- URL: `linkedin.com/company/rekaman`
- Industry: Software Development
- Company size: 1-10 employees
- Tagline: "Capture products. Place them anywhere."
- Description: 2 paragraphs from `rekaman.io` hero copy
- Logo: chosen wordmark
- Cover: clean screenshot of AR demo (real Meshy armchair, NOT helmet)
- Add founder@rekaman.io profile as employee → instant credibility signal
- Posting cadence: 1×/week minimum (build-in-public tone)

---

## 📝 Marketing Site (`rekaman.io`) — Week 6 Spec

Single-page Next.js on Vercel, ultra-minimal but proper compliance pages. Goal: pass Razorpay website verification + look credible enough for cold-emailed brands to take seriously. Time budget: ~6-8 hours total.

### Page structure

| Section | Content | Approx height |
|---|---|---|
| **Nav** | Logo (chosen wordmark) · Pricing · Demo · Login (placeholder for Week 7) | 64px |
| **Hero** | "Capture products. Place them anywhere." subhead "AR for any e-commerce store. Works on Shopify, WooCommerce, custom — one line of code." CTA: "See live demo" → links to demo URL | 600px |
| **Problem** | "25-30% of online orders are returned because shoppers can't tell if a product fits." with the ₹2,000-5,000 per-return cost stat | 400px |
| **Solution** | 3-column: 📸 Upload photo · 🤖 AI generates 3D model · 🛍️ Shoppers see it in their room | 400px |
| **How it works** | One `<script>` tag + one `<div>` per product page · Live code snippet | 500px |
| **Pricing** | 3-tier table (Starter ₹3,999 · Pro ₹12,999 · Enterprise custom) | 500px |
| **Trust** | "Built in Tamil Nadu · Open APIs · DPDP-compliant" — small "founder@rekaman.io · WhatsApp +91 8248 524449" | 200px |
| **Footer** | Privacy · Terms · Refund Policy · Contact · © 2026 Rekaman Private Limited | 60px |

### Compliance pages (mandatory for Razorpay verification)

| Page | Path | Source |
|---|---|---|
| Privacy Policy | `/privacy` | Termly free template, customize for SaaS B2B |
| Terms of Service | `/terms` | Termly free template, customize for SaaS subscription |
| Refund Policy | `/refund` | Custom — pro-rata refund within 7 days, no refund after AR sessions consumed |
| Contact | `/contact` | Email + WhatsApp + registered business address (post-COI) |

Each ~15-20 min to draft. No legal review needed for MVP — these are standard SaaS templates. Re-review with CA in Phase 2 when first enterprise deal needs vetted contracts.

### Razorpay website verification submission

After deploying `rekaman.io`:
- Razorpay Dashboard → Account & Settings → Business website details → Add website
- Submit: `https://rekaman.io`
- Razorpay reviews 24-48 hr, checks for: (a) clear product/service description, (b) pricing visible, (c) contact info, (d) Terms + Privacy + Refund Policy live, (e) HTTPS enabled
- On approval → live keys issued automatically → can collect real money via Razorpay Subscriptions / Payment Links

---

## 🎬 Demo Strategy — fix before any sales outreach

### Current state (broken)

`rekaman-demo.vercel.app/oslo-sofa` exists but loads the **Week 1-2 helmet WebXR test asset**, NOT a real product. This is unshippable to brands. Fix is mandatory before any cold email.

### Target state (Week 6 Day 1)

A polished Shopify-Plus-style product page at `demo.rekaman.io/oslo-lounge-chair` (or kept at `/oslo-sofa` URL for backwards compat) showing:
- Real product photography (Pexels armchair `https://images.pexels.com/photos/447592/...` — same source the Meshy GLB was generated from)
- Premium e-commerce styling (Fraunces serif headline + Inter body, warm white background, proper price block, swatches, trust badges)
- Embedded Rekaman SDK button — taps open AR with the **real Meshy-generated armchair GLB** (`cmou3lwe9000337mk8223jby3`)
- Subtle "Powered by Rekaman" attribution at bottom

Reference HTML written: `rekaman-demo-product-page.html` (May 7, 2026 deliverable). Aesthetic target: Urban Ladder / Pepperfry premium product pages — familiar to Indian brand owners, not weird/experimental.

### Deployment + DB swap procedure

1. **Replace existing `apps/demo/oslo-sofa/page.html`** (or whatever path the demo project uses) with the new HTML
2. **Update product slug + name** to `oslo-lounge-chair` (matching the actual armchair GLB — current `oslo-sofa` is misleading because the model is an armchair, not a sofa)
3. **Update DB**: in the demo brand `sdk-demo-brand-3722`, either:
   - Option A (simple): UPDATE the existing `oslo-sofa` product → set `glbUrl` to the real Meshy URL (`https://rekaman-products-prod-975050270919-ap-south-1-an.s3.ap-south-1.amazonaws.com/brands/cmotyhdv20002uig5vxldw4g8/products/cmou3lwe9000337mk8223jby3/v1/model.glb`), set `name` to "Oslo Lounge Chair"
   - Option B (cleaner): create new product with slug `oslo-lounge-chair`, point to real GLB, deprecate old `oslo-sofa` row
4. **Update demo HTML** `data-rk-key` to the demo brand's API key (already deployed) and `data-rk-product` to match the slug from step 3
5. **Deploy to Vercel** via existing demo project (auto-deploys on `git push`)
6. **Verify on real device**: open `demo.rekaman.io/oslo-lounge-chair` on Android Chrome → tap "View in your room" → confirm the AR shows the real armchair (not helmet)

### Demo video (Week 6 deliverable)

After demo page is fixed, record 60-90 second walkthrough on Android phone:
- 0-10s: open `demo.rekaman.io/oslo-lounge-chair` in Chrome — show product page looks like a real e-commerce store
- 10-30s: tap "View in your room" → camera opens → tap-to-place → armchair appears at real scale
- 30-50s: walk around it in real room — show realism + scale
- 50-80s: cut to terminal showing the integration code (`<script>` + `<div>`) — emphasize "this is everything brands add"
- 80-90s: founder voiceover: "Built by Sivasankari from Tamil Nadu. Want this on your store? `founder@rekaman.io`"

Upload to YouTube (unlisted), embed link in cold emails + LinkedIn posts. Don't make it public yet.

---

## 🤝 Concierge MVP — Onboarding Playbook (Week 6-8)

The technical pipeline (auth, products, generation, SDK, public AR endpoint, S3 GLB hosting) is feature-complete for Phase 1. Brand dashboard ships Week 7-8. Until then, founder personally onboards each brand using existing API endpoints. This IS the bug-handling strategy: brands never see the half-built dashboard.

### The 5-step process

#### Step 1 — Onboarding intake (Google Form, 15 min)

Send brand a Google Form collecting:
- Brand name (legal/registered)
- Brand slug (auto-suggested, e.g. `woodcraft-chennai`)
- Website URL
- Owner email (for billing)
- Preferred plan (Starter ₹3,999 / Pro ₹12,999)
- Top 5 products with names + 1-3 photo URLs each

#### Step 2 — Manual brand provisioning (founder, 10 min)

New script to write Week 6: `server/scripts/onboard-brand.mjs`. YAML-driven, idempotent, uses prod API endpoints (no direct DB writes — proves API surface works for future dashboard).

```yaml
# brand-onboarding/woodcraft-chennai.yaml
brand:
  name: "Woodcraft Chennai"
  slug: "woodcraft-chennai"
  ownerEmail: "owner@woodcraftchennai.com"
  ownerPassword: "<generate temp password — they reset on first login>"
  website: "woodcraftchennai.com"
  plan: "starter"  # informational only until subscription module ships Week 10
products:
  - name: "Royal Sheesham Coffee Table"
    slug: "royal-sheesham-coffee-table"
    arMode: "placement"
    category: "furniture"
    photoUrl: "https://woodcraftchennai.com/cdn/sheesham-table.jpg"
  - name: "Solid Teak 3-Seater Sofa"
    slug: "solid-teak-sofa"
    arMode: "placement"
    category: "furniture"
    photoUrl: "https://woodcraftchennai.com/cdn/teak-sofa.jpg"
  # ... up to 5
```

Script execution:
```bash
node --env-file=.env server/scripts/onboard-brand.mjs brand-onboarding/woodcraft-chennai.yaml
```

Script flow:
1. `POST /v1/auth/signup` → create owner user + brand
2. `POST /v1/api-keys` (with admin JWT) → create live API key, save in output
3. For each product: `POST /v1/products` (creates row) → `POST /v1/products/:id/generate` (queues Meshy job with photo URL)
4. Poll `GET /v1/products/:id/generation-status` every 10s until all READY (timeout 5 min × N products)
5. Output: brand summary, API key, integration snippet for email

#### Step 3 — Send integration snippet (5 min, email)

Email template (HTML email or plain text):

```
Subject: Your AR is ready — 2-line install for [Brand Name]

Hi [Owner],

Your 5 products are now AR-ready. Add these 2 lines to your store
to enable "View in your room" on every product page:

1) Add this ONCE to theme.liquid (Shopify) / footer.php (WooCommerce) /
   layout file (custom site), just before </body>:

   <script src="https://cdn.rekaman.io/v1/sdk.js" defer></script>

2) Add this WHERE you want the AR button to appear in your product
   page template (use your platform's product slug variable):

   Shopify:    <div data-rk-product="{{ product.handle }}"
                    data-rk-key="rk_live_woodcraft_xxxxx"></div>

   WooCommerce: <div data-rk-product="<?php echo $product->get_slug(); ?>"
                    data-rk-key="rk_live_woodcraft_xxxxx"></div>

   Custom:     <div data-rk-product={product.slug}
                    data-rk-key="rk_live_woodcraft_xxxxx"></div>

That's it. The SDK auto-fetches the right 3D model for whichever
product page the shopper is on.

Want me to install it for you on a Zoom call? Reply with a 30-min
slot and I'll do it live. — Sivasankari
```

#### Step 4 — Install help (Zoom screenshare, 30-60 min)

For brand's first install, founder schedules a screenshare:
1. Walk through theme code editor (Shopify) / theme PHP files (WooCommerce) / page template (custom)
2. Paste the snippets in correct locations
3. Test on staging URL first (verify SDK loads, button appears)
4. Verify on phone: tap → AR opens → real product GLB renders
5. Push to production
6. Final phone verification on production URL

This is the "concierge" part. After brand 2-3, this becomes a written runbook + recorded video walkthrough. After brand 5, the dashboard from Week 7 replaces this entirely.

#### Step 5 — Collect payment

**Phase 1 (until Razorpay live mode unlocks ~Week 6):**
- Direct UPI / bank transfer to founder's current account
- Founder issues PDF invoice via Zoho Invoice (free tier)
- Founder manually marks brand as `ACTIVE` in DB (Subscription table)
- Friction: ~15 min per brand per month (acceptable up to ~5 brands)

**Phase 2 (Razorpay live, before subscription module ships ~Week 10):**
- Razorpay Dashboard → Payment Links → Create monthly recurring link (₹3,999 / ₹12,999)
- Email link to brand
- Razorpay handles payment + invoice + tax calculation
- Webhook fires on payment → Week 10 subscription module (when ready) marks brand ACTIVE; until then, founder marks manually
- Friction: ~5 min per brand per month

**Phase 3 (subscription module live, ~Week 10+):**
- Brand self-serve subscribes via dashboard
- Razorpay subscription auto-renews monthly
- Plan-gating middleware enforces session/product limits
- Friction: zero

---

## 🗺️ Plan A — Weekly Breakdown (Week 6-12)

Plan A locked May 7, 2026. Hybrid approach: ship now via Concierge MVP, polish dashboard in parallel with growing revenue. Target: ₹20-40K MRR by end of Phase 1 with 5 paying brands and self-serve dashboard live.

### Week 6 (May 12-18, 2026) — Foundations + first outreach

**Engineering**
- Demo fix deployed — `demo.rekaman.io/oslo-lounge-chair` shows real Meshy armchair (not helmet)
- Marketing site `rekaman.io` shipped (Hero, Problem, Solution, How-it-works, Pricing, Trust, Footer + 4 compliance pages)
- `server/scripts/onboard-brand.mjs` written + tested against staging brand
- Logo SVG files generated (chosen wordmark, all sizes)

**Business**
- Razorpay Rize signup completed Day 1 (this week) — registration in flight
- Mother's documents collected (PAN, Aadhaar, photo, address proof)
- LinkedIn Company Page live with logo + cover + founder profile
- Social handles reserved (X, GitHub org, YouTube)
- Termly compliance pages drafted (Privacy / Terms / Refund / Contact)
- `rekaman.io` submitted to Razorpay for website verification

**Sales**
- 50 Indian e-commerce brand outreach list compiled (furniture, decor, eyewear focus — Chennai/Bangalore/Mumbai)
- 30 cold emails sent (personalized, demo URL + 60s YouTube link)
- 15 LinkedIn DMs sent (founder-to-founder tone)
- 3-5 demo calls booked for Week 7

### Week 7 (May 19-25) — First customer + dashboard scaffold

> **v5.15 addition:** three new priorities slot ahead of / alongside the dashboard
> scaffold. Order within the week matters — see "Week 7 day-by-day" below.

**Engineering — P0 (must land before first paying customer's shoppers hit AR)**
- **USDZ pipeline shipped** (`docs/usdz-pipeline-implementation.md`, ~1.5 hrs): Prisma `usdzUrl`/`usdzSizeKb` additive migration → `meshy.client.ts` captures `model_urls.usdz` → `generation.worker.ts` downloads+uploads USDZ best-effort (mirrors thumbnail pattern) → `generation.repository.ts` persists → `publicAr.service.ts` returns it → SDK `ar-launcher.ts` serves USDZ to iOS / GLB to Android. Backfill demo product via regeneration. Verify on iPhone 13 (no black flash) + Android (no regression). This makes the product genuinely cross-device — without it cold emails cannot honestly claim iOS support.
- **Environment isolation** (~2 hrs, do BEFORE onboarding customer #1): Railway `staging` environment (separate api+worker, scale-to-zero) + Neon `staging` branch (long-lived, off prod) + branch-based deploy (`main`→prod, `dev`→staging). Local `.env` `DATABASE_URL` points at the Neon staging branch, never prod. Discipline: never run dev code against prod DB/API; prod deploys only after staging is green. Prevents the "bad push breaks a live paying brand's shoppers" failure. The SDK's `/v1/` versioning + immutable-chunk discipline already protects shoppers from SDK deploys — this closes the DB/API side.

**Engineering — P1 (dashboard scaffold, unchanged from prior plan)**
- `dashboard.rekaman.io` Next.js 14 App Router skeleton up on Vercel
- Auth pages (signup, login, forgot-password) — uses existing `/v1/auth/*` endpoints
- Onboarding wizard (3-step: brand details, plan select, first product)
- Tailwind + shadcn/ui design system locked in (matches brand colour system above)
- Multi-brand switcher in navbar (Slack-style, even though most users have 1 brand)

**Business**
- Razorpay live mode unlocks (post website verification)
- Test plan IDs created in Razorpay Dashboard (Starter/Pro/Enterprise)
- Pvt Ltd registration: **resumes only when physical PAN card arrives** (~1 week from May 14 reissue application — may slip into Week 7-8). Name approval pursued once KYC unblocked.

**Sales**
- 3-5 demo calls held (each ~30 min) — now demoable on BOTH iPhone and Android (post-USDZ)
- **First brand says "yes"** → onboard via Concierge MVP playbook
- Collect first ₹3,999 via Razorpay Payment Link
- Brand goes live with Rekaman SDK on their store
- Daily monitoring (you check Sentry + Railway + brand's site once/day for first week)

**Week 7 day-by-day (v5.15)**
- **Day 1 (Mon May 19):** USDZ pipeline — Changes 1-6 (schema migration → server). Deploy migration to prod first, then server. Verify new generation produces both formats in S3.
- **Day 2 (Tue May 20):** USDZ pipeline — Change 7 (SDK iOS routing) + Change 8 (regenerate demo product). Verify iPhone 13 black-flash gone + Android regression-clean. Update cold outreach to claim iOS+Android.
- **Day 3 (Wed May 21):** Environment isolation — Railway staging env + Neon staging branch + `dev` branch deploy wiring. Move local `.env` to staging branch. This MUST be done before customer #1.
- **Day 4 (Thu May 22):** Dashboard scaffold P1 — Next.js skeleton, auth pages (reuse `/v1/auth/*`), shadcn/ui setup. Demo calls in evenings.
- **Day 5 (Fri May 23):** Onboarding wizard 3-step + multi-brand switcher. Demo calls.
- **Day 6-7 (Sat-Sun May 24-25):** First-customer Concierge onboarding if a brand said yes (run `onboard-brand.mjs`, send snippet, Zoom install). Hosted-viewer spike if no customer yet (see Week 8).

### Week 8 (May 26 - Jun 1) — Products module + COI + Hosted Viewer

**Engineering**
- Dashboard products list page (table with status badges: PENDING / PROCESSING / READY / FAILED)
- Product creation form (name, slug, category, AR mode, photo upload via S3 presigned URL)
- Product detail page (preview, regenerate, embed code, status timeline)
- Real-time generation status (polling, upgrade to SSE later if needed)
- **Hosted viewer + desktop QR fallback** (v5.15 addition, ~1-1.5 days, India-market-critical): a dynamic route (e.g. `view.rekaman.io/{brandSlug}/{productSlug}` or `rekaman.io/v/...`) that fetches the same public AR endpoint the SDK uses and renders a minimal product page (photo + name + price + AR button). Two problems it solves at once: (1) **Desktop has no AR** — every competitor (IKEA, Shopify AR, Wayfair) detects desktop → shows a QR code → shopper scans with phone → AR opens on phone. The QR encodes the hosted-viewer URL. Critical for sales demos where you screen-share a brand's site on a laptop and want them to scan & feel it on their own phone in real time (a closing moment). (2) **Small brands without product pages** — many Indian small brands have no per-product page (one-pager site, WhatsApp Business catalog, Instagram shop, Linktree). The standard `<div data-rk-product>` integration needs a product page to embed into; the hosted viewer needs none. Brand gets a link + QR they put on packaging, WhatsApp, Instagram bio, a visiting card. This roughly doubles the Indian addressable market (WhatsApp/Instagram commerce dominates the small end far more than Shopify) and aligns with the India-first defensibility thesis. Architecturally small: one dynamic Next.js route reusing the existing public AR endpoint + a tiny client-side QR lib. Not in the original 5-phase roadmap — promoted into Phase 1 here because it's high-leverage, India-specific, and small to build.

**Business**
- Pvt Ltd Certificate of Incorporation received from MCA
- Mother's DSC + DIN allocated
- ICICI/HDFC current account opened via video KYC
- Subscription money deposited (₹10,000 total)
- Auditor signs INC-20A (within 25 days of COI)
- INC-20A filed at MCA
- Razorpay account migration request emailed (sole-prop → Pvt Ltd)

**Sales**
- Continue outreach (50 more brands)
- 2nd brand onboarded
- First demo testimonial captured (LinkedIn post)

### Week 9 (Jun 2-8) — API keys + analytics

**Engineering**
- API keys page (list, create, revoke, regenerate, last-used timestamp, usage stats)
- Embed code generator with platform tabs (Shopify / WooCommerce / Custom)
- Basic analytics dashboard:
  - Sessions/day chart (last 30 days)
  - Top products by AR engagement
  - Placement rate (% of opens that resulted in tap-to-place)
  - Device breakdown (Android / iOS / desktop)
- Filtering: date range, product, device

**Business**
- Razorpay merchant account migrated to Pvt Ltd (brand label → `REKAMAN PRIVATE LIMITED` on shopper checkouts)
- Settlement bank account switched to company current account
- Apply for **DPIIT Startup India recognition** (free)
- Apply for **MSME / Udyam registration** (free)

**Sales**
- 3rd brand onboarded
- Concierge process documented as written runbook (handoff-ready when scaling)

### Week 10 (Jun 9-15) — Razorpay subscriptions + plan gating

**Engineering**
- Razorpay Subscriptions API integration
- Plan creation in Razorpay (Starter/Pro/Enterprise — recurring monthly + annual variants)
- Subscribe flow in dashboard:
  - Plan selection page
  - Razorpay Checkout integration (payment method capture)
  - Subscription created → `subscription.id` stored in `Subscription` table
- Webhook handler for `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `payment.failed`
  - All idempotent via `InboundWebhookEvent` dedup log
  - HMAC signature verification (hex encoding, lesson learned May 8 from Meshy webhook)
- Plan gating middleware:
  - `/v1/products` enforces `productLimit` from Subscription.pricingPlan
  - SDK public endpoint `/v1/ar/...` enforces `sessionLimit` per month, returns 402 with `PaymentRequiredError` when exceeded
- Failed payment dunning emails (Resend) — Day 1, Day 3, Day 7, then suspend brand

**Business**
- 4th brand onboarded — first one via dashboard, Concierge optional
- First payment via Razorpay Subscriptions (not Payment Link) goes through

### Week 11 (Jun 16-22) — Team + admin + audit

**Engineering**
- Team page (list members, invite via email)
- Roles: OWNER / ADMIN / MEMBER with permission gates on routes
- Audit log viewer (read-only, filtered by entity + action)
- Account deletion flow (DPDP-compliant: 30-day soft delete + hard delete)
- Data export (DPDP-compliant: JSON dump of brand's data)
- Settings page (billing email, notification preferences, brand profile)

**Business**
- 5th brand onboarded
- **MRR check: ₹20,000-25,000** — Phase 1 target met
- Begin Phase 2 strategic planning (multilingual UI, WhatsApp, Indian features)

### Week 12 (Jun 23-30) — Polish + Phase 1 close

**Engineering**
- E2E QA on all 7-10 user journeys (signup → onboard → product create → AR works on real device)
- Lighthouse > 90 on all pages
- Error states for every API failure
- Empty states for every list (no products / no analytics / no team)
- Loading skeletons everywhere
- Mobile responsive pass (dashboard is desktop-first but should not break on phone)
- Sentry source maps uploaded for dashboard
- Final security audit (SQL injection, XSS, CSRF, JWT replay, IDOR)
- Self-serve signup flow tested by 2-3 friendly external testers

**Business**
- Statutory auditor formally retained (Razorpay Rize compliance bundle ₹6-9K/year OR a local CA in Thanjavur/Chennai ₹4-8K/year)
- First trademark filing for "Rekaman" wordmark started
- Phase 2 roadmap drafted (multilingual UI, WhatsApp, low-end Android fallback, festival templates)

**Sales**
- 6th-8th brand onboarded (cumulative)
- **Phase 1 close: ~₹30-40K MRR, 6-8 paying brands, dashboard self-serve live**

---

## 📌 Key Production Identifiers (for Plan A operations)

Captured here so future-Claude doesn't have to grep through `Generation Pipeline Runbook → Live Production Identifiers`.

- **Founder Rekaman DB user.id:** `cmotyhdkj0001uig5onuktwq0`
- **Founder brand.id:** `cmotyhdv20002uig5vxldw4g8` (slug `rekaman-b943`)
- **Razorpay merchant ID:** `SIzmIUZLAwBxmz` (sole-prop, will migrate to Pvt Ltd post-COI)
- **Razorpay test key (Day 6 active):** `rzp_test_Sm9b5evZZn5mWD`
- **Demo canonical GLB (May 9 e2e proof):** `https://rekaman-products-prod-975050270919-ap-south-1-an.s3.ap-south-1.amazonaws.com/brands/cmotyhdv20002uig5vxldw4g8/products/cmou3lwe9000337mk8223jby3/v1/model.glb` (13.5 MB, 24,867 vertices, ~76cm armchair)
- **Demo brand (Week 4):** `sdk-demo-brand-3722` with product `oslo-sofa` (currently helmet, needs swap to real armchair GLB Week 6 Day 1)
- **AWS Account:** `975050270919` (founder@rekaman.io)
- **CloudFront Distribution:** `E1L37VUXZMO4QV` (cdn.rekaman.io)
- **S3 SDK bucket:** `rekaman-sdk-prod-975050270919-ap-south-1-an` (public via CloudFront)
- **S3 Products bucket:** `rekaman-products-prod-975050270919-ap-south-1-an` (public-read Phase 1 Path A; CloudFront migration deferred to Phase 2)
- **Upstash Redis:** `real-lemur-97925.upstash.io` (Mumbai, free tier, eviction disabled)
- **Meshy API key (masked):** `msy_****qe4O` (Pro plan, 1600 credits/month)
- **Founder phone:** `+91 8248 524449` (for cold email signature, Razorpay account, bank KYC)

---

---

*Last updated: May 17, 2026 | Version 5.17*
*v5 changes from v4: Full feature catalog with phases. 5 schema hooks promoted to v3 schema. Indian-market differentiation made explicit. Anti-roadmap added. 18 core principles. References REKAMAN_ROADMAP.md for long-horizon vision.*
*v5.1 (Week 4 close-out): SDK loads chunks via `<script>` tag (not `import()`) to bypass cross-origin module-fetch CORS quirks. AR session no longer pins `document.body` as `domOverlay`. Placement chunk bumped to v2 after immutable-cache contract was violated by editing v1 in place. ARSession idempotent insert via `createMany({ skipDuplicates: true })` instead of `upsert({ update: {} })` (Sentry P2002 race incident). Live demo at https://rekaman-demo.vercel.app — Week 4 complete.*
*v5.2 (Week 5 — Part 1 close-out): Custom domains `api.rekaman.io` (Railway) and `cdn.rekaman.io` (CloudFront, ACM wildcard cert `*.rekaman.io`) live. SDK rebuilt with clean URLs baked in; placement chunk bumped to v3 (per immutable-cache discipline) since `__API_BASE__` is referenced inside chunk's bundled analytics module.*
*v5.3 (Week 5 — operational discipline): Account Ownership section added — all 6 vendor accounts migrated to `founder@rekaman.io` (Sentry, Neon, Vercel, Railway, AWS, Google OAuth). Operational Runbooks section added: secrets/env-var locations table (3-place rule for OAuth + others), deployment ownership matrix (auto vs manual), SDK release workflow (chunk version bump discipline), production data hygiene (cleanup pattern), cross-service health check one-liner, rollback mechanics per failure mode.*
*v5.4 (Week 5 Day 2 — IAM hygiene, May 4 2026): AWS daily ops migrated from root user to scoped IAM users. Two IAM users created with custom policies (NOT AWS-managed `*FullAccess`): `rekaman-deploy-cli` for laptop AWS CLI (S3 r/w on SDK bucket + CloudFront invalidation on distribution `E1L37VUXZMO4QV`); `rekaman-server` for Railway api+worker server-side uploads to products bucket (deferred to Week 5 Day 3 deployment, credentials currently dormant in password manager). Defense-in-depth verification: positive tests confirm scoped access, negative tests confirm `AccessDenied` on out-of-scope resources (other buckets, IAM, list-all). 90-day rotation policy established (next rotation: August 2, 2026). SDK Release Workflow updated to use `--profile rekaman` for all `aws s3` and `aws cloudfront` commands — no more Console drag-drop. Root account now reserved for billing changes / account email changes / IAM management only. Decision documented for choosing access keys over IAM Roles Anywhere (revisit at Phase 4 SOC 2 prep). Real production deploy executed via IAM user to verify end-to-end (build → s3 cp → CloudFront invalidation → curl verify) — production stack healthy throughout.*
*v5.5 (Week 5 Day 3 — generation pipeline env wired, May 5 2026): Meshy.ai account provisioned + production API key issued; Upstash Redis (Mumbai) provisioned for BullMQ; products S3 bucket access activated via `rekaman-server` IAM user (no longer dormant). Server env schema (`shared/env.ts`) extended with the generation block: `MESHY_API_KEY` (`startsWith('msy')`), `MESHY_API_BASE`, `MESHY_WEBHOOK_SECRET` (≥32 chars), `REDIS_URL` (`redis(s)://` regex), `AWS_ACCESS_KEY_ID/SECRET`, `AWS_REGION` + `S3_REGION`, `AWS_S3_BUCKET_PRODUCTS`, plus worker tuning knobs (`GENERATION_POLL_INTERVAL_MS` 5s default / `GENERATION_MAX_DURATION_MS` 5min default / `GENERATION_MAX_RETRIES` 3 default). All generation vars are `.optional()` at the schema level so CI/dev environments without Meshy/Redis don't fail to boot — code that consumes them must `if (!env.X) throw …` per External API Boundaries pattern. `.env.example` updated to mirror schema with placeholders grouped by purpose (Meshy / Redis / AWS products / worker tuning). Local `.env` + Railway api+worker env vars all set to live values. Smoke tests passed: Meshy POST text-to-3d returned `202 + task ID` with dummy test-mode key; Upstash Redis `PING` → `PONG` + SET/GET/DEL round-trip; S3 SDK bucket lists via `rekaman-deploy-cli` profile (positive); products bucket returns `AccessDenied` from `rekaman-deploy-cli` (negative test — confirms scoping). Day 4 (May 6) starts the Meshy client + Generation module skeleton.*
*v5.6 (Week 5 Day 4 — generation module skeleton + external clients, May 6 2026): Shipped the full API surface for product generation; worker is intentionally empty (Day 5). Files added: `shared/clients/meshy.client.ts` (image-to-3D create + poll, Zod-defensive response parsing, full HTTP→DomainError mapping), `shared/clients/s3.client.ts` (products bucket put/delete/head with brand-scoped key conventions in `s3Keys`), `shared/queue/connection.ts` (lazy IORedis singleton with `maxRetriesPerRequest: null`, `enableReadyCheck: false`, escalating retry strategy), `shared/queue/queues.ts` (lazy `generation` BullMQ queue), `modules/generation/{generation.types,validators,repository,service,routes}.ts`, `workers/generation.worker.ts` (placeholder export). Endpoints live: `POST /v1/products/:productId/generate` (202 Accepted, requires OWNER/ADMIN/MEMBER) and `GET /v1/products/:productId/generation-status`. New error classes added to `shared/errors.ts`: `PaymentRequiredError` (402, Meshy credits exhausted) and `ExternalServiceError` (502, carries a `service` tag for upstream grouping). Deviations from the day-4 spec, all production-grade fixes — (1) **Lazy singletons everywhere.** Spec instantiated `new Queue(...)`, `new MeshyClient()`, `new S3Client(...)` at module load. Because env vars for Meshy / Redis / AWS are `.optional()` (Day 3 decision), eager construction would hard-fail boot on any environment missing them (CI, dev). Switched to `getMeshyClient()` / `getRedis()` / `getGenerationQueue()` / lazy S3 client; env presence is checked on first use and surfaces as `ExternalServiceError('meshy', 'MESHY_API_KEY is not configured')` etc. — exactly the External API Boundaries pattern in CLAUDE.md. (2) **Middleware paths/names match this repo, not the spec.** Spec referenced `shared/middleware/auth.authenticateBrand` + `requireMembership` + `validate({body})`; we actually have `middleware/auth.requireAuth` + `requireRole` + Zod inline parsing per existing module convention. Adapted accordingly. (3) **Error class shape matches the existing base.** Spec used `httpStatus`; our `DomainError` uses `status`. `RateLimitError` already existed as `RateLimitExceededError` — reused. (4) **Repository JSONB merge pattern.** Spec used `metadata: { generation: {...} } as object` which clobbers other metadata namespaces. Replaced with a read-merge-write helper `mergeGenerationMetadata` that preserves sibling keys (variants, future ai-tryon prompts) and casts via `unknown` to satisfy Prisma's `InputJsonValue` union (TS2352 workaround, documented inline). (5) **`ProductStatus` enum already had PROCESSING/FAILED** from Week 3 — no migration needed; spec's "add now" step skipped. (6) **ARCHIVED guard added** — spec only checked PROCESSING and READY; archived products would silently start a generation. Added explicit `ConflictError('Cannot generate for an archived product')`. (7) **`ioredis` import via named export `{ Redis }` not default** — under NodeNext + esModuleInterop the default-export form trips TS2351 ("not constructable") on ioredis v5.10. Documented inline. (8) **Routes module mounted at `/v1` (not nested under products)** so generation owns its own slice without coupling to the products module — aligns with the Server Module Structure section. (9) **`metadata.generation.attemptNumber` is the source of truth for retry numbering** — incremented from prior metadata so a FAILED→retry produces a fresh BullMQ job ID (`gen:{productId}:{attempt}`). (10) **Worker file is a deliberate placeholder** documenting Day 5 scope — jobs enqueued today persist in Redis (BullMQ default) and drain when the worker subscribes tomorrow. CLAUDE.md updated to flag the no-customer-traffic rule until the worker ships. Verified clean: typecheck, lint, api boot, worker boot. Generation routes accept POST + return 202 with a `meshyTaskId`; consumers see `status: PROCESSING` until Day 5 brings the worker online.*
*v5.7 (Week 5 Day 5 — generation worker live, May 7 2026): The worker pipeline is end-to-end implemented. `workers/generation.worker.ts` subscribes to the BullMQ `generation` queue (concurrency 3) and processes each job through five stages — load `metadata.generation.meshyTaskId` from the product (via repo, no direct Prisma in worker code), poll Meshy until `SUCCEEDED`/`FAILED`/`CANCELED`/timeout (interval from `GENERATION_POLL_INTERVAL_MS`, budget from `GENERATION_MAX_DURATION_MS`), download the GLB (with `AbortController` 60 s per-fetch timeout), upload to the products S3 bucket under the versioned `s3Keys.productGlb(brandId, productId, attemptNumber)` key, and atomically `markProductReady` with public URL + size + credits. Best-effort thumbnail upload runs on the same key namespace (failure is logged-not-thrown). Error taxonomy is explicit: `PaymentRequiredError`/`ValidationError`/`NotFoundError` → permanent (mark FAILED, `isTransient: false`); `RateLimitExceededError` → 30s backoff and continue polling; `ExternalServiceError` → poll-interval backoff and continue; timeout → mark FAILED `isTransient: true`; unknown → permanent. Every error path **returns** (does not throw) so BullMQ records 'completed' and the global 'failed' listener stays clean for genuine UnrecoverableErrors / unexpected throws. Two new tenant-isolation tests added in `__tests__/tenantIsolation.test.ts` (now 9 total): brand B cannot trigger generation for brand A's product (404), brand B cannot read brand A's generation status (404). Tests run before any external call (Meshy/Redis/S3) so they pass without those services configured.

Deviations from the day-5 spec, all production-grade — (1) **Worker module exports `startGenerationWorker()` / `stopGenerationWorker()` rather than a top-level `new Worker(...)` const.** Top-level construction would force the worker to connect to Redis on import, breaking the api server's import graph (the api also imports the generation module via routes/service, but should NEVER subscribe to the queue). Lazy start is invoked exclusively from `worker.ts`. (2) **Redis Worker connection is `getRedis().duplicate()` via new `getWorkerRedis()` helper** — BullMQ requires the Worker's connection be separate from the Queue's because BLPOP blocks. Documented inline. (3) **Orchestrated shutdown in `worker.ts` entry**, not split between worker and entry. Spec put shutdown handlers inside `workers/generation.worker.ts`; with two SIGTERM handlers competing on the same signal, `process.exit(0)` races and may kill in-flight jobs before drain completes. Now `worker.ts` is the only signal handler and runs `stopGenerationWorker → closeGenerationQueue → disconnectRedis → prisma.$disconnect → exit` in dependency order, with a 10s force-exit safety net (`setTimeout.unref`). (4) **Worker reads product metadata via `generationRepository.findProductForJob`**, not direct `prisma.product.findFirst` — preserves the "Repositories are the ONLY files that touch Prisma" rule from CLAUDE.md. New repo function is a minimal projection (id + status + metadata). (5) **Status guard before polling**: if the product is no longer PROCESSING when the worker picks up the job (e.g. operator manually transitioned it), worker returns early with a warn-level log instead of polling. Spec didn't catch this case. (6) **`AbortController` timeout on Meshy GLB download** (60s) — bare `await fetch(url)` with no timeout will hang forever if the Meshy CDN is throttled, leaking jobs. (7) **`{ updated: false }` from `markProductReady` handled gracefully** — happens if the product was soft-deleted between polling-success and DB write. We log the orphaned S3 key (lifecycle rule sweeps it) and return without throwing. (8) **`worker.ts` only calls `startGenerationWorker()` if `REDIS_URL` is set** — keeps the worker process from crash-looping on boot in environments where the queue is intentionally dormant. Logs a clear warn so dormant state isn't silent. (9) **Test infra constraint encountered, not blocking commit:** the test Neon branch (`ep-aged-star-aofeuw4o-pooler...`) is unreachable today (TCP timeout — branch suspended or pruned). Test code typechecks/lints cleanly; the 9 tenant tests pass once the test branch is restored. Recommend re-provisioning the test branch as a Week 6 milestone (when paying brands arrive, prod-vs-test DB split becomes mandatory anyway). (10) **No `pnpm dev:api` script added** — spec referenced one; we already have `pnpm dev` for api + `pnpm dev:worker` for worker. Kept the existing convention. End-to-end smoke test against real Meshy credits is the next operational step (Day 6 — runs on user's laptop, ~$0.50 in Meshy charges).*
*v5.8 (Week 5 Day 6 — Meshy webhook + Sentry instrumentation, May 8 2026): Pipeline gains observability and a hint-channel from Meshy. Files added: `modules/webhooks/meshy.webhook.ts` (full HMAC verify + payload Zod-validate + idempotency log via `InboundWebhookEvent`), e2e prod test helper at `scripts/e2e-generation.sh` (gated on `FOUNDER_PASSWORD` + `PHOTO_URL` env vars). Files modified: `app.ts` (added `Request.rawBody?: Buffer` to global Express types and a `verify` hook on `express.json` to capture raw bytes — single global parser keeps middleware order unconstrained), `workers/generation.worker.ts` (per-job `Sentry.withScope` wrapper that tags `brand_id` + `product_id` + `attempt`, breadcrumbs at "job started" / "meshy succeeded" / "glb downloaded" / "complete", and `captureException`/`captureMessage` on every permanent-failure path with `failure_class` taxonomy: `payment_required` / `meshy_terminal` / `meshy_missing_glb` / `glb_download` / `s3_upload` / `timeout` / `unknown` / `bullmq_thrown`).

Webhook is a hint, not source of truth — verifies signature, logs receipt, dedups via `InboundWebhookEvent` keyed on `meshy:<task_id>:<status>`, then returns 200. The worker's poll loop remains authoritative (Day 5). Live local 5-path test confirmed: valid HMAC → 200 / replay → 200+`dedup:true` / tampered sig → 401 / missing sig → 401 / bad shape → 400.

Deviations from the day-6 spec, all production-grade — (1) **Raw body via `express.json({ verify })` hook**, not via mounting `express.raw` for the webhook path before the global JSON parser. Spec's approach trips up if any middleware gets re-ordered later; the verify hook captures `req.rawBody = Buffer.from(buf)` on every JSON request and survives any future middleware reshuffling. Cost: ~1 KB extra memory per JSON request. Acceptable trade-off for correctness. (2) **`MESHY_WEBHOOK_SECRET` is `.optional()` in env schema**, so the webhook handler hard-checks at call time and returns **503 `WEBHOOK_DISABLED`** if missing — better than the spec's pattern of trusting `env.MESHY_WEBHOOK_SECRET!` (which would throw `TypeError` mid-request and surface as 500). The 503 makes misconfig visible in monitoring. (3) **Idempotency via `InboundWebhookEvent`** (not just logging) — spec only logged. We insert with `eventId = "${task_id}:${status}"` so each terminal-state delivery dedups even if Meshy retries; `processedAt` is stamped after successful handling so the audit log distinguishes "received" from "processed". The unique constraint on `(provider, eventId)` makes dedup atomic; P2002 on insert means dedup hit, return 200 + `{ dedup: true }`. (4) **Hex-encoded HMAC compare via `Buffer.from(hex, 'hex')` + length guard before `timingSafeEqual`** — spec's `Buffer.from(signature)` (no encoding arg) treats the hex string as UTF-8 bytes, doubling its length and failing the constant-time compare on EVERY valid request. Correct: decode both sides as hex and length-check first (timingSafeEqual throws on length mismatch). (5) **Always 200 on unknown-task-ID, 200 on dedup, 401 on bad sig, 400 on bad shape** — explicit policy: don't amplify Meshy retries on errors that are ours to fix (state drift), but DO reject malformed/spoofed traffic. (6) **Webhook does NOT bump job priority or short-circuit polling.** Spec hand-waved this with "we don't bypass the worker entirely". Doing so safely requires either bumping BullMQ job priority (racy under our `attempts: 1` policy) or running download/S3 from the webhook handler (couples HTTP latency to Meshy CDN — bad). Polling at 5 s already meets latency SLOs. Revisit only if customer feedback flags polling lag (Phase 2+). (7) **Sentry: `withScope(async (scope) => …)` wrapping the entire job** so concurrent jobs don't bleed tags into each other's events. The `tagGenerationScope` helper is reused by the global `'failed'` listener (catches UnrecoverableError + any unexpected throw) so even thrown-not-returned failures group cleanly by `brand_id`/`product_id`. (8) **Sentry breadcrumb cadence is phase-boundary only** (job started / meshy succeeded / glb downloaded / generation complete) — not per-poll-tick, which would flood breadcrumbs (60+ per job) and push older context off the trail. (9) **`failure_class` tag is the primary grouping dimension** in Sentry — alerts can target `failure_class:payment_required` (escalate to billing) vs `failure_class:s3_upload` (operations) vs `failure_class:unknown` (deserves a human). (10) **e2e script lives at repo-root `scripts/e2e-generation.sh`** (not `server/`) since it talks to prod over HTTPS and isn't tied to one workspace. Idempotent slug (timestamp-suffixed) makes it rerunnable; the test product is intentionally left in prod DB and swept by the periodic `KEEP_PATTERNS` cleanup (Production Data Hygiene runbook). (11) **Demo page update + visual GLB verification deferred to Day 7** — separate concerns from the backend pipeline. Day 6 ships the observability/integrity layer; Day 7 closes the customer-facing loop. Verified clean: typecheck, lint, api boot, all 5 webhook scenarios local-tested.*
*v5.9 (Week 5 Day 7 — first end-to-end prod generation, May 9 2026): Full pipeline proven end-to-end against PROD systems. From zero state to a 13.6 MB GLB in S3 + product status=READY in DB in 93 seconds against 30 Meshy credits. The first real run surfaced two bugs that local fixtures + dummy-mode testing had hidden:

**Bug 1 — Meshy v1 image-to-3d response shape vs our Zod schema.** Spec's expected fields (`task_error: object | undefined`, `credits_used`) didn't match production reality (`task_error: null`, `consumed_credits`). The strict `.optional()` schemas REJECTED null and crashed every poll on the success path. Fix in `shared/clients/meshy.client.ts`: every nullable Meshy field switched to `.nullish()` (undefined OR null OR present), accept both `consumed_credits` and `credits_used` field names, added `texture_urls[].emission` to the schema (Meshy v1 returns it). Mapping layer collapses null → undefined so callers always see `task.modelUrls.glb` regardless of which form Meshy returned.

**Bug 2 — BullMQ `lockDuration: 30000` (default) << `GENERATION_MAX_DURATION_MS: 300000`.** Our jobs hold the BullMQ lock for up to 5 minutes while polling Meshy. The default 30s lock TTL expires mid-poll; if the renewer mis-fires (worker restart, Redis blip, or worker killed during dev), BullMQ reports "Missing lock for job ... moveToFinished" and "job stalled more than allowable limit" — and with our `maxStalledCount: 1` + `attempts: 1` policy, the stall is fatal. Fix in `workers/generation.worker.ts`: set `lockDuration: GENERATION_MAX_DURATION_MS + 60_000` (6 min headroom), bump `stalledInterval` to 120s. Long polls now hold their lock through completion.

**Operational items deferred (NOT code bugs):**
- **Products S3 bucket isn't public-readable.** Direct GET on `https://rekaman-products-prod-…s3.ap-south-1.amazonaws.com/...` returns 403. Presigned URLs (1-hr) work for QA via `server/scripts/presign-glb.mjs`, but the SDK on shopper phones needs unauthenticated GET. Two paths: (a) bucket policy `Allow s3:GetObject Principal: *` on `arn:aws:s3:::rekaman-products-…/*` (simplest, equivalent to SDK bucket today), or (b) CloudFront + OAC at `products.rekaman.io` (Phase 2 plan). Pick (a) for MVP; CloudFront adds CDN benefits but isn't on the critical path until customer-traffic-via-AR ships.
- **Railway `worker` service isn't picking up jobs.** Inspection of Redis showed jobs sitting in `bull:generation:delayed` with `wait=0` / `active=0` despite the api having enqueued them. Either the Railway worker isn't running, doesn't have `REDIS_URL` set, or has a different REDIS_URL than the api. Check Railway → worker service → Logs (look for `generation worker subscribed`) and Variables (REDIS_URL must match api). Until fixed, generation completes only when the founder runs `pnpm dev:worker` locally — fine for concierge MVP, blocking for self-serve.

**Tooling added:**
- `server/scripts/mint-jwt.mjs` — mints JWT directly from DB lookup, used when JWT_SECRET in local `.env` drifts from Railway's. Exposed early-day-7 when local mint failed against prod (signature mismatch). Recommended fix: sync local `.env` `JWT_SECRET` from Railway → `api` service → Variables. Day-7 workaround was to sign up `founder@rekaman.io` directly via prod's `/v1/auth/signup` and use the returned token.
- `server/scripts/recover-stuck-generation.mjs` — re-enqueues a BullMQ job after a worker bug fix, against the SAME existing Meshy task (no fresh credit charge). Reads product metadata, removes any prior job state, adds with original jobId.
- `server/scripts/presign-glb.mjs` — generates a 1-hr presigned URL for a product GLB key. For QA before bucket policy is set up.
- `server/scripts/list-users.mjs` — diagnostic: lists prod users + their auth modes + memberships.

**The early Day-7 trap (founder@rekaman.io 401 on login):** When you set up vendor accounts at `founder@rekaman.io` (Sentry / Railway / Vercel / etc — see Account Ownership table), it's tempting to assume that email is also your Rekaman account. **It is not.** Rekaman has its own auth and `founder@rekaman.io` only exists in the Rekaman DB if you've explicitly run signup. The fix: `curl POST /v1/auth/signup` with the email + chosen password — creates the user, the brand (`Rekaman`, slug `rekaman-bxxx`), and returns a JWT. Save the password in your password manager. The legacy `sdk-demo+1777499799@rekaman.io` user is the seed account from the Week 4 demo brand and is fine to leave in place.

**Products S3 bucket — public-read decision (Phase 1).** The products bucket (`rekaman-products-prod-975050270919-ap-south-1-an`) holds GLBs + product photos that shoppers' phones must fetch to render AR. Two access models considered:

| Path | Setup | Bucket | Access | Egress cost | When right |
|---|---|---|---|---|---|
| **A. Public bucket policy** *(chosen for Phase 1)* | 5 min | Direct S3 + CORS | `Allow s3:GetObject Principal:*` | $0.10/GB direct from S3 | Pre-PMF, low traffic, fast iteration |
| **B. CloudFront + OAC at `products.rekaman.io`** *(Phase 2)* | 30-60 min | Stays private | Bucket policy allows only the CloudFront distribution | $0.10/GB (similar) but cached at edge → 10-50× cheaper at scale + low latency for global shoppers | Real shopper traffic, multi-region, pre-SOC 2 |

Path A applied because: (1) keys are unguessable cuids (`brands/{cuid}/products/{cuid}/v{n}/model.glb`), no list-bucket permission for the public, so enumeration risk is nil; (2) the data is intentionally public (shoppers' SDK fetches GLBs unauthenticated, same as Shopify product images); (3) same pattern as the SDK bucket; (4) reversible — A → B is one afternoon's work with no data migration (set up CloudFront → swap `publicProductUrl()` in `s3.client.ts` to return `https://products.rekaman.io/...` → tighten bucket policy to the OAC principal).

**Migration triggers — switch to Path B when ANY fires:**
- Total products-bucket egress > 50 GB/month (real shopper traffic; CloudFront edge cache pays back)
- Any single GLB > 1 GB egress in 24h (viral product; CloudFront prevents cost spike)
- A brand asks for a private/B2B catalog (need access control beyond public)
- SOC 2 / DPDP audit requires "single ingress point" for asset delivery
- Razorpay billing live + we add a `rekaman-billing-prod` private bucket (good time to architect both buckets properly)

**Guardrails for Path A (do these alongside applying the policy):**
- AWS Budgets daily alert at ₹2,000 scoped to S3 ap-south-1 → email founder@rekaman.io at 80%/100%
- **Strict rule:** products bucket holds GLBs + product photos ONLY. Billing PDFs / KYC docs / contracts go in a SEPARATE private bucket (`rekaman-billing-prod`, Phase 2). The cuid-key safety argument breaks down for sensitive data — never put PII in this bucket.
- CORS already configured (AllowedOrigins:*, methods GET+HEAD, ExposeHeaders ETag/Content-Length/Content-Type, MaxAgeSeconds 86400) — sufficient for shopper SDK + 3D viewers.

**Why not at bucket creation?** AWS's default since April 2023 is "Block Public Access: ON" — making a bucket public is an explicit, deliberate decision (AWS forces typing "confirm"). Day 3 (May 5) we created the bucket and deferred the access decision until we knew what would live in it. Day 7 (May 9) we have a real GLB and the answer: public, with brand-scoped cuid keys + bucket-policy gate + budget alert. The CloudFront migration is documented as Phase 2 in `s3.client.ts publicProductUrl()` comment.*
*v5.10 (Week 5 close — Day 7 final state, May 9 2026): Both v5.9-deferred ops items resolved; pipeline fully self-serve on prod with zero local processes. New top-level Operational Runbook subsection added: **Generation Pipeline Runbook** — Live Production Identifiers table (founder account/brand cuids, S3 bucket names, Railway service names, the canonical demo GLB URL), pipeline lifecycle diagram, tool cookbook for `server/scripts/*.mjs`, ten real Day-7 gotchas with confirmed fixes, recovery procedure for stuck products, Phase 2 migration triggers recap.

**Operational items resolved Day 7:**
1. **Railway `worker` service subscribed.** Root cause: Start Command was `pnpm --filter @rekaman/server start` (no script) instead of `pnpm --filter @rekaman/server start:worker`. After fix, first deploy crashed on Neon scale-to-zero (Prisma "Can't reach database server"); Railway auto-retried within 30 s and the second deploy succeeded with logs showing `worker DB connection verified` → `generation worker subscribed` → `worker process ready` → `redis connected`. Pattern documented as Gotcha #4 in the runbook.
2. **Products S3 bucket public-readable.** Path A applied: edited Block Public Access (kept ACL boxes 1+2 checked, unchecked policy boxes 3+4), saved with "confirm", then saved the `RekamanProductsPublicRead` bucket policy. CORS was already configured (AllowedOrigins `*`, GET+HEAD). User initially hit Gotcha #3 (BPA inversion — checked the wrong pair) and resolved by re-reading the box labels carefully. AWS Budgets `Rekaman monthly` $5/mo at 85%/100% email-only alerts to founder@rekaman.io was already in place — confirmed free (under the 2-budget free tier with no SNS/Chatbot actions).

**Final prod e2e run (the canonical proof):**
- AUTH: pre-minted JWT for founder@rekaman.io (account created via `POST /v1/auth/signup` since the email is a vendor label, not a Rekaman user — see Gotcha #1)
- INPUT: `https://images.pexels.com/photos/447592/pexels-photo-447592.jpeg` (Pexels armchair, white background)
- PRODUCT: `cmou3lwe9000337mk8223jby3` (founder brand `cmotyhdv20002uig5vxldw4g8`)
- TIMELINE: 19:04:05 first PROCESSING → 19:07:44 READY (~3 min 39 s wall-clock; Meshy ran ~2 min, our pipeline overhead ~5-10 s, plus a Neon-cold-start delay on the very first poll)
- OUTPUT: 13,474 KB (13.5 MB) GLB at the canonical public URL `https://rekaman-products-prod-975050270919-ap-south-1-an.s3.ap-south-1.amazonaws.com/brands/cmotyhdv20002uig5vxldw4g8/products/cmou3lwe9000337mk8223jby3/v1/model.glb`
- COST: 30 Meshy credits (~₹40-80 / ~$0.50)
- ZERO local processes ran during this test — Railway `worker` service drained the queue autonomously. `ps aux | grep tsx.*worker` returned 0 before the test started.

**Verified asset:** the GLB renders cleanly in 3dviewer.net (paste bare S3 URL — gltf-viewer.donmccurdy.com no longer has a URL input box, see Gotcha #8 for workarounds). 24,867 vertices, 29,903 triangles, ~76 cm cube — proper sofa-side proportions.

**The two `founder@rekaman.io` identities (don't conflate them):**
- **Vendor account label** (Sentry, AWS root, Railway, Vercel, Neon, Google Cloud OAuth) — set up Week 5 Days 1-2 during account migration. Login depends on each vendor.
- **Rekaman DB user** (`user.id = cmotyhdkj0001uig5onuktwq0`, password-auth) — created May 9 via `POST /v1/auth/signup` against `https://api.rekaman.io`. Auto-created brand `rekaman-b943`. Password lives in password manager.
These are SEPARATE accounts that share an email — entirely different auth systems, different databases. Future-Claude must NOT assume "the founder logged in as founder@rekaman.io" maps to "found it in the Rekaman DB."

**Local `JWT_SECRET` drift detected (action item for future-Claude):** the local `server/.env` `JWT_SECRET` value differs from Railway api's. Detected when `mint-jwt.mjs` produced a token Railway rejected with 401 on `/v1/auth/me`. Fix path: copy Railway → api → Variables → `JWT_SECRET` value into local `.env`. Until then: use `/v1/auth/login` or `/v1/auth/signup` to obtain a Railway-signed JWT for scripted ops (the Day-7 workaround).

**Week 5 closeout commit + tag pending** (user manually does at end of Day 7 sales work):
```bash
git tag -a week5-complete -m "Week 5: custom domains, vendor migration, IAM hygiene, Meshy generation pipeline live + first prod GLB"
git push --tags
```

**What changes after Week 5:** the technical pipeline is feature-complete for Phase 1 MVP. From Week 6 onward, code work centers on the brand dashboard (Next.js on Vercel, Week 7+) and Razorpay subscription billing (Week 10+). Until then, brand onboarding is **Concierge MVP**: founder personally runs the API on a brand's behalf for their first 5 products. The technical pipeline that just shipped is the engine that makes Concierge MVP viable.*

*v5.11 (Week 5 Day 7 close → Week 6 Plan A kickoff, May 7 2026): Strategic shift from "ship-now-only" to **Plan A: hybrid** — Concierge MVP first paying brand by Week 7, brand dashboard built in parallel during Weeks 7-12, ₹20-40K MRR + 5-8 paying brands by Phase 1 close (~Jun 30). Founder explicitly considered Plan B (polish-first, 9-12 weeks heads-down build, no customers until July-August) and rejected it on three grounds: (a) wrong-feature risk without customer feedback over 9-12 weeks is the #1 cause of failed solo SaaS, (b) ₹35-70K personal cash burn during stealth period with zero validation, (c) feature-parity trap — arriving July with a "polished" product that looks like Threekit/Zakeke evaporates the 20-min-setup differentiation. Concierge MVP IS the bug-handling strategy: 1-5 brands × ~30 min/week = 1 hr/week support load, leaving 99% of time for code; brands never see the half-built dashboard.

**Company structure decisions locked:** Pvt Ltd over OPC (investor-friendly, mother as 2nd director with 1% shareholding solves the 2-director Companies Act 2013 minimum). Razorpay Rize over Vakilsearch (₹1,499 + Govt fee = ~₹6,500-8,500 total; automatic Razorpay merchant migration sole-prop → Pvt Ltd post-COI; ~$11K cloud credits perk; Vakilsearch ruled out on reputation/upsell concerns despite ₹500-1,500 cheaper base). Name preferences (4 for MCA): Rekaman Spatial Private Limited (top — distinctive, ties to "Spatial Commerce" tagline) → Commerce → Technologies → Innovations. Authorised capital ₹1,00,000, paid-up ₹10,000 (₹9,900 founder + ₹100 mother). Registered office Thanjavur home address (founder's actual operating location). Total registration timeline 12-18 days, 100% online, zero travel including video-KYC bank account opening at ICICI/HDFC.

**GST registration deferred to Month 4-5 (Phase 2 trigger):** TN service threshold is ₹20L turnover, months away even at best case. Voluntary registration NOW would cost ~₹30-50K/year compliance overhead (monthly GSTR-1 + GSTR-3B filings, ₹50-100/day late penalties per missed return) for ~₹3-5K/month ITC savings that don't justify until infra spend hits Phase 2 levels. SMB e-commerce brands paying ₹3,999/month don't require GST-registered vendors. Trigger to register: ~₹15L turnover or first inter-state enterprise customer. Razorpay Rize can add GST registration later for ₹1,500-2,000.

**Auditor + INC-20A demystified:** Statutory auditor legally required within 30 days of COI (Companies Act 2013). For pre-revenue Year 1 startup, workload is light: signs INC-20A once at start, then annually March-September prepares audit report + AOC-4 + MGT-7 + ITR-6 (Income Tax Return for company). Bundle cost ₹6,000-9,000/year (Razorpay Rize compliance plan, recommended for minimum-hassle path) OR a local CA in Thanjavur/Chennai at ₹4,000-8,000/year. Founder responsibility per FY: maintain `Rekaman/Finance/FY-2026-27/` Google Drive folder, dump every bill/invoice/bank statement as it comes in. April 2027 auditor accesses folder, prepares everything. INC-20A is one-time MCA declaration that subscription money was received in current account — Razorpay Rize bundles it, founder signs once with DSC, no manual portal work. Late penalty if missed: ₹50,000 + ₹1,000/day. 180-day deadline from COI.

**Brand identity locked:** Wordmark logo approach for Phase 1 (custom design ₹15-50K deferred to Phase 2-3 when revenue justifies). Four wordmark candidates designed (Claude-generated SVG, May 7): Minimalist (Inter Medium + purple dot), Bold Square (Inter + electric blue square mark), Spatial Cube (isometric cube outline + Inter wordmark, doubles as app icon — recommended), Slash Mono (JetBrains Mono `rekaman/` with teal slash). Selection pending founder decision; Spatial Cube has strongest brand-product fit for AR/3D platform. Color system locked: primary text `#0F0F0F`, secondary `#6B6B6B`, faint `#A0A0A0`, light bg `#FAFAF7` warm white, dark bg `#0F0F0F`, accent Rekaman purple `#5A4FCF` (light) / `#8B7FFF` (dark), success `#2F7D4F`, warning `#E0A030`, danger `#D4493B`. Typography: Fraunces (serif, free Google Font) for display/headlines, Inter (sans, free Google Font) for UI/body, JetBrains Mono for code. Social handles to reserve in Week 6 (LinkedIn page priority + reserve X / GitHub org / YouTube — Instagram + Facebook + Product Hunt deferred per founder-attention budget).

**Concierge MVP onboarding playbook locked (5 steps):** (1) Google Form intake collecting brand name, slug, owner email, plan, top 5 products with photo URLs (15 min); (2) `server/scripts/onboard-brand.mjs` YAML-driven brand provisioning script — uses prod API endpoints (no direct DB writes, proves API surface is dashboard-ready), creates brand + user + API key + 5 products + queues all generation jobs, polls until READY (~10 min); (3) email integration snippet to brand with platform-specific examples (Shopify Liquid / WooCommerce PHP / custom React); (4) Zoom screenshare for first install — walk through theme code editor, paste snippets, test on staging then push live (~30-60 min, becomes written runbook + recorded video after brand 2-3); (5) collect payment via UPI/bank transfer (Phase 1 pre-Razorpay-live), then Razorpay Payment Links (Week 6-9 post-live), then Razorpay Subscriptions (Week 10+ post-subscription-module). Friction declines from ~15 min/brand/month → 5 min → zero across these phases.

**Marketing site `rekaman.io` spec finalized:** Single-page Next.js on Vercel, 6-8 hours total build, 7 sections (Nav/Hero/Problem/Solution/How-it-works/Pricing/Trust/Footer) + 4 mandatory compliance pages for Razorpay verification (Privacy/Terms/Refund/Contact via Termly templates). Hero copy: "Capture products. Place them anywhere." subhead "AR for any e-commerce store. Works on Shopify, WooCommerce, custom — one line of code." 3-tier pricing visible (Starter ₹3,999, Pro ₹12,999, Enterprise custom). Trust section: "Built in Tamil Nadu · Open APIs · DPDP-compliant" + founder@rekaman.io + WhatsApp +91 8248 524449. Submit to Razorpay Dashboard → Account & Settings → Business website details → 24-48 hr verification → live keys auto-issued.

**Demo strategy:** current `rekaman-demo.vercel.app/oslo-sofa` loads Week 1-2 helmet WebXR test asset (NOT a real product, unshippable to brands). Fix is Week 6 Day 1 mandatory before any cold email. Reference HTML written and committed: `rekaman-demo-product-page.html` (May 7 deliverable) — Shopify-Plus-style premium e-commerce aesthetic (Fraunces serif headline + Inter body, warm white `#FAFAF7` bg, real Pexels armchair photography matching the Meshy-generated GLB, proper price block with strikethrough + EMI, swatches for wood finish, trust badges, "Powered by Rekaman" attribution). Deploy: replace existing demo path, UPDATE the demo brand's `oslo-sofa` product (or new `oslo-lounge-chair` slug) → set `glbUrl` to canonical `cmou3lwe9000337mk8223jby3/v1/model.glb`, set `name` to "Oslo Lounge Chair" (the GLB is an armchair, not a sofa — the misnomer was Week 4 placeholder), verify on Android phone end-to-end. Demo video Week 6 deliverable: 60-90s walkthrough on Android phone, upload YouTube unlisted, embed in cold emails + LinkedIn.

**Plan A weekly breakdown (Week 6-12):** Week 6 = Foundations (demo fix, marketing site, Razorpay Rize signup, social handles, 30 cold emails). Week 7 = First customer + dashboard scaffold (auth pages, onboarding wizard, multi-brand switcher, Tailwind+shadcn locked). Week 8 = Products module + COI received (products list, photo upload, generation status, current account opened, INC-20A filed). Week 9 = API keys + analytics (dashboard sessions chart, placement rate, device breakdown; Razorpay merchant migrated to Pvt Ltd post-COI; DPIIT + MSME applications filed). Week 10 = Razorpay Subscriptions + plan gating (plan creation, subscribe flow, webhook handlers idempotent via `InboundWebhookEvent`, plan gating middleware enforces session/product limits, dunning emails). Week 11 = Team + admin + audit (members + roles + permissions, audit log viewer, account deletion flow DPDP-compliant, data export, settings; 5th brand onboarded, MRR ₹20-25K = Phase 1 target met). Week 12 = Polish + Phase 1 close (E2E QA, Lighthouse > 90, error states, empty states, loading skeletons, mobile responsive, security audit, friendly external testers; statutory auditor formally retained, trademark filing started, Phase 2 roadmap drafted; cumulative 6-8 paying brands, ~₹30-40K MRR, dashboard self-serve live).

**No technical changes in v5.11** — this is a strategic / brand / business-process update. Code changes resume Week 6 Day 1 with the demo fix + marketing site build. The technical pipeline shipped through Week 5 is feature-complete for Phase 1 MVP and stays untouched until dashboard work begins Week 7.*
*v5.12 (Week 6 Day 1 demo fix shipped — May 7 2026 evening): Founder reported five customer-visible bugs while testing the demo on Android Chrome. All five root-caused + fixed in one push. **Critical:** the demo URL `rekaman-demo.vercel.app/oslo-sofa.html` now renders a real polished e-commerce page and launches AR with the actual Meshy armchair sitting correctly on the floor. This is the asset cold emails will link to.

**Bug 1 — mobile shows blank product image.** Root cause: `apps/demo/public/oslo-sofa.html` used a CSS gradient placeholder div (`linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)`) with the literal string "[ Product photo placeholder ]". Fix: replaced with a real Pexels armchair photo (the SAME image used to generate the canonical Meshy GLB so the 2D and 3D match), wrapped in a brand bar (HomeTown), thumbnail row (4 alternates with click-to-swap), trust badges row (Free delivery / 7-day returns / 3-year warranty), and a footer disclaimer noting it's a Rekaman demo (legal-safety for using the HomeTown name). File grew from ~2 KB to 6.9 KB. SDK integration unchanged: still one `<script src="…/sdk.js" defer>` + one `<div data-rk-product data-rk-key>`.

**Bug 2 — AR shows helmet, not armchair.** Root cause: the demo brand's `oslo-sofa` product row had `glbUrl = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb'` — the Week 1-2 WebXR test asset, never replaced. Fix: new `server/scripts/update-demo-product.mjs` updated the product to point at the canonical Meshy armchair (`brands/cmotyhdv20002uig5vxldw4g8/products/cmou3lwe9000337mk8223jby3/v1/model.glb`), set name to "Oslo Lounge Chair", set dimensions to 76×78×86 cm (matches the Pexels photo's seller copy AND the AR engine's real-world scaling). Cross-brand GLB reference is intentional and acceptable in Phase 1 — the products bucket is public-readable, cuid keys are unguessable, and copying the GLB to a demo-brand-scoped key adds no security benefit. Verified live: `curl /v1/ar/.../oslo-sofa` returns the new name + dimensions + glbUrl.

**Bug 3 — model floats below the floor.** Root cause in `placement-engine.ts` v3: the loaded model received `model.position.y = -box.min.y` to ground-correct it, but on placement the line `placed.position.setFromMatrixPosition(reticle.matrix)` OVERWROTE the entire position vector — discarding the ground correction. The mesh's geometric origin (often centre or a bone joint, not the bottom-most vertex) ended up at the reticle, so the bottom of the mesh sat below the floor. v4 fix: wrap the inner `gltf.scene` in a `THREE.Group()` and apply the centre+ground translation to the inner node only. The wrapper's local origin = bottom-centre of the model. We clone + position the wrapper at the reticle, so the bottom of the mesh always coincides with the hit point. Also re-measures the bbox AFTER scaling (v3 measured before, then scaled — slight inaccuracy when targetHeightM is set).

**Bug 4 — model follows the camera.** Root cause: the WebXR session was created with `requiredFeatures: ['local-floor', 'hit-test']` and hit-test poses were read in `local-floor` reference space, but Three.js's `WebGLXRManager` defaults the renderer's scene to the `local` reference space (eye-level origin) unless told otherwise. The two reference spaces differ by ~1.6 m vertically AND can drift independently when the device tracker recalibrates — causing placed models to appear to follow the camera as the user walked around. v4 fix: call `renderer.xr.setReferenceSpaceType('local-floor')` BEFORE `setSession`. The renderer must read this property at the moment it adopts a session, so ordering matters. Now Three.js's scene + our hit-test poses share a single coordinate frame, the model anchors stay still, and the user can walk around them as expected.

**Bug 5 — button label flicker.** Root cause in `index.ts`: the original design injected a disabled "View in AR" placeholder button as soon as platform detection resolved (~50 ms), then upgraded the label + enabled state when the product fetch resolved (~200-500 ms). On slow networks the user saw a faded ghost button for half a second that re-labelled itself and turned solid — perceived as broken. Fix: keep both promises racing in parallel for speed (no perf regression — total time-to-button is bounded by the slower fetch, not their sum), but defer the `injectButton` call until the product fetch resolves. Single paint with the correct label, already enabled. Trade-off accepted: button appears slightly later (≤500 ms typical) instead of earlier-but-flickering. Documented inline.

**Production-grade discipline applied throughout:**
- (a) Bumped placement chunk v3 → v4 in `build.config.ts` + `ar-launcher.ts` + the manifest output. v3 stays in S3 forever for any SDK still cached on a brand site (per the immutable-cache contract — content changed → version MUST change, never edit content at an existing -vN URL).
- (b) Reused the SDK Release Workflow runbook to deploy: `pnpm build` with `SDK_API_BASE=https://api.rekaman.io SDK_CDN_BASE=https://cdn.rekaman.io NODE_ENV=production` → `aws s3 cp` for both files (sdk.js with `max-age=300, s-maxage=86400, stale-while-revalidate=86400`; v4 chunk with `max-age=31536000, immutable`) → `aws cloudfront create-invalidation /v1/sdk.js` (chunk URL is versioned so no invalidation needed). All AWS calls under `--profile rekaman` (the `rekaman-deploy-cli` IAM user) — verified via `aws sts get-caller-identity` before every deploy. Root account NEVER used.
- (c) Defense-in-depth verification: `diff` of CDN bytes vs local `dist/sdk.js` to confirm propagation (matched exactly), `curl -sI` of new chunk to confirm immutable cache headers, `grep` of main bundle on CDN to confirm it references `placement-engine-v4.js` (not v3), `curl /v1/ar/.../oslo-sofa` to confirm the public endpoint returns the new GLB + dimensions. All four green.
- (d) `update-demo-product.mjs` is idempotent (re-running re-applies same values). Lives at `server/scripts/` with the other operational tools — Node ESM resolves `@prisma/client` from server's node_modules. Pattern reused from Day 5/7 tooling.
- (e) New SDK API surface: `injectButton` no longer needs `setEnabled(false)` initial state since the button is born enabled. The `ButtonHandle.setEnabled` and `setLabel` methods are kept for future use (e.g. a brand may want to dynamically re-label per variant).

**Phone verification next.** Founder runs the e2e on their Android Chrome to confirm: (a) page renders armchair photo (no blank), (b) "View in your room" button appears solid + enabled (no flicker), (c) on tap → camera opens → tap-to-place → armchair sits exactly on the floor at the tap point, (d) model stays anchored as user walks around (camera moves but model doesn't), (e) tapping a different point moves the model to the new point. Screenshot of (c) becomes the LinkedIn cover image + cold-email demo asset. If anything regresses, file a v5.13 entry with the regression + fix.*
*v5.13 (Week 6 Day 2 — landing site + onboarding tooling shipped, May 11 2026): Three deliverables landed in one push to unblock the Razorpay verification → live-keys flow and the Concierge MVP customer-onboarding flow. Four prod bugs found in the originally-provided spec; all fixed before commit to avoid embarrassing fails in front of the first paying customer.

**Bug A — `onboard-brand.mjs` `createApiKey()` read fields off the wrong object.** Server returns `{ key: { id, key, prefix, name, scopes, createdAt } }` (wrapped in `.key` per the apiKeys route's `res.status(201).json({ key: created })`). Spec accessed `r.keyPrefix` and `r.fullKey` at the response root — both undefined. Every Concierge MVP run would have emailed the customer their integration snippet with `data-rk-key="undefined"`. SDK on shopper phones would have hit `/v1/ar/undefined/...` → 404 → AR completely broken at the customer site, and we'd look like we shipped a customer-broken product without testing. Fix: unwrap `r.key`, rename `apiKey.fullKey` → `apiKey.key`, `apiKey.keyPrefix` → `apiKey.prefix` throughout. Added a defensive contract check (`if (!r?.key?.key) throw new Error('API key response missing key.key field — server contract changed?')`) so any future server rename surfaces with a clear error instead of a silently dropped key.

**Bug B — `createProduct()` had the same wrapping issue.** Server `POST /v1/products` returns `{ product: {...} }`; spec accessed `p.id`/`p.slug`/`p.name` directly. The subsequent generation polling loop would fail because product IDs were undefined. Fix: unwrap `r.product`, plus the same defensive check pattern.

**Bug C — `arMode` + `category` silently stripped from product creation.** Server-side `CreateSchema` (Zod) only accepted `{ name, slug, widthCm, heightCm, depthCm }`. Zod's `.object()` default behavior is to strip unknown keys (not `.passthrough()`, not `.strict()`). The onboarding script's payload included `arMode` and `category` per the YAML, but those silently disappeared at the boundary. Brands onboarding jewelry/eyewear (Phase 3 try-on) would have all their products defaulted to `arMode: 'placement'`. Category — useful for analytics + filtering — would be perpetually null for every Concierge-onboarded brand. Fix in `products.routes.ts`: added `ArModeSchema` (closed 8-mode enum mirroring the Prisma column) + `CategorySchema` (regex-bounded slug), threaded through `CreateProductInput`/`UpdateProductInput` types and the service's `create()`. Used spread-conditional syntax (`...(input.arMode !== undefined && { arMode: input.arMode })`) so omitted fields fall through to Prisma defaults (`placement` / `null`) without forcing every caller to specify them — backward-compatible with the existing products module.

**Bug D — broken JSX in landing page's code-snippet block.** The spec's `apps/landing/app/page.tsx` `HowItWorks` section had `<pre><code>` opening but never closing `</code>` before `</pre>` (the syntax-highlighted Liquid example mixed template literals with `<span>` elements and lost track of nesting). TypeScript error: `JSX element 'code' has no corresponding closing tag`. Vercel's prod build would have failed immediately. Rewrote the block with explicit opening/closing tags, HTML-entity-escaped Liquid braces (`{{` → `&#123;&#123;` so JSX doesn't parse them as expressions), and `&quot;` for quote literals. Visual output identical to the spec's intent.

**`apps/landing/` scaffold details:** Next.js 14.2.5 App Router, TypeScript strict mode, Tailwind 3.4.6, `next/font` for Fraunces (display) + Inter (UI) with CSS variables, no client components (full SSG). Brand theme locked to v5.11 Brand Identity (purple `#5A4FCF` accent, warm-white `#FAFAF7` bg). Security headers in `next.config.mjs` (X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin). One redirect: `/demo` → live demo. 9 sections on homepage (Nav/Hero/Problem/Solution/HowItWorks/Pricing/Trust/FinalCTA/Footer). 4 legal pages — privacy + terms + refund + contact — written DPDP-compliant + Razorpay-verification-ready (privacy/terms/refund/contact all visible, pricing visible on `/`, HTTPS-only when deployed). Prod build: all 5 routes prerender as static, 96 KB first-load JS shared, 185 B per-route delta. Typecheck + lint clean.

**`server/scripts/onboard-brand.mjs` design:** YAML-driven Concierge MVP provisioning. Input: brand metadata + 1-N products (each with photoUrls). Flow: signup → mint API key → create products → queue generation → poll until READY/FAILED → emit ready-to-paste email with integration snippet (Shopify + WooCommerce + custom variants). Output: writes `<config>.completed.json` to `brand-onboarding/completed/` (gitignored) and prints the email body to stdout. Caps at 20 products per run (split if needed). Idempotency caveat: signup is not idempotent — re-running with same email returns 409. `--resume <brandId>` flow scoped for v1.1 (not yet implemented; founder workaround is to skip signup and add products via Prisma Studio).

**Files added in `40cf714`:**
- `apps/landing/` (13 files: package.json, tsconfig.json, tailwind.config.ts, postcss.config.mjs, next.config.mjs, .gitignore, app/layout.tsx, app/page.tsx, app/globals.css, app/_components/SimpleNav.tsx, app/{privacy,terms,refund,contact}/page.tsx)
- `server/scripts/onboard-brand.mjs` (with `js-yaml` added to server devDeps)
- `brand-onboarding/example.yaml` + `brand-onboarding/.gitignore` (completed/ excluded)
- `docs/week6-outreach-playbook.md` (cold-email templates + LinkedIn DM templates + 50-brand prospecting tiers)

**Open operational items NOT done in this commit (need founder hands):**
- **Vercel project for `apps/landing/`** — `npx vercel link` is interactive (`vercel login` opens a browser tab); founder must do once locally. Then `npx vercel --prod` for first deploy. Vercel git auto-deploy can be enabled in dashboard Settings → Git → Production Branch = main (one-time fix; same trap that bit `apps/demo` on May 7 — manual `vercel --prod` was needed until git wiring was done).
- **DNS for `rekaman.io`** — Namecheap dashboard, add `A @ 76.76.21.21` and `CNAME www cname.vercel-dns.com`. ~5–30 min DNS propagation + SSL provisions automatically on Vercel.
- **`privacy@rekaman.io` Google Workspace alias** — `apps/landing/app/contact/page.tsx` references this 3 times (Grievance Officer per DPDP s.10, DPDP requests, privacy queries). Currently the only aliases configured are `support@`/`billing@`/`hello@`/`sivasankari@` per CLAUDE.md Account Ownership section. Without `privacy@`, DPDP-mandated grievance email bounces — real legal risk under DPDP Act 2023. 30-second fix in admin.google.com → Users → founder@ → Edit → Email aliases.
- **Razorpay verification** — submit `https://rekaman.io` in Razorpay dashboard → Account & Settings → Business Website Details once landing is live. Razorpay reviews (~24-48 hr) and unlocks live mode keys. Live keys can land before Pvt Ltd is incorporated as long as the sole-prop Razorpay account stays active; migration happens post-COI (~Week 9).

**Deferred to next week (founder explicitly decided May 11):** Razorpay Rize Pvt Ltd registration. Reason: founder wants to focus this week on shipping the landing + first cold outreach round; company-registration paperwork is its own multi-day task with mother-as-2nd-director documents needed. The technical pipeline doesn't depend on incorporation — it can run on sole-prop Razorpay for the first paying brands.

**Verification trail before commit:** `pnpm typecheck` clean on both `@rekaman/server` and `@rekaman/landing`; `pnpm lint` clean on server; `pnpm build` on landing produces 8/8 static pages in 96 KB first-load JS; Next dev server boots, all 5 routes (`/`, `/privacy`, `/terms`, `/refund`, `/contact`) return HTTP 200; homepage content greps confirm "Capture products" / "Place them anywhere" / "rk_live_xxx" / "DPDP" / "WhatsApp" all present.*
*v5.14 (Week 6 Day 3 — landing deployed, SDK iOS bug fixed, iOS AR Quick Look limit surfaced, May 13 2026): Three deploys + one pending architectural decision.

**Deploy 1 — `apps/landing/` LIVE on Vercel** (`https://rekaman-landing.vercel.app`). First `npx vercel --prod` failed with `Error: error TS5083: Cannot read file '/tsconfig.base.json'` because Vercel CLI from `apps/landing/` uploads ONLY that subdirectory — the repo-root `tsconfig.base.json` was never on the build machine, so Next's TS loader couldn't resolve the `extends` path. Fix in commit `9f1ecb5`: inlined the three strict-mode flags the base provided (`forceConsistentCasingInFileNames`, `noUncheckedIndexedAccess`, `noImplicitOverride`) directly into `apps/landing/tsconfig.json` and dropped the `extends`. Same effective config, self-contained, deploys from any working directory. Verified: all 5 routes return 200 on the canonical alias (`rekaman-landing.vercel.app`). Note: the unique deployment URLs (`rekaman-landing-<hash>...vercel.app`) return 401 due to Vercel's default Deployment Protection on Hobby tier — only the canonical alias bypasses; will go fully public when custom domain `rekaman.io` is wired.

**Deploy 2 — Android AR demo verified working end-to-end on prod.** Telemetry confirmed earlier-day WebXR sessions had completed `ar_supported → ar_session_started` chain successfully (18:36 UTC). Founder's Android test initially hung in "View in your room" loading state with camera permission granted but AR never opening. Root cause: stale `sdk.js` cached in browser (5-min browser cache) — referencing an older chunk filename or having a bug since-fixed. After clearing site cache (Chrome → Site settings → `rekaman-demo.vercel.app` + `cdn.rekaman.io` → Clear & reset), AR launched correctly with the real Meshy armchair. **Pattern documented:** any time the SDK is updated, brands' shoppers will hit the new version within 5 min (browser cache TTL) and at most 24 hr (edge cache TTL). For our own testing during dev iterations, manual cache clear is required.

**Deploy 3 — iPhone SDK icon SVG sizing fix.** Founder reported the AR button's leaf-bag icon was missing on iPhone 13 Safari — empty space where the icon should be, with the text "View in your room" alongside it. Root cause: `.icon { width: 20px; height: 20px }` sized the wrapping `<span>`, but the inline SVG inside had no width/height attributes and no CSS rule sizing it. Chrome/Android infer 100% from the flex parent; WebKit follows the SVG spec strictly and renders intrinsic-sized SVG at 0×0 if no explicit dimensions are given. Fix in commit `57fbbf4`: added `.icon svg { width: 100%; height: 100%; display: block }` + `.icon svg path { stroke: currentColor }` (defensive) to the shadow DOM style block in `packages/sdk/src/ui.ts`. Main bundle only (sdk.js, 7.0→7.3 KB raw / 3.0→3.2 KB gzipped) — no chunk version bump needed since `placement-engine-v4.js` was unchanged. Deployed to S3 via `--profile rekaman` IAM user, `/v1/sdk.js` invalidated on CloudFront. Verified bytes-on-CDN match local + `.icon svg` rule present in served JS.

**The iOS AR Quick Look "black-flash" issue — Apple's responsibility, not ours.** Founder's iPhone 13 on iOS 26.4.1 (latest) tapped "View in your room" → iOS showed the standard AR Quick Look transition prompt ("Cancel / View in AR") → user tapped "View in AR" → black screen for ~1 second → bounced back to the webpage. Repeatable. Root cause is NOT iOS version, NOT our SDK, NOT the GLB file integrity — it's Apple's well-known unreliable `.glb` support in AR Quick Look. Apple's AR Quick Look natively prefers `.usdz` (their proprietary format); native `.glb` support was added in iOS 17.4 but is documented as flaky and many GLBs (especially Meshy-generated PBR-textured models) fail silently at decode time. **This is a documented limitation across the AR commerce industry** — IKEA Place, Wayfair, Houzz, Threekit all generate `.usdz` alongside `.glb` for every product. Currently the demo loads our 13.5 MB Meshy GLB on iOS via `<a rel="ar" href="...glb">` which Apple's AR Quick Look bounces.

**Telemetry data backing the iOS limit conclusion:** in the last 24 hours, our `/v1/events` endpoint has logged 13 `ar_supported {platform: ios-quicklook}` events and 1 corresponding `ar_session_started`. The "session started" only means our SDK successfully clicked the `<a rel="ar">` link and handed control to iOS — it does NOT mean AR Quick Look successfully rendered the model. We have NO downstream event to confirm successful rendering on iOS (intentional — we don't instrument inside Apple's native viewer). The "black flash" UX is the rendering failure happening inside AR Quick Look itself, which is opaque to us.

**Pending decision (founder taking time to weigh, May 13 evening) — iOS AR Quick Look support: A / B / C:**

| Option | Effort | Outcome |
|---|---|---|
| **A — Ship Android-only for Phase 1, document iOS as Phase 2** | 0 min | Demo works on Android (95%+ of Indian market). LinkedIn cover images from Android. Cold emails position as "Currently Android Chrome — full iOS support shipping Phase 2." Honest, scoped. |
| **B — Manually convert this ONE GLB to USDZ for the demo** | 20 min (founder does conversion via online tool + uploads, then I wire SDK to prefer USDZ on iOS) | Demo works on iPhone too. Tonight-only fix; new generations still GLB-only. Useful for cold-email demo asset but ages out as soon as we onboard a real brand. |
| **C — Full USDZ pipeline in the generation worker** | ~3 hrs focused (worker change, `Product.usdzUrl` schema column, publicAr endpoint extension, SDK `ios-src` switching, backfill existing demo product) | Production-grade. Every Meshy job from Day 1 produces BOTH GLB + USDZ. SDK auto-selects per-platform. Brands' real customers get the right format on every phone they own. Founder's leaning towards C as of May 13 because positioning Rekaman as "Threekit/IKEA-grade reach across iOS+Android" matters more than 3 hours of build time. |

**Conversion-tool architectural decision (only relevant if C is picked):** Apple's `usd-from-gltf` is Mac-only (won't run on Railway worker which is Linux). Cross-platform alternatives the worker can use: (1) `@google/model-viewer`'s USDZ exporter (npm-installable, runs in headless context, free, mature-enough), (2) `aspose-3d-cloud` (paid SaaS, most reliable, ~$10/mo + per-conversion fee), (3) USD-via-Docker (LinuxFoundation Pixar USD inside a Docker image — most reliable but adds Docker layer to the worker's Railway deploy). Leaning recommendation if C is picked: `@google/model-viewer` exporter first (zero infra, free), revisit only if quality is insufficient.

**Schema impact if C is picked:** new `usdzUrl String?` column on `Product` + index. Public AR endpoint adds `usdzUrl` to response. SDK on iOS uses `usdzUrl` (fallback to `glbUrl` if null for backwards-compat). One Prisma migration, no destructive changes.

**Open operational items NOT done today** (all independent of A/B/C, do tonight or tomorrow regardless):
- **Vercel git auto-deploy** for `rekaman-landing` AND `rekaman-demo`. Settings → Git → Production Branch = `main`, Root Directory = `apps/landing` (or `apps/demo` for the demo project). Without this every push needs manual `npx vercel --prod`. We hit this trap twice on `apps/demo`; do not repeat on `rekaman-landing`.
- **DNS at Namecheap** for `rekaman.io`: A `@` → `76.76.21.21` + CNAME `www` → `cname.vercel-dns.com.`. 5-30 min propagation; Vercel auto-provisions SSL.
- **`privacy@rekaman.io` alias** in Google Workspace. admin.google.com → Users → founder@ → Email aliases → Add `privacy`. Without this, the DPDP Grievance Officer email referenced 3× on `/contact` bounces — a real legal compliance gap under DPDP Act 2023 s.10.
- **Razorpay website verification** at dashboard.razorpay.com → Account & Settings → Business Website Details → submit `https://rekaman.io` once DNS resolves. 24-48 hr review. Live mode keys auto-issued after approval — but live mode is not blocking for Concierge MVP (test mode keys already work).

**Pvt Ltd registration** stays deferred to next week per founder's call on May 11 (focus this week on landing + outreach; company registration is its own multi-day paperwork stream needing mother-as-2nd-director documents).

**Verification trail before commit:** typecheck + lint clean on `@rekaman/sdk` and `@rekaman/landing` and `@rekaman/server`; CDN check on `/v1/sdk.js` confirms the icon-fix bytes match local build; canonical alias `rekaman-landing.vercel.app` returns 200 on all 5 routes; demo URL `rekaman-demo.vercel.app/oslo-sofa` still 200 + AR-functional on Android Chrome.*
*v5.15 (Week 6 Day 4 — iOS AR resolved, founder location corrected, registration paused, Week 7 re-planned, May 14 2026): A strategic + planning update. No code shipped in this entry (implementation is Week 7 Day 1-2); this records the decisions, the location correction, the registration pause, and three roadmap insertions.

**iOS AR Quick Look — DECISION MADE: Option C, trivial path.** The v5.14 footer left A/B/C pending and agonized over a GLB→USDZ conversion-tool architectural decision (`@google/model-viewer` exporter vs `aspose-3d-cloud` vs USD-via-Docker). **That entire decision is moot.** Verified against Meshy's current Image-to-3D API docs (May 14): the task response's `model_urls` object already contains a presigned `usdz` URL alongside `glb` (and `fbx`/`obj`/`stl`). Meshy generates USDZ as part of the same Image-to-3D task we already pay ~30 credits for — we were leaving it on the table. There is NO conversion: the worker already downloads `model_urls.glb`; it just needs to also download `model_urls.usdz` and upload it to S3. This collapses Option C from "~3 hrs + a conversion-library risk" to "~1.5 hrs, zero new dependencies, zero new risk" — i.e. Option C now costs the same as the Option B one-off hack, so we do C (production-grade, every job from Day 1 produces both formats). This is exactly how IKEA Place / Wayfair / Threekit operate: they request both formats from their 3D source and serve per-platform; they do not run conversion pipelines. Apple's AR Quick Look natively prefers `.usdz`; serving native USDZ to iOS eliminates the iPhone-13 black-flash (the flaky-Apple-`.glb`-decode path diagnosed in v5.14).

**USDZ pipeline implementation spec'd** (`docs/usdz-pipeline-implementation.md`, 8 changes, deploy-ordered):
1. Prisma `Product.usdzUrl String?` + `usdzSizeKb Int?` — additive, nullable, no index (read on the same row as `glbUrl`), no lock, prod-safe. Migration `v5_usdz_url` deploys BEFORE the worker change.
2. `meshy.client.ts` — Zod schema for `model_urls` gains `usdz: z.string().url().nullish()`; normalized poll result gains `usdzUrl: string | null`. Same `.nullish()` defensive parsing convention as v5.6.
3. `s3.client.ts` — `s3Keys.productUsdz(brandId, productId, attempt)` sibling of `productGlb`, same `v{attempt}` versioned namespace (immutable-cache contract preserved — a regen gets `v2/`, never overwrites `v1/model.usdz`). USDZ content type `model/vnd.usdz+zip`.
4. `generation.worker.ts` — USDZ download+upload as a **best-effort sibling of GLB**, mirroring the existing thumbnail pattern ("logged-not-thrown" per v5.7). Reuses the SAME `downloadWithTimeout` AbortController-60s helper (no second downloader). USDZ failure NEVER fails the job — Android users must be unaffected if one product's USDZ download fails. New Sentry `failure_class`: `usdz_pipeline_soft_fail` (level: warning, not error). Breadcrumb `usdz uploaded` on success.
5. `generation.repository.ts` — `markProductReady` input + Prisma update extended with `usdzUrl`/`usdzSizeKb`. Brand-scoped `where: { id, brandId }` (tenant-isolation layer 3 — fix the where-clause here if it isn't already compound). Only-file-touching-Prisma rule preserved.
6. `publicAr.service.ts` — response gains `usdzUrl` (null-safe). Cache-contract note: the cached public-AR response shape changed; short TTLs self-heal, long TTLs need a bust for the demo product post-backfill. Shared-types updated to keep SDK+server in sync.
7. SDK `ar-launcher.ts` iOS branch — `const iosHref = product.usdzUrl ?? product.glbUrl;` (USDZ preferred, GLB fallback for pre-pipeline products / soft-fails). Telemetry `ar_session_started` gains `format: 'usdz' | 'glb-fallback'` so the Week 9 analytics dashboard can flag brands whose products predate USDZ and need a regen. Android/WebXR placement path UNCHANGED — `placement-engine-v4.js` untouched, **no chunk version bump** (main-bundle-only change → `sdk.js` redeploy + CloudFront invalidate `/v1/sdk.js` only, per SDK Release Workflow).
8. Backfill: regenerate the demo `oslo-sofa` product (Meshy task outputs are ephemeral `?Expires=` — the original task's USDZ URL is long gone, so the only correct backfill is a fresh generation, which now captures USDZ automatically). Verify `curl /v1/ar/.../oslo-sofa` returns non-null `usdzUrl`, then iPhone-13 Safari (clear site cache per v5.14's 5-min-SDK-cache rule) → AR Quick Look opens armchair with no black flash. Android regression check mandatory.
Zero additional Meshy cost (USDZ is already produced by the task we pay for). S3 delta ≈ one extra ~10-15 MB file per product — negligible at Phase 1 scale.

**Founder location corrected: Thanjavur, not Chennai.** The founder is based in **Thanjavur, Tamil Nadu** (native place; builds Rekaman from home there) and works **remotely** for a Chennai-based CRM company. Prior CLAUDE.md + the landing site + all 4 legal pages incorrectly said "Chennai." Corrected in 9 places. Two-tier convention locked: **customer-facing marketing/video copy says "Built in Tamil Nadu"** (Thanjavur is less nationally recognized than the state, weaker trust signal to a Mumbai/Delhi brand); **legal / registered-office / DPDP-grievance blocks say "Thanjavur, Tamil Nadu"** (precision legally required). The Pvt Ltd registered office MUST be the Thanjavur home address — it must match where Rekaman actually operates; a wrong registered office means a costly post-COI amendment filing. ROC Chennai is unaffected: it is the Registrar of Companies for *all* of Tamil Nadu, so a Thanjavur company files with ROC Chennai by jurisdiction (not founder location) — still 100% online, zero travel. The remote-CRM-employment detail is internal context only and must NOT appear in any customer-facing or legal surface. NOT changed: example brand name "Woodcraft Chennai" (a hypothetical customer, not the founder) and the outreach target-metro list "Chennai/Bangalore/Mumbai" (where prospect brands are, irrelevant to founder location).

**Pvt Ltd registration paused ~1 week — deliberate, documented, non-blocking.** Founder lost the physical PAN card (has only a low-quality image, which will not pass Razorpay Rize KYC). Compounding: the email originally linked to the PAN is also lost, so the NSDL e-PAN retrieval path is also blocked. Physical PAN reissue has been applied for; ETA ~1 week (may push incorporation into Week 7-8). PAN is mandatory for the Razorpay Rize KYC video verification call, so incorporation is correctly paused until the card physically arrives. **This blocks nothing technical or commercial:** per Plan A (v5.11) the Concierge MVP runs on the existing sole-proprietor Razorpay account; the first paying brands do not require the Pvt Ltd to exist. Mother's director documents are already collected. The pause is a sequencing decision, not drift — the high-leverage use of this week is the USDZ pipeline + outreach, not waiting on paperwork.

**Three roadmap insertions (Phase 1):**
1. **USDZ pipeline → Week 7 Day 1-2, P0.** Must land before the first paying brand's shoppers hit AR — without it the product is Android-only and cold emails cannot honestly claim iOS support.
2. **Environment isolation → Week 7 Day 3, P0, before customer #1.** Currently everything runs in one environment; a bad `git push` while a paying brand's shoppers are mid-AR-session could break live customer traffic. Fix (≈2 hrs, solo-dev-appropriate, cheap): a long-lived Neon `staging` branch off prod (Neon branching was already a Locked Architecture decision — now operationalized: local `.env` `DATABASE_URL` = staging branch, NEVER prod) + a Railway `staging` environment (separate api+worker, scale-to-zero ≈ ₹0 idle, separate Upstash free instance) + branch-based deploy (`main`→production, `dev`→staging). Discipline: never run dev code against prod DB/API; prod deploys only after staging is green. The SDK side is already safe (the `/v1/` versioning + immutable-chunk discipline means a bad SDK deploy is rollback-by-re-upload and doesn't instantly break everyone); this closes the DB/API side. A focused step-by-step setup guide (Railway + Neon + GitHub Actions branch-deploy) is the next deliverable after this.
3. **Hosted viewer + desktop QR fallback → Week 8, India-market-critical.** Solves two gaps with one small build (≈1-1.5 days, one dynamic Next.js route reusing the existing public AR endpoint + a tiny client-side QR lib): (a) desktop has no AR — detect desktop → show QR → shopper scans with phone → AR opens on phone (every competitor does this; critical for laptop sales-demo "scan & feel it now" closing moments); (b) small Indian brands often have no per-product page (one-pager site / WhatsApp Business catalog / Instagram shop / Linktree) so the standard `<div data-rk-product>` integration has nothing to attach to — a Rekaman-hosted viewer page (`view.rekaman.io/{brandSlug}/{productSlug}`) needs no brand website at all; brand gets a link + QR for packaging / WhatsApp / Instagram bio / visiting card. The QR target IS the hosted-viewer URL, so (a) and (b) are the same build. Roughly doubles the Indian addressable market (WhatsApp/Instagram commerce dominates the small end far more than Shopify) and reinforces the India-first defensibility thesis. Was not in the original 5-phase roadmap — promoted into Phase 1 on leverage + India-fit + small build size.

**Week 7 re-planned day-by-day** (see "Plan A — Weekly Breakdown → Week 7"): Day 1 USDZ Changes 1-6 (migration→server), Day 2 USDZ Change 7-8 (SDK + demo backfill + device verification), Day 3 environment isolation, Day 4-5 dashboard scaffold P1 (Next.js skeleton + auth pages reusing `/v1/auth/*` + shadcn/ui + onboarding wizard + brand switcher), Day 6-7 first-customer Concierge onboarding if a brand said yes, else hosted-viewer spike. Demo calls run in evenings throughout — and post-USDZ they can be run on BOTH iPhone and Android, which materially strengthens the close.

**No CLAUDE.md technical-section edits.** All 17 technical sections (Locked Architecture, SDK Philosophy, Server Module Structure, Implementation Patterns, Operational Runbooks incl. Generation Pipeline Runbook, Database Schema, Feature Catalog, etc.) are byte-unchanged. v5.15 edits are confined to: Founder Context (location), the Pvt-Ltd registration table + v5.11 company-structure changelog (Thanjavur), three marketing-copy "Chennai"→"Tamil Nadu" strings, Current Status, the Week 7-8 Plan-A breakdown, and this footer entry. The Database Schema's `usdzUrl`/`usdzSizeKb` columns are documented here in the changelog (additive, per the "Schema is additive" principle) and will be reflected in `schema.prisma` when Week 7 Day 1 ships — the schema section in this doc is not retro-edited until code lands, matching the established "doc reflects shipped code, changelog reflects decisions" discipline.*
*v5.16 (Week 7 Day 1 — USDZ pipeline SHIPPED to prod, May 16 2026): The v5.15 spec's 8 changes landed in commit `16b5dca` and deployed clean. iOS now serves Apple-native USDZ via AR Quick Look; Android WebXR placement path is byte-unchanged. Implementation closely mirrored the spec but with seven production-grade adaptations that the spec couldn't have known without reading the live codebase.

**Deviations from the v5.15 spec, all production-grade:**

1. **`meshy.client.ts target_formats` was the critical fix.** The spec assumed the Meshy poll response would naturally contain `model_urls.usdz`. It did not. Meshy's Image-to-3D API only generates the formats listed in the `target_formats` parameter of the *create* call — and our default was `['glb']`. Adding `'usdz'` to the default + forcing it in `generation.service.ts` was the actual functional change that makes USDZ appear in the response. The Zod schema parsing + mapping in meshy.client.ts (already had `.nullish()` on `model_urls.usdz` per v5.6 convention) needed no edit — they were ready for a field that wasn't there yet. **Without this change, every step of the spec would have appeared to work but produced `usdzUrl: null` on every product forever.** This was the only landmine in the whole implementation.

2. **Local Neon endpoint unreachable from the dev environment** — and this turned out to be an *environment* issue, not Neon hibernation. Railway api shows `db: up` continuously, but `bash> /dev/tcp/ep-quiet-moon-...` always times out, including via the pooler endpoint. Network egress from this shell to Neon hosts is blocked (likely a CGNAT/firewall thing specific to the dev machine). `prisma migrate dev --create-only` was unusable. **Workaround:** wrote the migration SQL by hand into `server/prisma/migrations/20260516222636_v5_usdz_url/migration.sql` (a single `ALTER TABLE Product ADD COLUMN ... usdzUrl TEXT, usdzSizeKb INTEGER`), then changed `server/package.json`'s `start` script from `node dist/server.js` to `prisma migrate deploy && node dist/server.js`. Railway api's network CAN reach Neon, runs `prisma migrate deploy` on every redeploy (idempotent — only applies pending migrations), then boots normally. Verified: api uptime reset to 87s post-push, `db: up`, schema column now exists, `publicAr` returns `usdzUrl: null` for pre-pipeline products (correct shape). **The auto-migrate pattern is safe for additive-only migrations** (which is our schema discipline — see Core Principle #13). For destructive migrations we'd want a separate manual gate; not in scope.

3. **`launchIosQuickLook` was already a separate function**, not inline in `index.ts` as the spec assumed. Refactored its return type from `void` to `IosQuickLookFormat = 'usdz' | 'glb-fallback'` and threaded the value through to `track('ar_session_started', { ..., payload: { format } })` in `index.ts`. Cleaner than the inline-conditional shape the spec sketched.

4. **`markProductReady` signature uses `version` (not `attemptNumber`) and takes `thumbnailUrl?`** — the spec was reading the v5.5/v5.7 docs which used `attemptNumber`; the actual codebase had renamed to `version`. No semantic difference; matched the existing convention.

5. **`uploadToProductsBucket` signature is `(key, body, contentType, cacheControl?)` not `putObject({key, body, contentType, ...})` as the spec sketched.** Adapted the worker call accordingly. Spec also referenced `downloadWithTimeout`/`publicUrlFor`/`analytics.fire` which don't exist by those names — adapted to `downloadToBuffer`/`publicProductUrl`/`track`.

6. **USDZ block placement in worker: AFTER thumbnail, BEFORE markProductReady.** This ordering matters: (a) GLB must succeed first (it's the gating asset — without it the job fails permanently and USDZ is moot); (b) thumbnail is also best-effort and comes next; (c) USDZ is the *third* best-effort, with the same logged-not-thrown pattern. If USDZ failed AFTER `markProductReady`, the product would be READY with usdzUrl=null and a "regen needed" footnote — workable but messier than just deferring markReady by ~3s while USDZ uploads. Now `markProductReady` is called once at the end with both URLs (or null for whichever asset soft-failed). Sentry `failure_class: 'usdz_pipeline_soft_fail'` (warning level, not error) per v5.15 spec.

7. **`generation.service.ts` forces `target_formats: ['glb', 'usdz']`** as a pipeline contract, not a caller-overridable default. This protects future Concierge MVP brands from accidentally being given USDZ-less products if someone forgets to pass the flag. The Meshy client default ALSO has `['glb', 'usdz']` as a belt-and-suspenders second line of defense — if someone calls meshy.client directly (e.g. from a future regen script), they get USDZ too.

**Deployment trail (May 16 2026, ~23:00 UTC):**
- **Commit:** `16b5dca` — `shiva | feat(usdz): production iOS AR Quick Look via Meshy USDZ pipeline` — 14 files, +229 / −33 lines.
- **Push to main → Railway auto-redeploy:** api uptime confirmed reset (87 s post-push), `db: up`, `prisma migrate deploy` succeeded (else api wouldn't have booted) — schema migration applied without manual intervention. Worker also redeploys on the same git trigger (no public health endpoint to verify — relies on the next live regen job to prove the USDZ download path).
- **SDK rebuild + deploy via `--profile rekaman`:** `sdk.js` grew 7.3 KB → 7.4 KB raw (3.0 → 3.2 KB gzipped) — well under the 50 KB main-bundle budget. Chunk `placement-engine-v4.js` **unchanged** (Android path untouched), no chunk version bump needed. `aws s3 cp` to `s3://rekaman-sdk-prod-…/v1/sdk.js` with the standard `max-age=300, s-maxage=86400, stale-while-revalidate=86400` cache headers; `aws cloudfront create-invalidation /v1/sdk.js` on distribution `E1L37VUXZMO4QV`. 75 s later: `diff <(curl cdn) dist/sdk.js` → MATCH, `x-cache: Miss from cloudfront`, content-length 7605. SDK Release Workflow followed to the letter (positive `aws sts get-caller-identity` verifies `rekaman-deploy-cli` IAM user — root never used).
- **publicAr shape verification (pre-backfill):** `curl https://api.rekaman.io/v1/ar/rk_live_…/oslo-sofa` now returns `usdzUrl: null` for the existing demo product (correct — predates the pipeline). Glb path unchanged.
- **Backfill of demo product:** handed off to founder via three-line curl (this shell's network can't reach Neon; founder's laptop can). Uses `scripts/mint-jwt.mjs` to mint a founder-brand JWT, creates a new `usdz-test-armchair` product on the founder brand, triggers generation with the same Pexels armchair URL (`https://images.pexels.com/photos/447592/pexels-photo-447592.jpeg`), polls until READY, then verifies the response has non-null `usdzUrl`. Once verified, the demo HTML's `data-rk-product` can be swapped to the new slug (one-line edit) — or the demo brand's product can be re-pointed via a one-off DB-update script that the founder runs on their network.

**Dev-environment Neon-reachability discovery (a new operational gotcha):**
- The dev shell's network egress to Neon (`ep-quiet-moon-ao50xygk*.c-2.ap-southeast-1.aws.neon.tech:5432`) is blocked — both direct AND pooler endpoints. Railway, founder's laptop, and the api service all reach Neon fine. This is NOT documented in v5.10 Gotcha #4 (which was about Neon's own hibernation). Effect: **any `prisma migrate dev` / `prisma migrate status` / `scripts/*.mjs` that hits the DB will fail from this dev shell.** Two implications: (a) all migrations must be either hand-written + Railway-applied (this PR's approach), OR run from a different shell; (b) any operational script (mint-jwt, list-users, recover-stuck-generation, regen-product) must be run by the founder on their own laptop, not from this shell. Recommend adding to the Generation Pipeline Runbook's Gotchas in a future Week 7 commit once a clean reproduction path is established.

**Verification still pending (founder-side, post-regen):**
- iPhone 13 Safari: open demo URL (clear site cache per v5.14 SDK-cache rule) → tap "View in your room" → AR Quick Look opens armchair on the floor at real scale with NO black flash. Apple-native USDZ path proven end-to-end.
- Android Chrome regression: same demo URL → WebXR placement still works (model on floor, doesn't follow camera, scale correct). `placement-engine-v4.js` is byte-unchanged so this should not regress; verifying anyway.
- `ar_session_started` telemetry with `payload.format: 'usdz'` (iOS) and `format: undefined` or platform-only (Android) appears in `/v1/events` — gives Week 9 analytics the per-brand USDZ-coverage signal.

**Cost actually spent:** zero Meshy credits in the pipeline-implementation phase (USDZ comes free with the GLB task — confirmed by the spec, now confirmed by the deployment). The founder-triggered backfill is ~30 credits (~₹40-80) for the demo verification — accounted for in plan A, not a surprise spend.

**Files changed (14):** `CLAUDE.md` (v5.15 strategic content from the previous session + this footer), `packages/sdk/src/{api-client,ar-launcher,index}.ts`, `server/package.json`, `server/prisma/schema.prisma` + new `server/prisma/migrations/20260516222636_v5_usdz_url/migration.sql`, `server/src/modules/generation/{repository,service}.ts`, `server/src/modules/publicAr/{service,types}.ts`, `server/src/shared/clients/{meshy,s3}.client.ts`, `server/src/workers/generation.worker.ts`.

**What's next on Week 7's slate:** (a) founder runs the regen + verifies on iPhone, (b) Day 3 environment isolation (Railway staging env + Neon staging branch + branch-based deploy — closes the "bad prod push" gap before customer #1), (c) Day 4-5 dashboard scaffold P1, (d) DNS for rekaman.io + Vercel git auto-deploy + privacy@ alias + Razorpay verification (open ops items from v5.13/v5.14, blocked nothing technical, ready to ship in any order).*
*v5.17 (Week 7 Day 1-2 close — iPhone verified, all open ops items shipped, May 17 2026): Today closed every Week 7 Day 1-2 deliverable AND every open ops item that had been deferred from v5.13/v5.14. Zero items remain in the "must-do-before-customer-#1" backlog. Tomorrow opens Day 3 (environment isolation) with a clean slate.

**Verifications completed on real devices (the proof v5.16 was waiting for):**
- **iPhone 13 Safari, iOS 26.4.1, founder's home network 4G**: opened `demo.rekaman.io/oslo-sofa.html` → tapped "View in your room" → AR Quick Look opened the armchair on the floor at real scale with NO black flash. ~5-second load (15.2 MB USDZ over 4G/2-bars; physics, not a bug). Apple's "AR / Object" toggle inside Quick Look also works — the "Object" mode shows the armchair as an orbital 3D preview on a black background (free Apple bonus that comes with USDZ; we ship two viewing modes for one Meshy generation). Screenshots captured for use as cold-email demo asset.
- **Android Chrome regression**: same URL, WebXR placement-engine-v4 path UNCHANGED from v5.12 — model sits on floor, doesn't follow camera, scale correct. No regression from the USDZ pipeline (as designed — the iOS code path is fully separate from the Android one).

**Bug caught + fixed in the same session (the v5.16 implementation's only landmine):** `generation.service.ts getGenerationStatus()` was returning `{ productId, status, glbUrl, glbSizeKb, generation, updatedAt }` but NOT spreading `usdzUrl` / `usdzSizeKb` despite the repo SELECT including them. The publicAr endpoint exposed USDZ correctly; the status endpoint hid it. Caught by founder's first `curl /generation-status` post-regen — response showed `glbUrl` present but `usdzUrl` absent. Direct S3 HEAD on the expected `v1/model.usdz` key returned `HTTP/2 200 + Content-Type: model/vnd.usdz+zip + Content-Length: 15,185,743` proving the worker DID download + upload USDZ; only the status endpoint's return shape was wrong. Fix: 5-line spread of `usdzUrl: product.usdzUrl, usdzSizeKb: product.usdzSizeKb` with an inline comment referencing the May 17 catch + the product id (`cmp9ssxc9000137sz4cfdch4h`) so future-Claude can trace it. **Lesson for future schema-additive PRs**: when adding a Product column, grep for ALL service-layer projections that return product data — repo SELECT + service spread + publicAr response + dashboard types are FOUR places to update; missing the service spread (one of those four) was the v5.16 miss.

**Demo wired to USDZ — preserves the public URL `demo.rekaman.io/oslo-sofa`:** new `server/scripts/update-demo-with-usdz.mjs` updates the demo brand's `oslo-sofa` product to point at the fresh founder-brand-scoped GLB + USDZ pair (`brands/cmotyhdv20002uig5vxldw4g8/products/cmp9ssxc9000137sz4cfdch4h/v1/{model.glb, model.usdz}`). Cross-brand asset reference is intentional per v5.10 ("public bucket, unguessable cuid keys, no security cost"). Founder ran the script on her laptop (this dev shell can't reach Neon per v5.16 Gotcha). Idempotent — re-running re-applies same values.

**DNS deploys (Week 7 Day 1-2):** Two new custom domains live, both via Namecheap CNAMEs + Vercel custom-domain wiring + ACM SSL auto-provisioned:
- `rekaman.io` (apex) — added to `rekaman-landing` Vercel project. **Apex is now primary**; `www.rekaman.io` returns 308 → apex (canonical-redirect convention for SEO, also lets cold-email signatures use the shorter `rekaman.io` without a redirect bounce). Verified: `curl -sI https://rekaman.io` → `HTTP/2 200`, `curl -sI https://www.rekaman.io` → `HTTP/2 308 + location: https://rekaman.io/`.
- `demo.rekaman.io` — added to `rekaman-demo` Vercel project. The old `rekaman-demo.vercel.app/oslo-sofa.html` URL still resolves (Vercel retains both domains automatically — important because earlier cold outreach assets already use it), but all NEW codebase references point to `demo.rekaman.io`. Swept: `apps/landing/app/page.tsx` `DEMO_URL` constant, `apps/landing/next.config.mjs` `/demo` redirect destination, `docs/week6-outreach-playbook.md` (6 references in cold email templates + LinkedIn DMs + video script), `CLAUDE.md` Current Status + Live URLs + cross-service health-check command.

**Razorpay website verification approved.** Submitted `https://rekaman.io` via dashboard → Account & Settings → Business website details. Chose "No" for "Does your website require users to login to complete a payment?" — correct because the site itself collects no money; payments happen via Razorpay Payment Links (Concierge MVP, Week 7-8) or via embedded Checkout on the future `dashboard.rekaman.io` (Week 10+). If "Yes" had been chosen, Razorpay would have asked for test credentials for a non-existent login flow → verification would have stalled. **Live mode keys auto-issued post-approval.** Migration sole-prop → Pvt Ltd is post-COI per Plan A.

**`privacy@rekaman.io` Google Workspace alias added.** admin.google.com → Users → founder@rekaman.io → Email aliases → Add `privacy` → Save. Closes the DPDP Act 2023 §10 compliance gap that's been open since v5.13 (the privacy + contact pages reference `privacy@rekaman.io` as the Grievance Officer email three times; without the alias, those emails would bounce — a real legal exposure even pre-revenue). Founder verified the alias by sending herself a test message that landed in the founder@ inbox.

**Vercel git auto-deploy verified working.** Settings → Git → Production Branch = `main` set for both `rekaman-landing` and `rekaman-demo` projects per v5.13. Today's three commits (`16b5dca`, `0aadc9e`, `98c8ae3`) all auto-deployed within ~60s of push — no manual `npx vercel --prod` needed. The v5.13/v5.14 "manual deploy trap" is now fully closed.

**Files changed today (cumulative across the 4 commits):** server: `package.json` (start script auto-migrate), `prisma/schema.prisma` (+2 cols), `prisma/migrations/20260516222636_v5_usdz_url/migration.sql` (new), `src/modules/generation/{repository,service}.ts`, `src/modules/publicAr/{service,types}.ts`, `src/shared/clients/{meshy,s3}.client.ts`, `src/workers/generation.worker.ts`, `scripts/update-demo-with-usdz.mjs` (new). sdk: `src/{api-client,ar-launcher,index}.ts`. landing: `app/page.tsx`, `app/_components/SimpleNav.tsx`, `app/contact/page.tsx`, `app/privacy/page.tsx`, `app/terms/page.tsx`, `next.config.mjs`. docs: `week6-outreach-playbook.md`. CLAUDE.md (v5.15/5.16/5.17 footers + Current Status + Live URLs + Product schema usdzUrl/usdzSizeKb addition per the v5.15 promise that schema additions get reflected once code lands).

**Schema additions reflected in CLAUDE.md now that code has shipped:** `Product.usdzUrl String?` + `Product.usdzSizeKb Int?` — additive, nullable, no index (read on the same row as `glbUrl`), per Core Principle #13 "Schema is additive". The schema section (Database Schema → Product model) is retro-edited TODAY (not at v5.16 ship time) to match the doc discipline "doc reflects shipped code, changelog reflects decisions."

**Pre-Week-7-Day-3 decision locked: environment isolation FIRST, outreach SECOND.** Founder explicitly chose this over the other two options (cold outreach now / dashboard scaffold first). Reasoning: a bad `git push` while a paying brand's shoppers are mid-AR-session is exactly the kind of incident that turns a customer into a churn statistic at month one. Closing the gap pre-emptively while at zero paying customers is much cheaper than recovering from a prod incident after a paying brand is live. Day 3-4 plan: long-lived Neon `staging` branch off prod (separate compute endpoint, scale-to-zero ≈ ₹0 idle) + Railway `staging` environment (separate api+worker services pointing at staging Neon, separate Upstash free tier) + GitHub Actions branch-based deploy (`main` → production as today, new `dev` → staging). Local `.env` switched to staging branch — founder's laptop NEVER touches prod DB again. Discipline: prod deploys only after staging is green. ~2-3 hrs active work. Day 5-7: 30 cold emails + 15 LinkedIn DMs + first paying brand onboarded via Concierge MVP.

**Status of every Week 6/7 open ops item (audit before Day 3):**
- [x] Demo working on Android (Week 6 Day 1, v5.12)
- [x] Demo working on iPhone (Week 7 Day 1, v5.16/5.17 — USDZ pipeline)
- [x] Landing site `rekaman.io` deployed (Week 6 Day 3, v5.13/5.14)
- [x] `rekaman.io` DNS + custom domain + SSL (Week 7 Day 2, v5.17)
- [x] `demo.rekaman.io` DNS + custom domain + SSL (Week 7 Day 2, v5.17)
- [x] Vercel git auto-deploy for both projects (Week 7 Day 2, v5.17)
- [x] Razorpay website verification (Week 7 Day 2, v5.17)
- [x] `privacy@rekaman.io` Google Workspace alias (Week 7 Day 2, v5.17)
- [x] Apex/www redirect direction correct (Week 7 Day 2, v5.17)
- [ ] Pvt Ltd registration (paused awaiting PAN reissue, ~5 more days — not blocking)
- [ ] Environment isolation (Week 7 Day 3 — tomorrow)
- [ ] Dashboard scaffold (Week 7 Day 4-5 — after staging)
- [ ] First paying brand (Week 7 Day 5-7 — after dashboard scaffold OR after first 30 cold emails replies, whichever comes first)*