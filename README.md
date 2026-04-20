# Rekaman

> Capture products. Place them anywhere.

A SaaS platform that lets any e-commerce brand add "View in your room" AR to their product pages in under 20 minutes — no 3D artists needed.

## Structure

- `apps/dashboard` — Brand dashboard (Next.js, Vercel)
- `apps/landing` — Marketing site (Next.js, Vercel)
- `packages/sdk` — Embeddable JS SDK (esbuild → CloudFront)
- `packages/ar-engine` — Shared Three.js + WebXR logic
- `packages/shared-types` — Types shared across all apps
- `server` — Node.js + Express API + worker (Railway)

## Development

```bash
pnpm install
pnpm dev
```

## Architecture

See `CLAUDE.md` for full project context, locked decisions, and roadmap.
