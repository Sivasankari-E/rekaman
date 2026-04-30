/**
 * Compile-time constants injected by esbuild's `define` (see build.config.ts).
 * These are NOT runtime variables — they get string-substituted at build time
 * so the bundled output has hardcoded values (zero runtime cost, tree-shakable).
 */

declare const __SDK_VERSION__: string;
declare const __API_BASE__: string;
declare const __CDN_BASE__: string;
