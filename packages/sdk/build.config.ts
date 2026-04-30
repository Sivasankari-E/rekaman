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

// Main IIFE bundle — runs synchronously on every product page that includes <script src="sdk.js">
const mainBundle: esbuild.BuildOptions = {
  ...sharedConfig,
  entryPoints: ['src/index.ts'],
  outfile: join(outdir, 'sdk.js'),
  format: 'iife',
  globalName: 'Rekaman',
};

// Placement chunk — lazy-loaded on AR button tap (Phase 1)
const placementChunk: esbuild.BuildOptions = {
  ...sharedConfig,
  entryPoints: ['src/chunks/placement-engine.ts'],
  outfile: join(outdir, 'placement-engine-v1.js'),
  format: 'esm',
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
    'placement-engine-v1.js (lazy chunk)',
    join(outdir, 'placement-engine-v1.js'),
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
      'placement-engine-v1.js': { ...chunkSize, metafile: placementResult.metafile },
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
