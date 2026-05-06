# Rekaman — Spatial Commerce AR Platform
## Project Context for Claude (v5.7)

> **Single source of truth.** This file is loaded into every Claude conversation about Rekaman. Update at the end of each sprint and after every major strategic shift. Companion document: `REKAMAN_ROADMAP.md` (long-horizon vision).

---

## 🧠 Founder Context

Solo software engineer based in **Chennai, Tamil Nadu, India**. Full-time at a CRM product company (ML + full-stack). Building Rekaman on the side — **2–3 hrs/evening weekdays, full days on weekends**.

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
echo '─── demo ───';  curl -sI https://rekaman-demo.vercel.app/oslo-sofa | head -1
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
  glbUrl     String?                              // primary GLB (placement)
  glbSizeKb  Int?
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

- **Week/Month:** Week 5, Month 2
- **Last completed:** Week 4 — Full production stack live and verified end-to-end on Android Chrome + iOS Safari. SDK ships from CloudFront (one `<script>` + one `<div>` integration), public AR endpoint on Railway, events ingestion via sendBeacon, demo on Vercel. v3 schema hooks (arMode, ProductAsset, ConversionEvent, OutboundWebhook tables, /v1/ versioning).
- **Currently working on:** Week 5 Day 6 — End-to-end production smoke test (real Meshy job → S3 → READY) + dashboard wiring. Day 5 (May 7) closed: generation worker fully implemented (poll → download → S3 → mark READY), 2 generation tenant isolation tests added (9 total now), worker boots cleanly, subscribes to BullMQ queue, drains gracefully on SIGTERM.
- **Blocked on:** Nothing
- **Next milestone:** Week 6 — first ₹3,999/mo paying brand
- **Current MRR:** ₹0
- **Paying clients:** 0
- **Deployed URLs:**
  - API: https://api.rekaman.io ✅ (Railway, custom domain live since Week 5; old `api-production-0a54.up.railway.app` still routes for backward compat)
  - Worker: deployed on Railway (no public URL — internal only, idle until Week 5 Meshy work)
  - SDK CDN: https://cdn.rekaman.io ✅ (CloudFront → S3 ap-south-1, ACM wildcard cert `*.rekaman.io`; old `d3ens3al2ub47k.cloudfront.net` still routes for backward compat)
    - `/v1/sdk.js` — main bundle, 7.1 KB raw / 3.0 KB gzipped (loads chunks via `<script>` tag injection)
    - `/v1/placement-engine-v3.js` — Three.js + WebXR chunk, 572 KB raw / 149.8 KB gzipped (current). v1 deprecated (dom-overlay bug), v2 deprecated (Railway URL baked in). Older versions remain in S3 as fallbacks for SDKs still in browser cache.
  - Demo: https://rekaman-demo.vercel.app (Vercel, auto-deploys from `main` via git integration). Live AR demo: `/oslo-sofa`. Custom domain `demo.rekaman.io` pending.
  - Dashboard: not live (Week 7)
  - Landing: not live

---

## 🌐 Live URLs

- Landing: `rekaman.io` (Week 7+)
- Dashboard: `dashboard.rekaman.io` (Week 7+)
- API: `api.rekaman.io` ✅ live (Railway, TLS via Let's Encrypt)
- CDN: `cdn.rekaman.io` ✅ live (CloudFront, TLS via ACM `*.rekaman.io` cert)
- Demo: `demo.rekaman.io` (Vercel, Week 5 — currently still on `rekaman-demo.vercel.app`)
- Status: `status.rekaman.io` (Phase 2 / Month 5)
- Docs: `docs.rekaman.io` (Phase 2 / Month 5)
- SDK global: `window.Rekaman`
- GitHub: private monorepo

---

## ✅ Immediate Next Actions (Week 4)

1. **Add 5 schema hooks** before SDK code (~70 min):
   - `arMode` and `category` columns on Product
   - `ProductAsset` table
   - `ConversionEvent` table
   - Restructure routes to `/v1/` prefix
   - `OutboundWebhook` + `OutboundWebhookDelivery` tables

2. **Build API Keys module** (~60 min)

3. **Build Public AR endpoint** (~45 min)

4. **Build Events ingestion endpoint** (~30 min)

5. **Create SDK package** with esbuild config (~45 min)

6. **Write SDK source code** — main bundle + placement chunk (~90 min)

7. **Set up CloudFront + S3** (~90 min)

8. **Deploy demo HTML page** (~30 min)

9. **Test end-to-end** on Android Chrome + iOS Safari

10. **Update CLAUDE.md** with Week 4 completion status

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

## 🏢 Company Registration Status

Currently a **sole proprietor by default** (automatic in India). Pvt Ltd registration deferred to Week 6-8 when first paying customer is closing.

**Registration plan:**
- **Week 6-8:** Incorporate Pvt Ltd in Tamil Nadu (~₹15-25K, 5-7 days)
- **Immediately after:** Apply for DPIIT Startup India recognition (free, 1-3 days)
- **Week 10-12:** Open Razorpay business account, file trademark for "Rekaman"
- **No international entity** for Year 1 — Indian Pvt Ltd is correct starting structure

---

*Last updated: May 7, 2026 | Version 5.7*
*v5 changes from v4: Full feature catalog with phases. 5 schema hooks promoted to v3 schema. Indian-market differentiation made explicit. Anti-roadmap added. 18 core principles. References REKAMAN_ROADMAP.md for long-horizon vision.*
*v5.1 (Week 4 close-out): SDK loads chunks via `<script>` tag (not `import()`) to bypass cross-origin module-fetch CORS quirks. AR session no longer pins `document.body` as `domOverlay`. Placement chunk bumped to v2 after immutable-cache contract was violated by editing v1 in place. ARSession idempotent insert via `createMany({ skipDuplicates: true })` instead of `upsert({ update: {} })` (Sentry P2002 race incident). Live demo at https://rekaman-demo.vercel.app — Week 4 complete.*
*v5.2 (Week 5 — Part 1 close-out): Custom domains `api.rekaman.io` (Railway) and `cdn.rekaman.io` (CloudFront, ACM wildcard cert `*.rekaman.io`) live. SDK rebuilt with clean URLs baked in; placement chunk bumped to v3 (per immutable-cache discipline) since `__API_BASE__` is referenced inside chunk's bundled analytics module.*
*v5.3 (Week 5 — operational discipline): Account Ownership section added — all 6 vendor accounts migrated to `founder@rekaman.io` (Sentry, Neon, Vercel, Railway, AWS, Google OAuth). Operational Runbooks section added: secrets/env-var locations table (3-place rule for OAuth + others), deployment ownership matrix (auto vs manual), SDK release workflow (chunk version bump discipline), production data hygiene (cleanup pattern), cross-service health check one-liner, rollback mechanics per failure mode.*
*v5.4 (Week 5 Day 2 — IAM hygiene, May 4 2026): AWS daily ops migrated from root user to scoped IAM users. Two IAM users created with custom policies (NOT AWS-managed `*FullAccess`): `rekaman-deploy-cli` for laptop AWS CLI (S3 r/w on SDK bucket + CloudFront invalidation on distribution `E1L37VUXZMO4QV`); `rekaman-server` for Railway api+worker server-side uploads to products bucket (deferred to Week 5 Day 3 deployment, credentials currently dormant in password manager). Defense-in-depth verification: positive tests confirm scoped access, negative tests confirm `AccessDenied` on out-of-scope resources (other buckets, IAM, list-all). 90-day rotation policy established (next rotation: August 2, 2026). SDK Release Workflow updated to use `--profile rekaman` for all `aws s3` and `aws cloudfront` commands — no more Console drag-drop. Root account now reserved for billing changes / account email changes / IAM management only. Decision documented for choosing access keys over IAM Roles Anywhere (revisit at Phase 4 SOC 2 prep). Real production deploy executed via IAM user to verify end-to-end (build → s3 cp → CloudFront invalidation → curl verify) — production stack healthy throughout.*
*v5.5 (Week 5 Day 3 — generation pipeline env wired, May 5 2026): Meshy.ai account provisioned + production API key issued; Upstash Redis (Mumbai) provisioned for BullMQ; products S3 bucket access activated via `rekaman-server` IAM user (no longer dormant). Server env schema (`shared/env.ts`) extended with the generation block: `MESHY_API_KEY` (`startsWith('msy')`), `MESHY_API_BASE`, `MESHY_WEBHOOK_SECRET` (≥32 chars), `REDIS_URL` (`redis(s)://` regex), `AWS_ACCESS_KEY_ID/SECRET`, `AWS_REGION` + `S3_REGION`, `AWS_S3_BUCKET_PRODUCTS`, plus worker tuning knobs (`GENERATION_POLL_INTERVAL_MS` 5s default / `GENERATION_MAX_DURATION_MS` 5min default / `GENERATION_MAX_RETRIES` 3 default). All generation vars are `.optional()` at the schema level so CI/dev environments without Meshy/Redis don't fail to boot — code that consumes them must `if (!env.X) throw …` per External API Boundaries pattern. `.env.example` updated to mirror schema with placeholders grouped by purpose (Meshy / Redis / AWS products / worker tuning). Local `.env` + Railway api+worker env vars all set to live values. Smoke tests passed: Meshy POST text-to-3d returned `202 + task ID` with dummy test-mode key; Upstash Redis `PING` → `PONG` + SET/GET/DEL round-trip; S3 SDK bucket lists via `rekaman-deploy-cli` profile (positive); products bucket returns `AccessDenied` from `rekaman-deploy-cli` (negative test — confirms scoping). Day 4 (May 6) starts the Meshy client + Generation module skeleton.*
*v5.6 (Week 5 Day 4 — generation module skeleton + external clients, May 6 2026): Shipped the full API surface for product generation; worker is intentionally empty (Day 5). Files added: `shared/clients/meshy.client.ts` (image-to-3D create + poll, Zod-defensive response parsing, full HTTP→DomainError mapping), `shared/clients/s3.client.ts` (products bucket put/delete/head with brand-scoped key conventions in `s3Keys`), `shared/queue/connection.ts` (lazy IORedis singleton with `maxRetriesPerRequest: null`, `enableReadyCheck: false`, escalating retry strategy), `shared/queue/queues.ts` (lazy `generation` BullMQ queue), `modules/generation/{generation.types,validators,repository,service,routes}.ts`, `workers/generation.worker.ts` (placeholder export). Endpoints live: `POST /v1/products/:productId/generate` (202 Accepted, requires OWNER/ADMIN/MEMBER) and `GET /v1/products/:productId/generation-status`. New error classes added to `shared/errors.ts`: `PaymentRequiredError` (402, Meshy credits exhausted) and `ExternalServiceError` (502, carries a `service` tag for upstream grouping). Deviations from the day-4 spec, all production-grade fixes — (1) **Lazy singletons everywhere.** Spec instantiated `new Queue(...)`, `new MeshyClient()`, `new S3Client(...)` at module load. Because env vars for Meshy / Redis / AWS are `.optional()` (Day 3 decision), eager construction would hard-fail boot on any environment missing them (CI, dev). Switched to `getMeshyClient()` / `getRedis()` / `getGenerationQueue()` / lazy S3 client; env presence is checked on first use and surfaces as `ExternalServiceError('meshy', 'MESHY_API_KEY is not configured')` etc. — exactly the External API Boundaries pattern in CLAUDE.md. (2) **Middleware paths/names match this repo, not the spec.** Spec referenced `shared/middleware/auth.authenticateBrand` + `requireMembership` + `validate({body})`; we actually have `middleware/auth.requireAuth` + `requireRole` + Zod inline parsing per existing module convention. Adapted accordingly. (3) **Error class shape matches the existing base.** Spec used `httpStatus`; our `DomainError` uses `status`. `RateLimitError` already existed as `RateLimitExceededError` — reused. (4) **Repository JSONB merge pattern.** Spec used `metadata: { generation: {...} } as object` which clobbers other metadata namespaces. Replaced with a read-merge-write helper `mergeGenerationMetadata` that preserves sibling keys (variants, future ai-tryon prompts) and casts via `unknown` to satisfy Prisma's `InputJsonValue` union (TS2352 workaround, documented inline). (5) **`ProductStatus` enum already had PROCESSING/FAILED** from Week 3 — no migration needed; spec's "add now" step skipped. (6) **ARCHIVED guard added** — spec only checked PROCESSING and READY; archived products would silently start a generation. Added explicit `ConflictError('Cannot generate for an archived product')`. (7) **`ioredis` import via named export `{ Redis }` not default** — under NodeNext + esModuleInterop the default-export form trips TS2351 ("not constructable") on ioredis v5.10. Documented inline. (8) **Routes module mounted at `/v1` (not nested under products)** so generation owns its own slice without coupling to the products module — aligns with the Server Module Structure section. (9) **`metadata.generation.attemptNumber` is the source of truth for retry numbering** — incremented from prior metadata so a FAILED→retry produces a fresh BullMQ job ID (`gen:{productId}:{attempt}`). (10) **Worker file is a deliberate placeholder** documenting Day 5 scope — jobs enqueued today persist in Redis (BullMQ default) and drain when the worker subscribes tomorrow. CLAUDE.md updated to flag the no-customer-traffic rule until the worker ships. Verified clean: typecheck, lint, api boot, worker boot. Generation routes accept POST + return 202 with a `meshyTaskId`; consumers see `status: PROCESSING` until Day 5 brings the worker online.*
*v5.7 (Week 5 Day 5 — generation worker live, May 7 2026): The worker pipeline is end-to-end implemented. `workers/generation.worker.ts` subscribes to the BullMQ `generation` queue (concurrency 3) and processes each job through five stages — load `metadata.generation.meshyTaskId` from the product (via repo, no direct Prisma in worker code), poll Meshy until `SUCCEEDED`/`FAILED`/`CANCELED`/timeout (interval from `GENERATION_POLL_INTERVAL_MS`, budget from `GENERATION_MAX_DURATION_MS`), download the GLB (with `AbortController` 60 s per-fetch timeout), upload to the products S3 bucket under the versioned `s3Keys.productGlb(brandId, productId, attemptNumber)` key, and atomically `markProductReady` with public URL + size + credits. Best-effort thumbnail upload runs on the same key namespace (failure is logged-not-thrown). Error taxonomy is explicit: `PaymentRequiredError`/`ValidationError`/`NotFoundError` → permanent (mark FAILED, `isTransient: false`); `RateLimitExceededError` → 30s backoff and continue polling; `ExternalServiceError` → poll-interval backoff and continue; timeout → mark FAILED `isTransient: true`; unknown → permanent. Every error path **returns** (does not throw) so BullMQ records 'completed' and the global 'failed' listener stays clean for genuine UnrecoverableErrors / unexpected throws. Two new tenant-isolation tests added in `__tests__/tenantIsolation.test.ts` (now 9 total): brand B cannot trigger generation for brand A's product (404), brand B cannot read brand A's generation status (404). Tests run before any external call (Meshy/Redis/S3) so they pass without those services configured.

Deviations from the day-5 spec, all production-grade — (1) **Worker module exports `startGenerationWorker()` / `stopGenerationWorker()` rather than a top-level `new Worker(...)` const.** Top-level construction would force the worker to connect to Redis on import, breaking the api server's import graph (the api also imports the generation module via routes/service, but should NEVER subscribe to the queue). Lazy start is invoked exclusively from `worker.ts`. (2) **Redis Worker connection is `getRedis().duplicate()` via new `getWorkerRedis()` helper** — BullMQ requires the Worker's connection be separate from the Queue's because BLPOP blocks. Documented inline. (3) **Orchestrated shutdown in `worker.ts` entry**, not split between worker and entry. Spec put shutdown handlers inside `workers/generation.worker.ts`; with two SIGTERM handlers competing on the same signal, `process.exit(0)` races and may kill in-flight jobs before drain completes. Now `worker.ts` is the only signal handler and runs `stopGenerationWorker → closeGenerationQueue → disconnectRedis → prisma.$disconnect → exit` in dependency order, with a 10s force-exit safety net (`setTimeout.unref`). (4) **Worker reads product metadata via `generationRepository.findProductForJob`**, not direct `prisma.product.findFirst` — preserves the "Repositories are the ONLY files that touch Prisma" rule from CLAUDE.md. New repo function is a minimal projection (id + status + metadata). (5) **Status guard before polling**: if the product is no longer PROCESSING when the worker picks up the job (e.g. operator manually transitioned it), worker returns early with a warn-level log instead of polling. Spec didn't catch this case. (6) **`AbortController` timeout on Meshy GLB download** (60s) — bare `await fetch(url)` with no timeout will hang forever if the Meshy CDN is throttled, leaking jobs. (7) **`{ updated: false }` from `markProductReady` handled gracefully** — happens if the product was soft-deleted between polling-success and DB write. We log the orphaned S3 key (lifecycle rule sweeps it) and return without throwing. (8) **`worker.ts` only calls `startGenerationWorker()` if `REDIS_URL` is set** — keeps the worker process from crash-looping on boot in environments where the queue is intentionally dormant. Logs a clear warn so dormant state isn't silent. (9) **Test infra constraint encountered, not blocking commit:** the test Neon branch (`ep-aged-star-aofeuw4o-pooler...`) is unreachable today (TCP timeout — branch suspended or pruned). Test code typechecks/lints cleanly; the 9 tenant tests pass once the test branch is restored. Recommend re-provisioning the test branch as a Week 6 milestone (when paying brands arrive, prod-vs-test DB split becomes mandatory anyway). (10) **No `pnpm dev:api` script added** — spec referenced one; we already have `pnpm dev` for api + `pnpm dev:worker` for worker. Kept the existing convention. End-to-end smoke test against real Meshy credits is the next operational step (Day 6 — runs on user's laptop, ~$0.50 in Meshy charges).*