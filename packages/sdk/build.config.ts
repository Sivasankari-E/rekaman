import * as esbuild from 'esbuild';
import { writeFileSync, mkdirSync, existsSync, rmSync, readFileSync } from 'fs';
import { gzipSync } from 'zlib';
import { join } from 'path';

const isWatch = process.argv.includes('--watch');
const isProd = process.env.NODE_ENV === 'production';

const outdir = 'dist';

const sharedConfig: esbuild.BuildOptions = {
  bundle: true,
  // ES2020 covers Chrome 80+, Safari 14+, Firefox 78+, Edge 80+ — our minimum support targets.
  // Listing browsers explicitly alongside es2020 confused esbuild into trying to downcompile
  // destructuring; a single target string sidesteps that.
  target: 'es2020',
  sourcemap: isProd ? false : 'linked',
  minify: isProd,
  treeShaking: true,
  legalComments: 'none',
  metafile: true,
  define: {
    'process.env.NODE_ENV': JSON.stringify(isProd ? 'production' : 'development'),
    __SDK_VERSION__: JSON.stringify(process.env.npm_package_version ?? '1.0.0'),
    __API_BASE__: JSON.stringify(
      process.env.SDK_API_BASE ?? 'http://localhost:3000',
    ),
    __CDN_BASE__: JSON.stringify(
      process.env.SDK_CDN_BASE ?? 'http://localhost:8080',
    ),
  },
};

// Main IIFE bundle — runs synchronously on every product page that includes <script src="sdk.js">.
// We deliberately DO NOT set `globalName` here. With globalName, esbuild emits
// `var Rekaman = (()=>{...})()` at top level which (in a non-module script)
// becomes window.Rekaman = exports, overwriting our manual `window.Rekaman = Rekaman`
// assignment in src/index.ts. Without globalName, the IIFE just runs side-effects
// and our manual assignment is the source of truth for the public API.
const mainBundle: esbuild.BuildOptions = {
  ...sharedConfig,
  entryPoints: ['src/index.ts'],
  outfile: join(outdir, 'sdk.js'),
  format: 'iife',
};

// Placement chunk — lazy-loaded via <script> tag injection on AR button tap.
// Format MUST be `iife` (not `esm`) so it can be loaded with a regular <script src=...>
// — bypasses the cross-origin module-fetch CORS quirks that caused production failures
// (Sentry incident May 2026 — "Failed to fetch dynamically imported module"). The chunk
// self-registers on window.__rkChunks.placement so the main bundle's ar-launcher can
// invoke it after load.
//
// Filename is versioned (`-v5`) and served with `Cache-Control: immutable`. ANY content
// change requires bumping the version — that's the contract that lets us cache forever
// at the edge. Version history:
//   v1: original ship (had dom-overlay bug — page text overlaid AR view)
//   v2: dom-overlay removed (clean camera-only AR view)
//   v3: API base baked in changed from `api-production-0a54.up.railway.app` to
//       `api.rekaman.io` (Week 5 custom domain). No semantic change.
//   v4: (Week 6 Day 1) two bug fixes for the brand demo:
//       — model now sits on the floor (wrap inner gltf.scene in a Group so the
//         centre+ground translation survives `setFromMatrixPosition`)
//       — model no longer follows the camera (call
//         `renderer.xr.setReferenceSpaceType('local-floor')` before setSession
//         so Three.js's scene uses the same reference space we hit-test in)
//   v5: (Week 7 Day 3, May 18 2026) real-world scale correctness for Coimbatore
//       in-person demos. Fixes Part A items 3, 4, 5, 7, 8 from
//       docs/ar-scale-correctness-spec.md:
//       — `computeRealWorldScale()` pure function: dimension priority
//         height → width → depth → fallback (longest native axis → 1.0 m)
//       — aspect-ratio sanity check fires `ar_scale_applied { aspectWarning }`
//         when a brand-provided 2nd dim is >25% off from native model aspect
//       — "approximate size" hint shown in overlay when no dims provided
//       — dom-overlay re-introduced with a DEDICATED small root (NOT
//         document.body, per v5.12) — small floating pill at the bottom with
//         − / Reset / + controls + size label ("76 cm" / "Approx. size")
//       — user resize clamped 0.25× – 4× (via the multiplier-on-top pattern)
//   v6: (Week 7 Day 3 evening, May 18 2026) UX hardening from founder's
//       real-Android-phone test of v5. Same-day follow-up, no semantic
//       change to the scale math or analytics:
//       — overlay pill hidden until first placement (reticle pre-placement,
//         pill post-placement; never overlap)
//       — surface-normal filter rejects non-horizontal hits (reticle won't
//         stick to walls/ceilings in placement mode; future wall-art mode
//         in Phase 3 will invert the threshold)
//       — visual polish: brand-purple Reset, hairline border, entrance
//         animation, haptic feedback on button tap
//   v7: (Week 7 Day 3 late evening, May 18 2026) finish the overlap fix —
//       v6 hid the pill pre-placement but the RETICLE remained visible
//       post-placement, so after first tap the two re-overlapped at the
//       bottom-center of the screen. v7 hides the reticle once a model is
//       placed (industry-standard single-placement-per-session pattern).
// Old SDK loaders keep loading the prior version from cache until their `sdk.js`
// (5 min browser cache) refreshes and routes them forward.
const placementChunk: esbuild.BuildOptions = {
  ...sharedConfig,
  entryPoints: ['src/chunks/placement-engine.ts'],
  outfile: join(outdir, 'placement-engine-v7.js'),
  format: 'iife',
};

// FUTURE — when Phase 3 lands, append:
//   - faceTryonChunk:  src/chunks/face-tryon-engine.ts  → face-tryon-engine-v1.js
//   - wristTryonChunk: src/chunks/wrist-tryon-engine.ts → wrist-tryon-engine-v1.js

const allBundles = [mainBundle, placementChunk];

function fmtKB(bytes: number) {
  return (bytes / 1024).toFixed(1) + ' KB';
}

function reportSize(label: string, file: string) {
  const buf = readFileSync(file);
  const raw = buf.length;
  const gzipped = gzipSync(buf, { level: 9 }).length;
  console.log(`  ${label}: ${fmtKB(raw)} raw / ${fmtKB(gzipped)} gzipped`);
  return { raw, gzipped };
}

// Per CLAUDE.md → SDK Philosophy: "Main bundle ≤ 50KB gzipped"
const MAIN_GZIP_BUDGET_BYTES = 50 * 1024;

async function buildOnce() {
  // Clean dist for a fresh, deterministic output every build
  if (existsSync(outdir)) rmSync(outdir, { recursive: true, force: true });
  mkdirSync(outdir, { recursive: true });

  const mainResult = await esbuild.build(mainBundle);
  const placementResult = await esbuild.build(placementChunk);

  console.log('\n✅ SDK build complete:');
  const mainSize = reportSize(
    'sdk.js (main bundle, runs on every page)',
    join(outdir, 'sdk.js'),
  );
  const chunkSize = reportSize(
    'placement-engine-v7.js (lazy chunk)',
    join(outdir, 'placement-engine-v7.js'),
  );

  if (mainSize.gzipped > MAIN_GZIP_BUDGET_BYTES) {
    console.warn(
      `\n⚠️  Main bundle (${fmtKB(mainSize.gzipped)} gzipped) exceeds the ` +
        `${fmtKB(MAIN_GZIP_BUDGET_BYTES)} budget defined in CLAUDE.md. ` +
        'Move feature code into a lazy chunk.',
    );
  }

  const manifest = {
    version: process.env.npm_package_version ?? '1.0.0',
    builtAt: new Date().toISOString(),
    builtFor: isProd ? 'production' : 'development',
    bundles: {
      'sdk.js': { ...mainSize, metafile: mainResult.metafile },
      'placement-engine-v7.js': { ...chunkSize, metafile: placementResult.metafile },
    },
  };
  writeFileSync(join(outdir, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

async function watchAll() {
  if (existsSync(outdir)) rmSync(outdir, { recursive: true, force: true });
  mkdirSync(outdir, { recursive: true });

  const contexts = await Promise.all(
    allBundles.map((opts) => esbuild.context(opts)),
  );
  await Promise.all(contexts.map((ctx) => ctx.watch()));
  console.log('👀 Watching for changes (main bundle + chunks)...');
}

if (isWatch) {
  await watchAll();
} else {
  await buildOnce();
}
