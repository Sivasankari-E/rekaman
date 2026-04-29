# Rekaman — Spatial Commerce AR Platform
## Project Context for Claude (v4.0)

> This file is the single source of truth for Claude conversations about Rekaman. Update it at the end of each sprint. Everything below is locked unless explicitly changed.

---

## 🧠 Founder Context

Solo software engineer based in **Chennai, Tamil Nadu, India**. Full-time at a CRM product company (ML + full-stack). Building Rekaman on the side — **2–3 hrs/evening weekdays, full days on weekends**.

**Existing skills:** Node.js, Express, TypeScript, React, Next.js, PostgreSQL, Prisma, AWS basics, Docker basics, Python/ML.

**Learning for this project:** Three.js, WebXR, GLB/GLTF, Meshy.ai API, BullMQ, Razorpay Subscriptions, Shopify app dev, SwiftUI + visionOS (Month 10+).

**AI tools used while building:** Claude (architecture, debugging, code review), Cursor, Antigravity, v0.dev, GitHub Copilot.

**Hardware for testing:** Android phone with Chrome (primary). iPhone for AR Quick Look testing — currently borrowing brother's iPhone, will buy a refurbished iPhone 12/13 base by Week 8 (~₹25-35K business expense).

---

## 🚀 The Product — Rekaman

**Name origin:** *Rekaman* (రికమన్ / रिकमन) means "recording/capture" in Indonesian & Malay (300M+ speakers). It's also a perfect anagram of the founder's name "ekaraman."

**Tagline:** *Capture products. Place them anywhere.*

**One-line description:**
> A SaaS platform that lets any e-commerce brand add "View in your room" AR to their product pages in under 20 minutes — no 3D artists needed. Brands upload photos, our AI makes the 3D model, shoppers see it life-size in their real space in the browser. No app download.

**The problem:** E-commerce brands suffer 25–30% return rates because shoppers can't visualize products in their space before buying. Each return costs ₹2,000–₹5,000.

**The solution:** Shoppers tap "View in your room" on any product page → phone camera opens → product appears at real scale on their floor. Works in mobile browser, no install.

**The differentiator:** Photos → 3D model in 90 seconds via AI. No competitor does this at our price point. Threekit/Zakeke require brands to already have 3D files.

**Customer flow:**
1. Browse product on brand's website (any platform — Shopify, WooCommerce, custom)
2. Tap "View in your room"
3. SDK loads, phone camera opens, product appears anchored to floor at real scale (Android WebXR or iOS AR Quick Look)
4. Buy with confidence — no guesswork, fewer returns

---

## 🌐 Universal Reach — Rekaman Works on ANY Website

**Critical understanding:** Rekaman is NOT limited to Shopify/WooCommerce. It works on every website that can include a `<script>` tag and render a `<div>` — which is every modern e-commerce site.

**Three integration tiers (in order of customer effort):**

### Tier 1: Platform apps (zero code, Month 6+)
Brand clicks "Install" in Shopify/WooCommerce app store. Theme App Extensions auto-inject the snippet.

### Tier 2: Platform template edit (one-time, MVP)
Brand pastes snippet once with platform's template variable for product slug:

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
For React, Next.js, Laravel, Django, Rails, plain HTML:

```jsx
// React/Next.js product page
<div data-rk-product={product.slug} data-rk-key="rk_live_xxx"></div>
```

```html
<!-- Plain HTML / any framework -->
<div data-rk-product="oslo-sofa" data-rk-key="rk_live_xxx"></div>
```

The `/install` dashboard page has THREE tabs: **Shopify | WooCommerce | Custom (Everything else)**. The Custom tab is just as important — likely 30%+ of brands use custom-built stores.

---

## 🔒 Locked Architecture Decisions

These are one-way doors. Don't revisit without a very good reason.

| Decision | Choice | Reason |
|----------|--------|--------|
| Package manager | **pnpm** | Fastest, strictest, best workspace protocol for monorepo |
| Node runtime | **Node 22 LTS** (pinned via `.nvmrc`) | Node 24 breaks Prisma 5 internals; explicit major lock prevents drift |
| Monorepo structure | **Single repo, npm workspaces via pnpm** | One version of code, shared types between SDK / dashboard / server |
| Backend architecture | **Modular monolith** (not microservices) | Solo dev, enforced boundaries via ESLint rules enable future extraction |
| Backend hosting | **Railway** (Month 1–15), then **Fly.io** | Simple to start, multi-region when needed |
| Database hosting | **Neon Postgres 17, Singapore region** (`ap-southeast-1`) | Mumbai unavailable on Neon; Singapore is closest. Branching for schema iteration, scale-to-zero |
| Redis hosting | **Upstash free** → Railway-native (Month 6+) | BullMQ + rate limiting |
| File storage | **AWS S3 + CloudFront** (`ap-south-1`) | GLB files and product photos, global CDN |
| Frontend hosting | **Vercel** | Next.js native, free tier is enough |
| SDK hosting | **CloudFront over S3** at `cdn.rekaman.io` | Immutable versioned URLs (`/v1/sdk.js`) |
| Billing (INR) | **Razorpay Subscriptions** | Phase 2: Stripe for international |
| AI 3D pipeline | **Meshy.ai** | Industry leader. Don't build TripoSR backup until Meshy actually fails |
| Error tracking | **Sentry** from Day 1 | Solo devs can't watch logs |
| Product analytics | **PostHog** (cloud) | On the dashboard, not on brands' sites |
| Email | **Resend** | Simple API, transactional only |
| Input validation | **Zod** on every endpoint | Schemas = docs |
| Logging | **Pino** (structured JSON, redacted PII) | Not `console.log` |
| CI/CD | **GitHub Actions** with Postgres service for tests | Typecheck + lint + test on every push |
| Auth | **JWT + bcrypt cost 12** + Google OAuth | Email/password and Google from day 1. Cookie + Bearer header transport |
| ORM | **Prisma 5** | Type-safe, migrations built in |
| Test runner | **Vitest + Supertest** | Fast, ESM-native, integration-test friendly |

---

## 🏗️ The Tenant Model — Multi-Brand Membership

**One tenant = one brand = one company** (HomeTown, Urban Ladder, Woodcraft Chennai).

**Critical: Users belong to brands via `Membership`, not directly.** A user can be a member of multiple brands (consultants, acquired companies, internal Rekaman admin team).

Each tenant has:
- Many **users** (employees) connected via Membership rows with roles: OWNER, ADMIN, MEMBER
- Many **products** (from 10 to 10,000)
- Multiple **API keys** (`ApiKey` table) — keys are stored as SHA-256 hashes; original shown once at creation
- One or more **sites** where the SDK runs (Shopify, WooCommerce, custom React app, anything)
- One **subscription** (linked to a `PricingPlan`)
- Many **invoices** (full payment history, amounts in paise)

**Tenant isolation enforced at THREE layers:**
1. **Auth middleware** — extracts `brandId` from verified JWT → `req.brandId`
2. **Repository signatures** — every DB query function takes `brandId` as required arg (TypeScript catches missing arg at compile time)
3. **DB constraints** — `@@unique([brandId, slug])` enforces brand-scoped uniqueness at database level

Defense in depth. Even if a developer (sleep-deprived future you) forgets layer 1 or 2, layer 3 catches it.

**Multi-tenant isolation is verified by 7 automated tests** that run on every commit via CI.

---

## 📦 The SDK Philosophy (CRITICAL — Read Carefully)

**There is ONE `sdk.js` file. Globally. Forever.**

Not one per brand. Not one per product. One file at `https://cdn.rekaman.io/v1/sdk.js`, served from CloudFront, cached for 1 year in every browser on Earth.

### How it works

Brand pastes ONE script tag + ONE template div ONE time in their site's product page template:

```html
<!-- One time in theme.liquid (or equivalent) before </body> -->
<script src="https://cdn.rekaman.io/v1/sdk.js"></script>

<!-- In product.liquid (or product page component), where button should appear -->
<div data-rk-product="{{ product.handle }}"
     data-rk-key="rk_live_abc123"></div>
```

The `{{ product.handle }}` is platform-specific (Shopify uses Liquid, WooCommerce uses PHP, custom React uses JSX prop) — but the principle is the same: dynamic product slug fills in automatically per page.

### How the SDK runs on a shopper's page
1. Scans DOM for `<div data-rk-product="...">`
2. Reads product + key attributes
3. Calls `GET /ar/:apiKey/:productSlug` → gets GLB URL + metadata + dimensions
4. Injects "View in your room" button (Shadow DOM-isolated for CSS independence)
5. On tap: detects iOS vs Android → routes to AR Quick Look (iOS) or WebXR engine (Android)
6. Fires analytics events via `navigator.sendBeacon` to `/events`

### Critical rules for SDK
- **Tiny:** Main bundle ≤ 50KB gzipped. Three.js loaded as separate chunk only when AR button is tapped.
- **Zero-config:** Script tag + div. Nothing else.
- **Isolated:** No global leaks except `window.Rekaman`. No CSS leaks (Shadow DOM for button).
- **Versioned forever:** `v1/sdk.js` never breaks. v2 gets a new URL. Brands migrate on their timeline.
- **Lazy:** 99% of shoppers never tap AR. They pay zero cost beyond the tiny loader.

---

## 🏛️ The 5 Architectural Layers

### 1. Marketing Site (`rekaman.io`)
Next.js static site. Landing, pricing, docs, blog. Vercel.

### 2. Brand Dashboard (`dashboard.rekaman.io`)
Next.js 14 App Router. Where brands live. Separate deployment from marketing site (different release cadences).

### 3. Embeddable SDK (`cdn.rekaman.io/v1/sdk.js`)
TypeScript → esbuild → IIFE. Main bundle ~15KB, WebXR chunk ~150KB lazy-loaded.

### 4. Core API (modular monolith)
Express + TypeScript. Two entry points sharing the same codebase:
- `server.ts` → HTTP API
- `worker.ts` → BullMQ job processor

Deployed as two Railway services (`api` and `worker`) sharing code + database, scaling independently.

### 5. Data Tier
- **Neon Postgres** — primary source of truth (Singapore region)
- **Upstash Redis** — BullMQ queue + rate limiting (added Week 5)
- **AWS S3 + CloudFront** — GLB files, product photos (Mumbai region)
- **External**: Meshy.ai (3D gen), Razorpay (billing), Resend (email), Sentry (errors)

---

## 🗂️ Server Module Structure (Modular Monolith)

Every domain module has the **same 3-file shape** — enforced by ESLint:

```
server/src/
  modules/
    auth/
      auth.routes.ts       # Express routes — thin glue
      auth.service.ts      # Business logic
      auth.repository.ts   # ONLY file that calls Prisma
      auth.types.ts        # Shared TypeScript types
    products/
      products.routes.ts
      products.service.ts
      products.repository.ts
      products.types.ts
    apiKeys/               # Week 4
    arSessions/            # Week 4 — analytics events
    generation/            # Week 5 — Meshy orchestration
      generation.queue.ts  # BullMQ enqueue
    billing/               # Week 10
    webhooks/              # Week 10
  workers/
    generation.worker.ts   # BullMQ processor (Week 5)
  middleware/
    requestContext.ts      # Request ID + per-request logger
    auth.ts                # JWT verification + role checks
    errorHandler.ts        # Maps DomainError → HTTP responses
    rateLimiter.ts         # Auth + API rate limits
    asyncHandler.ts        # Wraps async routes for error propagation
  shared/
    db.ts                  # Prisma singleton with shutdown hooks
    logger.ts              # Pino with redaction
    sentry.ts              # Sentry init with 4xx filter
    errors.ts              # DomainError + typed subclasses
    env.ts                 # Zod-validated env vars
    crypto.ts              # API key generation + hashing
    slug.ts                # Brand slug generation
  __tests__/
    setup.ts               # Test DB cleanup hooks
    tenantIsolation.test.ts # 7 critical isolation tests
  app.ts                   # Express app factory
  server.ts                # HTTP entry — verifies DB on start
  worker.ts                # Worker entry
```

### Module rules (enforced by ESLint import boundaries)
- Modules only expose their **service** layer publicly
- `billing.service` can call `products.service.getProduct()`
- `billing.service` NEVER imports `products.repository.ts` directly
- Repositories are the ONLY files that touch Prisma
- Routes are thin: validate input (Zod), call service, format response
- Service throws **typed DomainError subclasses** (not strings)
- Error handler converts errors → consistent HTTP responses

### The Error Model
All errors extend `DomainError` base class with declared `code` and `status`:

```ts
export class EmailAlreadyExistsError extends DomainError {
  readonly code = 'EMAIL_EXISTS' as const;
  readonly status = 409;
}
```

Error response format (universal):
```json
{
  "error": "EMAIL_EXISTS",
  "message": "An account with this email already exists",
  "details": { "fields": {...} },
  "requestId": "abc-123-def"
}
```

`requestId` lets customers/you correlate errors with logs/Sentry.

### Process Lifecycle

Shutdown is split between the entry point and `shared/db.ts`, both of which register signal handlers:

- `shared/db.ts` only runs `prisma.$disconnect()` on `SIGINT` / `SIGTERM` / `beforeExit`. It uses an idempotency flag (`shuttingDown`) and try/catch around disconnect so concurrent signals or disconnect failures don't blow up. **It does NOT call `process.exit`** — that would race with the entry point and kill in-flight HTTP requests before `server.close()` drains them.

- `server.ts` / `worker.ts` own the final exit. On `SIGINT`/`SIGTERM` they:
  1. `server.close()` to stop accepting new connections and drain in-flight requests
  2. Call `prisma.$disconnect()` (idempotent — db.ts may have already done it)
  3. `process.exit(0)`
  4. Force-exit via `setTimeout` after 10s as a safety net

`prisma.$disconnect()` is safe to call multiple times. Splitting responsibilities this way keeps `db.ts` reusable in scripts that don't run a long-lived server, while letting the server orchestrate graceful HTTP shutdown.

### Testing

**Tests use a SEPARATE database from dev.** The `afterEach` hook in `__tests__/setup.ts` runs `deleteMany()` on every Brand, Product, Membership, ApiKey, ARSession, AREvent, Subscription, Invoice, and OrgInvitation row in whatever database `DATABASE_URL` points to. Running tests against the dev/prod Neon DB would wipe all data including the seeded PricingPlans.

**The setup enforces this with a hard refusal.** `beforeAll` checks `DATABASE_URL`:
- ✅ Allowed: `localhost`, `127.0.0.1`, `::1`
- ✅ Allowed: any URL **only if** `RUN_DESTRUCTIVE_TESTS=true` is also set (explicit opt-in)
- ❌ Refused: anything else, with the offending host name in the error message

**Local test workflow:**
1. Spin up an isolated Postgres: `docker run -d --name rekaman-test-db -p 5433:5432 -e POSTGRES_PASSWORD=test postgres:17`
2. `cp .env.test.example .env.test` (already gitignored)
3. Apply the schema: `DATABASE_URL='postgresql://postgres:test@localhost:5433/postgres' pnpm prisma migrate deploy`
4. `pnpm test`

`vitest.config.ts` loads `.env.test` if it exists, so `process.env.DATABASE_URL` is set before `shared/db.ts` instantiates the Prisma client.

**CI uses a fresh Postgres service container** per run (`.github/workflows/ci.yml`). No opt-in needed there because the URL is `localhost`.

**Rate limiters skip in `NODE_ENV=test`.** `middleware/rateLimiter.ts` has `skip: () => NODE_ENV === 'test'` on both `authRateLimit` and `apiRateLimit`. Without this, a 7-test suite signing up 2 brands per `beforeEach` would hit the 5/hr auth limit on test 3. Production behavior is unchanged.

### Race-prone Mutations

Pre-check + try/catch on the Prisma unique-constraint error code is the standard pattern for "is this slug taken?":

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

### External API Boundaries

Calls to external services (Google OAuth, Razorpay, Meshy, S3) must wrap throwing operations in a try/catch that converts the underlying error into a typed `DomainError`. An uncaught throw leaks as `500 INTERNAL_ERROR` and pollutes Sentry with garbage from public-internet attackers spamming the endpoint with malformed inputs.

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

Reference: `modules/auth/auth.service.ts loginWithGoogle`.

### TypeScript / ESLint Conventions

Two non-obvious patterns are unavoidable across modules and worth knowing:

1. **Router exports require explicit `: Router` annotation.** Because `declaration: true` is set in `tsconfig.base.json`, TS emits `.d.ts` files. An inferred `Router` type pulls in deeply-nested `@types/express-serve-static-core` paths that aren't portable, causing TS2742. Every route file must declare `export const xRoutes: Router = router`.

2. **Express request augmentation uses `declare global { namespace Express }` with a per-file lint disable.** The augmentation pattern (adding `requestId`, `auth`, etc. to `Request`) is the idiom shipped by `@types/express` itself, but conflicts with `@typescript-eslint/no-namespace`. We use `// eslint-disable-next-line @typescript-eslint/no-namespace` immediately above each `namespace Express` line. References: `middleware/requestContext.ts`, `middleware/auth.ts`.

---

## 🗃️ Database Schema (Prisma) — Production v2

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
  passwordHash  String?         // null for OAuth-only users
  googleId      String?         @unique
  name          String?
  emailVerified Boolean         @default(false)
  isSuperAdmin  Boolean         @default(false)  // Rekaman team only
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
  primaryEmail String                              // denormalized from OWNER
  billingEmail String?                             // explicit override for invoices
  website      String?
  trialEndsAt  DateTime?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  deletedAt    DateTime?

  memberships   Membership[]
  apiKeys       ApiKey[]
  products      Product[]
  sessions      ARSession[]
  events        AREvent[]
  subscription  Subscription?
  invoices      Invoice[]
  invitations   OrgInvitation[]

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
  keyHash    String    @unique                    // SHA-256, never plaintext
  keyPrefix  String                                // "rk_live_abc..." for UI display
  name       String?                               // "Production", "Old key (rotated)"
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
  status     ProductStatus @default(PENDING)
  glbUrl     String?
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

  brand      Brand         @relation(fields: [brandId], references: [id], onDelete: Cascade)
  sessions   ARSession[]
  events     AREvent[]

  @@unique([brandId, slug])
  @@index([brandId, status])
  @@index([brandId, deletedAt])
}

// ── ANALYTICS (split: session vs event) ──

model ARSession {
  id           String     @id @default(cuid())
  sessionId    String     @unique                  // SDK-generated, idempotent
  brandId      String
  productId    String?
  startedAt    DateTime   @default(now())
  endedAt      DateTime?
  durationMs   Int?
  deviceType   String                              // 'ios', 'android', 'desktop'
  countryCode  String?
  city         String?
  userAgent    String?
  referrer     String?
  didPlace     Boolean    @default(false)
  didAddToCart Boolean    @default(false)
  productCount Int        @default(0)              // distinct products viewed

  brand        Brand      @relation(fields: [brandId], references: [id], onDelete: Cascade)
  product      Product?   @relation(fields: [productId], references: [id], onDelete: SetNull)
  events       AREvent[]

  @@index([brandId, startedAt])
  @@index([productId, startedAt])
}

model AREvent {
  id         String    @id @default(cuid())
  sessionId  String
  brandId    String                                // denormalized for fast brand-scoped queries
  productId  String?
  eventType  String                                // 'ar_opened', 'ar_placed', etc.
  payload    Json?                                 // event-specific data
  timestamp  DateTime  @default(now())

  session    ARSession @relation(fields: [sessionId], references: [sessionId], onDelete: Cascade)
  brand      Brand     @relation(fields: [brandId], references: [id], onDelete: Cascade)
  product    Product?  @relation(fields: [productId], references: [id], onDelete: SetNull)

  @@index([brandId, timestamp])
  @@index([sessionId])
  @@index([eventType, timestamp])
}

// ── BILLING ──

model PricingPlan {
  id            String         @id @default(cuid())
  code          String         @unique             // 'starter_monthly_inr'
  tier          Plan
  displayName   String
  amountInPaise Int                                // 399900 for ₹3,999 — NEVER float
  currency      String         @default("INR")
  billingPeriod BillingPeriod
  sessionLimit  Int
  productLimit  Int
  features      String[]       @default([])
  isPublic      Boolean        @default(true)      // false for custom enterprise plans
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
  amountInPaise     Int                             // integer paise, never float
  currency          String        @default("INR")
  status            InvoiceStatus
  periodStart       DateTime
  periodEnd         DateTime
  paidAt            DateTime?
  invoiceUrl        String?                         // Razorpay-hosted PDF
  createdAt         DateTime      @default(now())

  brand             Brand         @relation(fields: [brandId], references: [id], onDelete: Cascade)
  subscription      Subscription  @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  @@index([brandId, createdAt])
}

// ── WEBHOOKS (idempotency log) ──

model InboundWebhookEvent {
  id          String    @id @default(cuid())
  provider    String                                // 'razorpay', 'shopify'
  eventId     String                                // dedup key
  payload     Json
  processedAt DateTime?
  createdAt   DateTime  @default(now())

  @@unique([provider, eventId])                     // idempotency
  @@index([provider, processedAt])
}

// ── ENUMS ──

enum Role { OWNER ADMIN MEMBER }

enum InvitationStatus { PENDING ACCEPTED EXPIRED REVOKED }

enum Plan { STARTER PRO ENTERPRISE CUSTOM }

enum BillingPeriod { MONTHLY YEARLY }

enum ProductStatus { PENDING PROCESSING READY FAILED ARCHIVED }

enum SubscriptionStatus { TRIALING ACTIVE PAST_DUE CANCELED PAUSED EXPIRED }

enum InvoiceStatus { DRAFT PENDING PAID FAILED REFUNDED }
```

### Key schema principles
- **Money in paise (`Int`), never `Float`.** Float arithmetic on money compounds errors.
- **Append-only event log.** `AREvent` rows are written, never updated or deleted.
- **Soft deletes on Brand, Product, User.** Restoreable, GDPR-compliant.
- **Cascade on Brand deletion.** All related data goes with the brand. Required for compliance.
- **Indexes on every `brandId` column.** Query performance scales with data.
- **Denormalized fields where it matters:** `Brand.primaryEmail`, `AREvent.brandId`.

---

## 🔄 The 3 Data Flows

### Flow 1: Brand creates product → AR is live
1. Brand opens dashboard → "New Product" form
2. Metadata (name, dimensions) → `POST /products` → Product row `status: PENDING`
3. Photos uploaded **directly to S3 via presigned URLs** (bypasses API — critical for scale)
4. Brand clicks "Generate" → `POST /products/:id/generate` → BullMQ job queued
5. Worker calls Meshy, polls for result (60–120s), downloads GLB
6. gltf-pipeline → Draco compress (30MB → 3MB) → upload to S3
7. Worker updates Product row: `status: READY`, `glbUrl`
8. Dashboard polls `GET /products/:id/status` → shows preview

### Flow 2: Shopper sees AR
1. SDK loads from CDN (cached ~forever)
2. SDK reads `data-rk-product` + `data-rk-key` from DOM
3. `GET /ar/:apiKey/:productSlug` → returns GLB URL, dimensions, variants
4. Button injected in Shadow DOM; shopper taps
5. iOS: inject `<a rel="ar" href="product.glb">` → AR Quick Look opens
6. Android: lazy-load WebXR chunk → Three.js hit test → place model at real-world scale
7. Events fired via `sendBeacon` to `POST /events` (writes to ARSession + AREvent tables)

### Flow 3: Razorpay webhook → subscription updated
1. Razorpay POSTs to `/webhooks/razorpay`
2. API verifies HMAC signature (don't trust body)
3. Write to `InboundWebhookEvent` with unique (provider, eventId) — idempotency
4. Update Subscription + create Invoice rows
5. Respond 200 quickly (webhook providers time out fast)

---

## 💻 Complete Tech Stack

### Frontend / AR
- Three.js r160+ (3D scene, GLB loading, AR rendering)
- WebXR Device API (Android browser AR, hit testing)
- AR Quick Look (iOS native — `<a rel="ar">`)
- model-viewer (Google web component, optional iOS fallback)
- MediaPipe FaceMesh (face AR, Month 8+)
- Next.js 14 App Router (dashboard)
- shadcn/ui + Tailwind
- Recharts
- React Query v5 (server state, polling)

### SDK
- TypeScript compiled to IIFE via esbuild
- Target: ~15KB main + ~150KB WebXR chunk (lazy)
- Shadow DOM for CSS isolation

### Backend
- Node.js 22 LTS (pinned via `.nvmrc`; do NOT use Node 24 — incompatible with Prisma 5)
- Express 4
- Prisma 5 (ORM, migrations)
- BullMQ (queue, Week 5)
- Zod (validation everywhere)
- Pino + pino-http (structured logs with PII redaction)
- JWT (jsonwebtoken) + bcryptjs (cost 12)
- google-auth-library (OAuth verification)
- express-rate-limit (in-memory now, Redis-backed Week 5+)
- helmet, cors, compression, cookie-parser

### Testing
- Vitest (test runner, ESM-native)
- Supertest (HTTP integration tests)
- 7 mandatory tenant isolation tests run on every CI build

### Linting & types
- TypeScript 5.4+ strict mode + `noUncheckedIndexedAccess`
- ESLint with typescript-eslint
- Custom `no-restricted-imports` rule prevents cross-module repository imports

### Data
- Neon Postgres 17 (Singapore region, primary DB)
- Upstash Redis (queue + rate limiting, Week 5+)
- AWS S3 + CloudFront (Mumbai region, files + CDN)

### External
- Meshy.ai (3D generation)
- Razorpay Subscriptions (INR billing)
- Resend (transactional email)
- Sentry (error tracking, 4xx filtered out)
- PostHog (product analytics, dashboard-side only)
- Google OAuth (sign in with Google)

### Planned (Month 6+)
- Shopify App Bridge (Theme App Extensions for zero-code install)
- WooCommerce PHP plugin
- Webflow custom code template
- RealityKit + SwiftUI (Apple Vision Pro, Month 10+)

---

## 🗺️ Revised 12-Month Roadmap

**Key shift: first paying customer by Week 6, not Month 3.**

### Weeks 1–2: 3D foundations ✅
- ✅ Week 1: Three.js + GLB loading + HDR lighting (DONE, deployed)
- ✅ Week 2: WebXR, ARButton, hit testing, reticle, placement, gestures, iOS Quick Look (DONE, deployed)

### Week 3: Production Backend Foundation ✅ (current)
- Modular monolith with proper boundaries
- Prisma schema v2 (multi-brand membership, separate ApiKey, split ARSession/AREvent)
- JWT auth + Google OAuth from day 1
- 3-layer tenant isolation, verified by 7 automated tests
- Deployed to Railway (api + worker services)
- Sentry, Pino, request IDs, typed DomainErrors

### Week 4: SDK v1 + Public AR Endpoint
- `packages/sdk` with esbuild bundle config
- Port Week 2 AR code into production package
- ApiKey CRUD module (create, revoke, list)
- Public AR endpoint: `GET /ar/:apiKey/:productSlug`
- S3 + CloudFront setup for `cdn.rekaman.io`
- Deploy SDK to `cdn.rekaman.io/v1/sdk.js`
- Static HTML demo: one `<script>` tag opens AR
- **Deliverable:** Sales demo URL for first prospect

### Weeks 5–6: Meshy + manual onboarding
- Meshy.ai integration (wrapped in `shared/meshy.ts`)
- BullMQ worker for 3D generation
- S3 upload + Draco compression pipeline
- `POST /products/:id/generate` endpoint
- **🎯 First paying customer (₹3,999) via Concierge MVP** — manually process photos, email embed code

### Weeks 7–9: Dashboard MVP
- Auth pages (signup, login, password reset)
- Onboarding wizard (3-step)
- Product list + create + upload (presigned S3)
- Embed code page with Shopify / WooCommerce / Custom tabs
- Basic analytics (session counts, placement rate)

### Weeks 10–12: Billing + customer wave
- Razorpay subscriptions integration
- Plan gating middleware (enforces session/product limits)
- ROI calculator
- Target: **4 paying customers, ₹40,000 MRR**

### Month 4–5: Product Hunt launch
- Full analytics pipeline (funnel, cohort)
- Shopify app (private beta)
- Variant switching in AR
- Target: **15 paying brands, ₹75,000 MRR**

### Month 6–9: Scale
- Public Shopify app
- WooCommerce plugin
- 3D quality improvements (manual refinement option)
- MediaPipe face AR (fashion vertical)
- SEO content
- Target: **50 brands, ₹5L MRR**

### Month 10–12: Expansion
- Apple Vision Pro visionOS app
- Fly.io migration (multi-region)
- International billing (Stripe alongside Razorpay)
- Investor conversations
- Target: **₹8.5L MRR → ₹1 Cr ARR by end of year**

---

## 🎯 Dashboard Pages Map

### MVP (Week 7–12)
- `/signup`, `/login`, `/forgot-password`
- `/onboarding` (3-step wizard)
- `/brands` (brand switcher if user belongs to multiple — Slack-style)
- `/products` (list with status badges)
- `/products/new` (upload flow)
- `/products/:id` (preview, approve, embed code)
- `/products/:id/analytics`
- `/analytics` (dashboard-wide)
- `/install` (Shopify / WooCommerce / Custom tabs)
- `/api-keys` (create, revoke, view usage)
- `/team` (basic — invite via email)
- `/settings`, `/billing`

### Month 4–5
- `/team` (advanced — roles, audit log of invitations)
- `/variants` (colors, materials)
- `/bulk-upload` (CSV)
- `/integrations` (Shopify, Slack, webhooks)
- `/branding` (AR button customization)

### Month 6+
- `/insights` (AI-generated recommendations)
- `/leads` (captured shopper interest)
- `/experiments` (A/B testing)
- `/api-docs`

---

## 🔌 Key API Endpoints

```
# Auth (rate-limited: 5/hr per IP)
POST   /auth/signup                   # email/password + creates User+Brand+Membership atomically
POST   /auth/login                    # email/password
POST   /auth/google                   # Google OAuth ID token
POST   /auth/logout                   # clears cookie
GET    /auth/me                       # returns user + ALL memberships + active brandId
POST   /auth/switch-brand/:brandId    # re-issues JWT with different active brand (Week 4)

# Products (authenticated, brand-scoped)
GET    /products
POST   /products
GET    /products/:id
PATCH  /products/:id
DELETE /products/:id                  # soft delete, requires OWNER/ADMIN role
POST   /products/:id/upload-url       # presigned S3 URL (Week 5)
POST   /products/:id/generate         # queue 3D job (Week 5)
GET    /products/:id/status           # poll progress
GET    /products/:id/embed-code

# API Keys (Week 4)
GET    /api-keys                      # list (returns prefixes, never full keys)
POST   /api-keys                      # create (returns full key ONCE in response)
DELETE /api-keys/:id                  # revoke

# Public AR (API-key authenticated, rate-limited, cached)
GET    /ar/:apiKey/:productSlug       # shopper view → product metadata + GLB URL

# Events (SDK ingestion, Week 4)
POST   /events                        # batch AR session events via sendBeacon

# Analytics (authenticated)
GET    /analytics/summary
GET    /analytics/roi
GET    /analytics/products/:id

# Billing (Week 10)
POST   /billing/subscribe
GET    /billing/portal
GET    /billing/invoices

# Webhooks (Week 10, idempotent)
POST   /webhooks/razorpay

# Team (Week 8)
GET    /team
POST   /team/invite
POST   /team/accept                   # uses invitation token
PATCH  /team/:userId/role
DELETE /team/:userId

# System
GET    /health                        # always 200, no auth
GET    /metrics                       # uptime, db status, version
```

### Universal error response format
```json
{
  "error": "EMAIL_EXISTS",            // stable code
  "message": "Human-readable message",
  "details": {...},                   // optional, structured
  "requestId": "abc-123"              // for log correlation
}
```

---

## 💰 Pricing (INR — India First)

Stored dynamically in `PricingPlan` table (not hardcoded enum). Allows pricing experiments without migrations.

| Plan | Price | Sessions | Products | Key Features |
|------|-------|----------|----------|--------------|
| Starter | ₹3,999/mo | 500 | 10 | Basic analytics, email support |
| Pro | ₹12,999/mo | 5,000 | 50 | Full analytics, ROI, Shopify app |
| Enterprise | ₹49,999+/mo | Unlimited | Unlimited | White-label SDK, dedicated support |

**Add-ons:**
- Manual 3D refinement: ₹500/product
- Extra AI generation credits: ₹99/model
- Annual plan: 2 months free

**All amounts stored as paise (Int). Never use Float for money.**

---

## 🏆 Competitors & Positioning

| Competitor | Price | Weakness | Our Edge |
|------------|-------|----------|----------|
| Threekit | $50K+/yr | 6-month onboarding | 20-min setup, ₹4K/mo |
| Zakeke | $30–$200/mo | Needs existing 3D files | AI generates from photos |
| Vectary | Free–$14/mo | Design tool, no commerce | We're a commerce platform |
| Roomle | $200–$2K/mo | Complex UX | Simple: point, place, buy |

**Positioning:** "The Shopify of AR" — platform layer for any brand without a $500K engineering budget. Works on every website, not just Shopify.

---

## 📊 Key Metrics

- **MRR** — ₹8.5L by Month 12
- **Churn** — < 5%/month
- **Placement rate** — > 70% (% of AR opens that result in model placement)
- **Conversion lift** — 3–4× AR vs non-AR shoppers
- **Return rate reduction** — 20–25% per brand
- **LTV** — > ₹1.5L/brand
- **CAC** — < ₹15K
- **LTV:CAC** — > 10:1
- **API uptime** — 99.5% (allows ~3.5 hours/month downtime)
- **AR session p95 latency** — < 2 seconds (button tap to camera open)

---

## 📁 Monorepo Structure

```
rekaman/
├── apps/
│   ├── dashboard/              # Next.js 14 App Router (Vercel)
│   └── landing/                # rekaman.io marketing site (Vercel)
├── packages/
│   ├── sdk/                    # Embeddable JS SDK (esbuild → IIFE → CloudFront)
│   │   ├── src/
│   │   │   ├── index.ts        # IIFE entry, exposes window.Rekaman
│   │   │   ├── ar-launcher.ts  # iOS vs Android router
│   │   │   ├── analytics.ts    # sendBeacon event firing
│   │   │   └── webxr-chunk.ts  # lazy-loaded Three.js engine
│   │   └── dist/sdk.js
│   ├── ar-engine/              # Shared Three.js + WebXR logic
│   └── shared-types/           # Types shared between server + dashboard + sdk
├── server/                     # Node.js + Express (Railway)
│   ├── src/
│   │   ├── modules/            # auth, products, generation, ar-sessions, billing, webhooks
│   │   ├── workers/
│   │   ├── middleware/
│   │   ├── shared/             # db, logger, sentry, errors, env, crypto, slug
│   │   ├── __tests__/          # tenant isolation + integration tests
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       └── seed.ts         # PricingPlan defaults
│   └── package.json
├── .github/workflows/ci.yml    # Postgres service + typecheck + lint + tests
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── package.json
└── CLAUDE.md                   # this file
```

---

## 🤖 How to Work with Claude on This Project

### Always include in prompts
1. Which layer: `[SDK]` / `[DASHBOARD]` / `[BACKEND]` / `[AR ENGINE]` / `[AI PIPELINE]` / `[BILLING]` / `[STRATEGY]` / `[REVIEW]` / `[DEBUG]`
2. What's already built in that area
3. Specific error or requirement
4. Tech stack context if unclear

### Great prompt templates
- `[AR ENGINE] Write the Three.js WebXR hit-test code for placing a product on an AR surface.`
- `[BACKEND] Review this Prisma query for tenant leak risk — must filter by req.brandId.`
- `[AI PIPELINE] Write the BullMQ worker that calls Meshy, polls, uploads GLB to S3 with Draco compression.`
- `[SDK] How do I isolate CSS in the embed so host page styles don't leak in?`
- `[DEBUG] WebXR session fails with [error]. Here's my ARButton config: [...]`

### Claude's expected behavior
- Assume modular monolith with strict module boundaries (services talk to services, never repositories)
- Assume multi-tenant with `req.brandId` injection from JWT
- Assume Membership-based (User can belong to multiple Brands)
- Default to TypeScript + Zod validation + typed DomainErrors
- Money is always in paise (Int), never Float
- Repository functions ALWAYS take brandId as required argument
- Prefer boring, battle-tested tech
- Push back on premature abstraction or microservices
- Reference this file's decisions rather than suggesting new stacks

---

## 📝 Git Conventions

**Commit message format:** `shiva | <type>(<scope>): <short description>`

- **`shiva |`** prefix is required on every commit — identifies the author at a glance in `git log` (helps when other contributors join later).
- **`<type>`** follows Conventional Commits: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ci`.
- **`<scope>`** is the affected area: `server`, `sdk`, `dashboard`, `landing`, `db`, `ci`, etc. Optional but encouraged.
- **Description** is imperative present-tense and ≤ 72 characters. Body (after a blank line) for context if needed.

Examples:
- `shiva | feat(server): production-grade auth, products, tenant middleware`
- `shiva | fix(auth): catch Google verifier throws as 400 instead of 500`
- `shiva | chore: add env var template`
- `shiva | docs: update CLAUDE.md with testing workflow`

This convention applies to all commits Claude generates as well — every Claude-authored commit must use the `shiva | …` prefix.

---

## 📍 Current Status

*Update this section every Sunday.*

- **Week/Month:** Week 4, Month 1
- **Last completed:** Week 3 — Production-grade backend with Prisma schema v2, multi-tenant isolation tests, JWT + Google OAuth, deployed to Railway
- **Currently working on:** Week 4 — SDK package + CloudFront deployment + public AR endpoint
- **Blocked on:** Nothing
- **Next milestone:** Week 4 deliverable — sales demo URL with one `<script>` tag opening AR
- **Current MRR:** ₹0
- **Paying clients:** 0
- **Deployed URLs:**
  - Playground: [Vercel URL from Week 1-2]
  - API: [Railway URL from Week 3]
  - Dashboard: not live
  - Landing: not live

---

## 🌐 Live URLs

- Landing: `rekaman.io` or `.co` or `.app` (purchased)
- Dashboard: `dashboard.rekaman.io` (not live, Week 7+)
- API: `api.rekaman.io` (Railway URL active, custom domain Week 4)
- CDN: `cdn.rekaman.io` (Week 4)
- SDK global: `window.Rekaman`
- GitHub: `github.com/[username]/rekaman` (private monorepo)

---

## ✅ Immediate Next Actions

1. **Move to Week 4:** SDK package setup, CloudFront, public AR endpoint
2. **Reserve "Rekaman" trademark** via MCA RUN service (₹1,000) — done in spare time
3. **Borrow brother's iPhone** for 30 minutes to verify iOS AR Quick Look path on Week 2 deploy
4. **Plan domain DNS** — point `api.rekaman.io` to Railway when Week 4 begins

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
13. **Schema is additive** — new features add tables/columns, never restructure existing ones

---

## 🏢 Company Registration Status

Currently a **sole proprietor by default** (automatic in India). Pvt Ltd registration deferred to Week 6-8 when first paying customer is closing.

**Registration plan:**
- **Week 6-8:** Incorporate Pvt Ltd in Tamil Nadu (~₹15-25K, 5-7 days)
- **Immediately after:** Apply for DPIIT Startup India recognition (free, 1-3 days, unlocks 3-year tax holiday)
- **Week 10-12:** Open Razorpay business account, file trademark for "Rekaman"
- **No international entity** for Year 1 — Indian Pvt Ltd is correct starting structure

---

*Last updated: April 2026 | Version 4.1*
*Key shifts from v3: Production schema v2 with multi-brand Membership, ApiKey table, split ARSession/AREvent, PricingPlan, Invoice. Universal SDK reach (not just Shopify). Typed error model. Production-grade patterns from Week 3 onwards. Tenant isolation verified by 7 automated tests.*
*v4.1: Node runtime pinned to 22 LTS via `.nvmrc` (Node 24 incompatible with Prisma 5).*
*v4.2: Test DB isolation — refuse destructive tests against non-local DBs unless `RUN_DESTRUCTIVE_TESTS=true`. Race-prone mutations use pre-check + P2002 catch.*