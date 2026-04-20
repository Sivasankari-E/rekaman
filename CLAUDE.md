# Rekaman — Spatial Commerce AR Platform
## Project Context for Claude (v3.0)

> This file is the single source of truth for Claude conversations about Rekaman. Update it at the end of each sprint. Everything below is locked unless explicitly changed.

---

## 🧠 Founder Context

Solo software engineer based in **Chennai, Tamil Nadu, India**. Full-time at a CRM product company (ML + full-stack). Building Rekaman on the side — **2–3 hrs/evening weekdays, full days on weekends**.

**Existing skills:** Node.js, Express, TypeScript, React, Next.js, PostgreSQL, Prisma, AWS basics, Docker basics, Python/ML.

**Learning for this project:** Three.js, WebXR, GLB/GLTF, Meshy.ai API, BullMQ, Razorpay Subscriptions, Shopify app dev, SwiftUI + visionOS (Month 10+).

**AI tools used while building:** Claude (architecture, debugging, code review), Cursor, Antigravity, v0.dev, GitHub Copilot.

---

## 🚀 The Product — Rekaman

**Name origin:** *Rekaman* (రికమన్ / रिकमन) means "recording/capture" in Indonesian & Malay (300M+ speakers). It's also a perfect anagram of the founder's name "ekaraman."

**Tagline:** *Capture products. Place them anywhere.*

**One-line description:**
> A SaaS platform that lets any e-commerce brand add "View in your room" AR to their product pages in under 20 minutes — no 3D artists needed. Brands upload photos, our AI makes the 3D model, shoppers see it life-size in their real space in the browser. No app download.

**The problem:** E-commerce brands suffer 25–30% return rates because shoppers can't visualize products in their space before buying. Each return costs ₹2,000–₹5,000.

**The solution:** Shoppers tap "View in your room" on any product page → phone camera opens → product appears at real scale on their floor. Works in mobile browser, no install.

**The differentiator:** Photos → 3D model in 90 seconds via AI. No competitor does this at our price point. Threekit/Zakeke require brands to already have 3D files.

---

## 🔒 Locked Architecture Decisions

These are one-way doors. Don't revisit without a very good reason.

| Decision | Choice | Reason |
|----------|--------|--------|
| Package manager | **pnpm** | Fastest, strictest, best workspace protocol for monorepo |
| Monorepo structure | **Single repo, npm workspaces via pnpm** | One version of code, shared types between SDK / dashboard / server |
| Backend architecture | **Modular monolith** (not microservices) | Solo dev, enforced boundaries enable future extraction |
| Backend hosting | **Railway** (Month 1–15), then **Fly.io** | Simple to start, multi-region when needed |
| Database hosting | **Neon** (serverless Postgres) | Branching for schema iteration, scale-to-zero, future-proof |
| Redis hosting | **Upstash free** → Railway-native (Month 6+) | BullMQ + rate limiting |
| File storage | **AWS S3 + CloudFront** | GLB files and product photos, global CDN |
| Frontend hosting | **Vercel** | Next.js native, free tier is enough |
| SDK hosting | **CloudFront over S3** at `cdn.rekaman.io` | Immutable versioned URLs (`/v1/sdk.js`) |
| Billing (INR) | **Razorpay Subscriptions** | Phase 2: Stripe for international |
| AI 3D pipeline | **Meshy.ai** | Industry leader. Don't build TripoSR backup until Meshy actually fails |
| Error tracking | **Sentry** from Day 1 | Solo devs can't watch logs |
| Product analytics | **PostHog** (cloud) | On the dashboard, not on brands' sites |
| Email | **Resend** | Simple API, transactional only |
| Input validation | **Zod** on every endpoint | Schemas = docs |
| Logging | **Pino** (structured JSON) | Not `console.log` |
| CI/CD | **GitHub Actions** from Day 1 | Typecheck + test on every push |
| Auth | **JWT (jsonwebtoken)** + bcrypt | For brand users. API keys for SDK. |
| ORM | **Prisma 5** | Type-safe, migrations built in |

---

## 🏗️ The Tenant Model (What "Tenant" Means in Rekaman)

**One tenant = one brand = one company** (HomeTown, Urban Ladder, Woodcraft Chennai).

Each tenant has:
- One account on the dashboard
- Many **users** (employees with roles: OWNER, ADMIN, MEMBER)
- Many **products** (from 10 to 10,000)
- One **API key** (`rk_live_xxx`) identifying their brand in every SDK request
- One or more **sites** where the SDK runs (Shopify, WooCommerce, custom)
- One **subscription**

Tenant isolation is enforced by middleware that injects `req.brandId` on every request. Every query MUST filter by brandId. No exceptions.

---

## 📦 The SDK Philosophy (CRITICAL — Read Carefully)

**There is ONE `sdk.js` file. Globally. Forever.**

Not one per brand. Not one per product. One file at `https://cdn.rekaman.io/v1/sdk.js`, served from CloudFront, cached for 1 year in every browser on Earth.

### How it works

Brand pastes ONE script tag + ONE template div ONE time in their theme:

```html
<!-- In theme.liquid, before </body> -->
<script src="https://cdn.rekaman.io/v1/sdk.js"></script>

<!-- In product.liquid, where button should appear -->
<div data-rk-product="{{ product.handle }}"
     data-rk-key="rk_live_abc123"></div>
```

The `{{ product.handle }}` is a Shopify template variable — automatically becomes `oslo-sofa` on the Oslo page, `berlin-chair` on the Berlin page, etc. **Works for every current and future product with zero additional code.**

### How the SDK runs on a shopper's page
1. Scans DOM for `<div data-rk-product="...">`
2. Reads product + key attributes
3. Calls `GET /ar/:apiKey/:productSlug` → gets GLB URL + metadata
4. Injects "View in your room" button
5. On tap: detects iOS vs Android → routes to AR Quick Look (iOS) or WebXR engine (Android)
6. Fires analytics events via `navigator.sendBeacon` to `/events`

### Three tenant integration methods (in order of automation)
1. **Template edit** (MVP): One-time paste in Shopify/WooCommerce theme
2. **Shopify App** (Month 6+): Zero-code install via Theme App Extensions
3. **Tag manager** (Month 8+): GTM template for enterprise

### Critical rules for SDK
- **Tiny:** Main bundle ≤ 50KB gzipped. Three.js loaded as separate chunk only when AR button is tapped.
- **Zero-config:** Script tag + div. Nothing else.
- **Isolated:** No global leaks except `window.Rekaman`. No CSS leaks into host page (use Shadow DOM for button if needed).
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
Express + TypeScript. Two entry points in the same codebase:
- `server.ts` → HTTP API
- `worker-entry.ts` → BullMQ job processor

Deployed as two Railway services sharing the same code + database.

### 5. Data Tier
- **Neon Postgres** — primary source of truth
- **Upstash Redis** — BullMQ queue + rate limiting
- **AWS S3 + CloudFront** — GLB files, product photos
- **External**: Meshy.ai (3D gen), Razorpay (billing), Resend (email), Sentry (errors)

---

## 🗂️ Server Module Structure (Modular Monolith)

This is the most important rule for how code is organized. Every module has the same 3-file shape:

```
server/src/
  modules/
    auth/
      auth.routes.ts       # Express routes
      auth.service.ts      # Business logic
      auth.repository.ts   # ONLY file that calls Prisma
    products/
      products.routes.ts
      products.service.ts
      products.repository.ts
    generation/            # 3D generation orchestration
      generation.routes.ts
      generation.service.ts
      generation.queue.ts  # BullMQ enqueue
    ar-sessions/           # Analytics events
    billing/
    webhooks/
  workers/
    generation.worker.ts   # BullMQ processor
  middleware/
    auth.ts                # JWT + apiKey validation
    tenant.ts              # Injects req.brandId — CRITICAL
    planGating.ts          # Enforces plan limits
    rateLimiter.ts
  shared/
    db.ts                  # Prisma singleton
    s3.ts
    meshy.ts
    razorpay.ts
    logger.ts              # Pino
  app.ts                   # Express app factory
  server.ts                # HTTP entry
  worker-entry.ts          # Worker entry
```

### Module rules (enforced by ESLint import boundaries)
- Modules only expose their **service** layer publicly
- `billing.service` can call `products.service.getProduct()`
- `billing.service` NEVER calls `products.repository` or `prisma.product` directly
- Repositories are the ONLY files that touch Prisma
- This makes future service extraction a weekend, not a rewrite

---

## 🗃️ Database Schema (Prisma)

```prisma
model Brand {
  id           String    @id @default(cuid())
  slug         String    @unique                    // for URL routing
  companyName  String
  website      String?
  apiKey       String    @unique @default(cuid())
  plan         Plan      @default(STARTER)
  trialEndsAt  DateTime?
  createdAt    DateTime  @default(now())
  deletedAt    DateTime?                            // soft delete
  users        User[]
  products     Product[]
  sessions     ARSession[]
  subscription Subscription?
  @@index([apiKey])
  @@index([slug])
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String?
  brandId      String
  brand        Brand    @relation(fields: [brandId], references: [id])
  role         Role     @default(MEMBER)
  createdAt    DateTime @default(now())
  @@index([brandId])
}

model Product {
  id         String        @id @default(cuid())
  brandId    String
  brand      Brand         @relation(fields: [brandId], references: [id])
  name       String
  slug       String                                 // tenant's product handle
  status     ProductStatus @default(PENDING)
  glbUrl     String?
  glbSizeKb  Int?
  photoUrls  String[]
  widthCm    Float?
  heightCm   Float?
  depthCm    Float?
  variants   Json?                                  // [{color, name, glbUrl}]
  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt
  deletedAt  DateTime?
  sessions   ARSession[]
  @@unique([brandId, slug])                         // tenant isolation
  @@index([brandId, status])
}

model ARSession {
  id          String   @id @default(cuid())
  brandId     String                                // always filter by this
  productId   String
  brand       Brand    @relation(fields: [brandId], references: [id])
  product     Product  @relation(fields: [productId], references: [id])
  sessionId   String                                // groups events in one AR session
  eventType   String                                // ar_opened, ar_placed, etc.
  deviceType  String
  durationMs  Int?
  placed      Boolean  @default(false)
  addedToCart Boolean  @default(false)
  timestamp   DateTime @default(now())
  // Append-only event log — NEVER update or delete
  @@index([brandId, timestamp])
  @@index([productId, timestamp])
  @@index([sessionId])
}

model Subscription {
  id                 String   @id @default(cuid())
  brandId            String   @unique
  brand              Brand    @relation(fields: [brandId], references: [id])
  razorpaySubId      String
  plan               Plan
  status             String
  currentPeriodEnd   DateTime
  createdAt          DateTime @default(now())
}

model InboundWebhookEvent {
  id          String   @id @default(cuid())
  provider    String                                // razorpay, shopify
  eventId     String                                // dedup key
  payload     Json
  processedAt DateTime?
  createdAt   DateTime @default(now())
  @@unique([provider, eventId])                     // idempotency
}

enum Role { OWNER ADMIN MEMBER }

enum Plan {
  STARTER      // ₹3,999/mo — 500 sessions, 10 products
  PRO          // ₹12,999/mo — 5,000 sessions, 50 products
  ENTERPRISE   // ₹49,999+/mo — unlimited
}

enum ProductStatus {
  PENDING      // just created
  PROCESSING   // Meshy job running
  READY        // GLB live, AR works
  FAILED       // Meshy failed, retry available
  ARCHIVED     // tenant soft-deleted
}
```

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
4. Button injected; shopper taps
5. iOS: inject `<a rel="ar" href="product.glb">` → AR Quick Look opens
6. Android: lazy-load WebXR chunk → Three.js hit test → place model
7. Events fired via `sendBeacon` to `POST /events`

### Flow 3: Razorpay webhook → subscription updated
1. Razorpay POSTs to `/billing/webhook`
2. API verifies HMAC signature (don't trust body)
3. Write to `InboundWebhookEvent` with unique (provider, eventId) — idempotency
4. Update Subscription + Brand.plan
5. Respond 200 quickly (webhook providers time out fast)

---

## 💻 Complete Tech Stack

### Frontend / AR
- Three.js r160+ (3D scene, GLB loading, AR rendering)
- WebXR Device API (browser AR, hit testing)
- model-viewer (Google web component, iOS Quick Look fallback)
- MediaPipe FaceMesh (face AR, Month 8+)
- Next.js 14 App Router (dashboard)
- shadcn/ui + Tailwind
- Recharts
- React Query v5 (server state, polling)

### SDK
- TypeScript compiled to IIFE via esbuild
- Target: ~15KB main + ~150KB WebXR chunk (lazy)

### Backend
- Node.js 20+ LTS
- Express 4
- Prisma 5 (ORM, migrations)
- BullMQ (queue)
- Zod (validation)
- Pino (structured logs)
- JWT + bcrypt (auth)

### Data
- Neon Postgres 15 (primary DB)
- Upstash Redis (queue + rate limiting)
- AWS S3 + CloudFront (files + CDN)

### External
- Meshy.ai (3D generation)
- Razorpay Subscriptions (INR billing)
- Resend (transactional email)
- Sentry (error tracking)
- PostHog (product analytics)

### Planned (Month 6+)
- Shopify App Bridge
- WooCommerce PHP plugin
- RealityKit + SwiftUI (visionOS)

---

## 🗺️ Revised 12-Month Roadmap

**Key shift from v2: first paying customer by Week 6, not Month 3.**

### Weeks 1–2: 3D foundations
- ✅ Week 1: Three.js + GLB loading + HDR lighting (DONE, deployed)
- Week 2: WebXR, ARButton, hit testing, reticle, placement, gestures

### Week 3: iOS path + backend skeleton
- iOS AR Quick Look integration
- Device detection
- Monorepo scaffolded (pnpm workspaces)
- Express + Prisma + Neon connected
- Auth endpoints (`/auth/signup`, `/auth/login`)
- Tenant middleware (`req.brandId` injection)

### Week 4: SDK v1
- esbuild bundle config
- `data-rk-*` attribute parser
- iOS/Android router
- Deployed to `cdn.rekaman.io/v1/sdk.js`
- **Deliverable:** Static HTML demo — one script tag opens AR on iOS and Android

### Weeks 5–6: Meshy + manual onboarding
- Meshy.ai integration
- BullMQ worker
- S3 upload + Draco compression
- `/products/:id/generate`
- **🎯 First paying customer (₹3,999) via Concierge MVP** — you manually process their photos, email the embed code

### Weeks 7–9: Dashboard MVP
- Auth pages (signup, login, password reset)
- Onboarding wizard
- Product list + create + upload
- Embed code page (Shopify / WooCommerce / Custom tabs)
- Basic analytics (session counts)

### Weeks 10–12: Billing + second customer wave
- Razorpay subscriptions
- Plan gating middleware
- ROI calculator
- Target: **4 paying customers, ₹40,000 MRR**

### Month 4–5: Product-Hunt launch
- Full analytics pipeline
- Shopify app (private beta)
- Variant switching in AR
- Target: **15 paying brands, ₹75,000 MRR**

### Month 6–9: Scale
- Public Shopify app
- WooCommerce plugin
- 3D quality improvements
- MediaPipe face AR (fashion vertical)
- SEO content
- Target: **50 brands, ₹5L MRR**

### Month 10–12: Expansion
- Apple Vision Pro visionOS app
- Fly.io migration (multi-region)
- International billing (Stripe)
- Investor conversations
- Target: **₹8.5L MRR → ₹1 Cr ARR by end of year**

---

## 🎯 Dashboard Pages Map

### MVP (Month 2–3)
- `/signup`, `/login`, `/forgot-password`
- `/onboarding` (3-step wizard)
- `/products` (list with status badges)
- `/products/new` (upload flow)
- `/products/:id` (preview, approve, embed code)
- `/products/:id/analytics`
- `/analytics` (dashboard-wide)
- `/install` (Shopify/WooCommerce/Custom tabs)
- `/settings`, `/billing`

### Month 4–5
- `/team` (invite + roles)
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
# Auth
POST   /auth/signup
POST   /auth/login
POST   /auth/refresh
POST   /auth/forgot-password

# Products (authenticated, brand-scoped)
GET    /products
POST   /products
GET    /products/:id
PATCH  /products/:id
DELETE /products/:id
POST   /products/:id/upload-url       # presigned S3 URL
POST   /products/:id/generate         # queue 3D job
GET    /products/:id/status           # poll progress
GET    /products/:id/embed-code

# Public AR (API-key authenticated, rate-limited, cached)
GET    /ar/:apiKey/:productSlug       # shopper view → product metadata

# Events (SDK ingestion)
POST   /events                        # batch AR session events

# Analytics (authenticated)
GET    /analytics/summary
GET    /analytics/roi
GET    /analytics/products/:id

# Billing
POST   /billing/subscribe
GET    /billing/portal
POST   /billing/webhook               # Razorpay

# Team
GET    /team
POST   /team/invite
PATCH  /team/:userId/role
```

---

## 💰 Pricing (INR — India First)

| Plan | Price | Sessions | Products | Key Features |
|------|-------|----------|----------|--------------|
| Starter | ₹3,999/mo | 500 | 10 | Basic analytics, email support |
| Pro | ₹12,999/mo | 5,000 | 50 | Full analytics, ROI, Shopify app |
| Enterprise | ₹49,999+/mo | Unlimited | Unlimited | White-label SDK, dedicated support |

**Add-ons:**
- Manual 3D refinement: ₹500/product
- Extra AI generation credits: ₹99/model
- Annual plan: 2 months free

---

## 🏆 Competitors & Positioning

| Competitor | Price | Weakness | Our Edge |
|------------|-------|----------|----------|
| Threekit | $50K+/yr | 6-month onboarding | 20-min setup, ₹4K/mo |
| Zakeke | $30–$200/mo | Needs existing 3D files | AI generates from photos |
| Vectary | Free–$14/mo | Design tool, no commerce | We're a commerce platform |
| Roomle | $200–$2K/mo | Complex UX | Simple: point, place, buy |

**Positioning:** "The Shopify of AR" — platform layer for any brand without a $500K engineering budget.

---

## 📊 Key Metrics

- **MRR** — ₹8.5L by Month 12
- **Churn** — < 5%/month
- **Placement rate** — > 70%
- **Conversion lift** — 3–4× AR vs non-AR
- **Return rate reduction** — 20–25% per brand
- **LTV** — > ₹1.5L/brand
- **CAC** — < ₹15K
- **LTV:CAC** — > 10:1

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
│   │   └── dist/
│   │       └── sdk.js
│   ├── ar-engine/              # Shared Three.js + WebXR logic
│   └── shared-types/           # Types shared between server + dashboard + sdk
├── server/                     # Node.js + Express (Railway)
│   ├── src/
│   │   ├── modules/            # auth, products, generation, ar-sessions, billing, webhooks
│   │   ├── workers/
│   │   ├── middleware/
│   │   ├── shared/
│   │   └── prisma/schema.prisma
│   └── package.json
├── .github/workflows/ci.yml
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── package.json
└── README.md
```

---

## 🤖 How to Work with Claude on This Project

### Always include in prompts
1. Which layer: `[SDK]` / `[DASHBOARD]` / `[BACKEND]` / `[AR ENGINE]` / `[AI PIPELINE]` / `[BILLING]` / `[STRATEGY]` / `[REVIEW]` / `[DEBUG]`
2. What's already built in that area
3. Specific error or requirement
4. Tech stack context if unclear

### Great prompt templates
- `[AR ENGINE] Write the Three.js WebXR hit-test code for placing a product on an AR surface. I'm using r160 with ARButton.`
- `[BACKEND] Review this Prisma query for tenant leak risk — should filter by req.brandId.`
- `[AI PIPELINE] Write the BullMQ worker that calls Meshy, polls, uploads GLB to S3 with Draco compression.`
- `[SDK] How do I isolate CSS in the embed so host page styles don't leak in?`
- `[DEBUG] WebXR session fails with [error]. Here's my ARButton config: [...]`

### Claude's expected behavior
- Assume modular monolith, not microservices
- Assume multi-tenant with brandId isolation
- Default to TypeScript + Zod validation
- Prefer boring, battle-tested tech
- Push back on premature abstraction
- Reference this file's decisions rather than suggesting new stacks

---

## 📍 Current Status

*Update this section every Sunday.*

- **Week/Month:** Week 2, Month 1
- **Last completed:** Week 1 — Three.js foundations, HDR lighting, GLB viewer deployed to Vercel
- **Currently working on:** Architecture review + monorepo scaffolding
- **Blocked on:** Nothing
- **Next milestone:** Week 2 — WebXR + AR hit testing
- **Current MRR:** ₹0
- **Paying clients:** 0
- **Deployed URL:** [playground URL from Week 1]

---

## 🌐 Live URLs

- Landing: `rekaman.io` (not live — domain check pending)
- Dashboard: `dashboard.rekaman.io` (not live)
- API: `api.rekaman.io` (not live)
- CDN: `cdn.rekaman.io` (not live)
- SDK global: `window.Rekaman`
- GitHub: `github.com/[username]/rekaman` (private monorepo)

---

## ✅ Immediate Next Actions

1. **Register domain** — `namecheap.com` → `rekaman.io` (else `.co`, `.app`)
2. **Create GitHub repo** — `rekaman` private monorepo
3. **Scaffold monorepo** (see next Claude conversation for commands)
4. **Set up Neon account** — create project, save connection string
5. **Set up Railway account** — link GitHub, create "web" + "worker" services
6. **Set up Sentry** — create project, add DSN to playground first
7. **Week 2: WebXR tutorial** — pick up where Week 1 left off

---

## 📜 Core Principles (Never Violate)

1. **Multi-tenancy from line 1** — every query filters by brandId, enforced by middleware
2. **SDK is a public API forever** — `data-rk-*` attributes and `/v1/` URL are frozen
3. **One-way doors get careful thought; two-way doors ship fast**
4. **Boring tech on the critical path** — no experiments in production
5. **Modular boundaries now so extraction is easy later**
6. **Ship revenue before features** — Concierge MVP over perfect dashboard
7. **Measure before optimizing** — no premature caching/sharding/microservices
8. **Idempotent webhooks always** — every external event needs a dedup log

---

*Last updated: April 2026 | Version 3.0*
*Key shift from v2: Modular monolith architecture, SDK strategy clarified, revised roadmap with paying customer by Week 6.*
