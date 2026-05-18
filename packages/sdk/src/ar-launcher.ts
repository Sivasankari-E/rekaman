import type { ProductData } from './api-client.js';

// __CDN_BASE__ is declared globally in src/globals.d.ts.

// Chunks register themselves on this object when loaded via <script> tag.
// Using script-tag injection instead of dynamic import() because cross-origin
// module imports from third-party brand sites hit CORS quirks across browsers
// (especially Brave, mobile webviews, and CDNs missing OPTIONS preflight).
// Regular script tags are exempt from CORS — they just work everywhere.
declare global {
  interface Window {
    __rkChunks?: {
      placement?: { startPlacementAR: (product: ProductData) => Promise<void> };
      // Future:
      // tryonFace?: { startFaceTryOn: (product: ProductData) => Promise<void> };
    };
  }
}

/**
 * Tag the SDK adds to `ar_session_started` telemetry so the dashboard can
 * see how often iOS users get the native-USDZ path vs the GLB fallback.
 * A high `glb-fallback` rate per-brand means that brand has products
 * generated before the v5.15 USDZ pipeline and should be regenerated.
 */
export type IosQuickLookFormat = 'usdz' | 'glb-fallback';

/**
 * Open Apple's AR Quick Look. Prefers USDZ (native, reliable across all
 * supported iOS versions) and falls back to GLB only when usdzUrl is null
 * (pre-v5.15 products or Meshy soft-fails). The GLB path triggers Apple's
 * built-in GLB decoder which is documented as flaky pre-iOS-17.4 (the
 * v5.14 "black flash" symptom).
 *
 * Returns which format was actually launched so callers can fire telemetry.
 */
export function launchIosQuickLook(product: ProductData): IosQuickLookFormat {
  // Prefer Apple-native USDZ; fall back to GLB if usdzUrl is null.
  const iosHref = product.usdzUrl ?? product.glbUrl;
  if (!iosHref) {
    throw new Error('No USDZ or GLB URL available for AR Quick Look');
  }

  const link = document.createElement('a');
  link.setAttribute('rel', 'ar');
  link.setAttribute('href', iosHref);

  // QuickLook requires an <img> child to actually trigger
  const img = document.createElement('img');
  img.style.display = 'none';
  link.appendChild(img);

  document.body.appendChild(link);
  link.click();
  setTimeout(() => link.remove(), 100);

  return product.usdzUrl ? 'usdz' : 'glb-fallback';
}

const loadingChunks = new Map<string, Promise<void>>();

/**
 * Load a chunk via <script> tag injection. Idempotent — if the chunk is already
 * loading, returns the same in-flight promise. If already loaded, returns a
 * resolved promise.
 */
function loadChunk(filename: string): Promise<void> {
  const existing = loadingChunks.get(filename);
  if (existing) return existing;

  const url = `${__CDN_BASE__}/v1/${filename}`;
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadingChunks.delete(filename); // allow retry on next attempt
      reject(new Error(`Failed to load chunk: ${url}`));
    };
    document.head.appendChild(script);
  });
  loadingChunks.set(filename, promise);
  return promise;
}

/**
 * Lazy-load the right engine chunk based on product.arMode.
 * Each chunk is a separate file at cdn.rekaman.io/v1/<chunk>-v1.js.
 *
 * This is the ONE place that knows the mapping from arMode → chunk filename.
 * Adding a new mode in Phase 3+ = adding one case here + shipping a new chunk.
 */
export async function launchArExperience(product: ProductData): Promise<void> {
  switch (product.arMode) {
    case 'placement': {
      // v5 — Week 7 Day 3 real-world scale correctness (Coimbatore-readiness):
      //   • dimension-priority scaling (height → width → depth → 1m fallback)
      //   • aspect-ratio sanity check → `ar_scale_applied { aspectWarning }`
      //   • dom-overlay with dedicated small root (NOT document.body, per
      //     v5.12) — − / Reset / + controls + size label ("76 cm" / "Approx.")
      //   • user resize clamped 0.25× – 4× via multiplier-on-top pattern
      // v4 — Week 6 Day 1 fixes for the brand demo:
      //   • model now sits on the floor (Group-wrapper preserves the
      //     ground-correction across `setFromMatrixPosition` placement)
      //   • model no longer follows the camera
      //     (`renderer.xr.setReferenceSpaceType('local-floor')` aligns
      //     Three.js's scene frame with the hit-test reference space)
      // Older versions (v1, v2, v3, v4) remain in S3 as fallbacks for any SDK
      // still cached on a brand site that hasn't refreshed its sdk.js yet
      // (5-min browser cache, 24-hr edge cache).
      await loadChunk('placement-engine-v5.js');
      const api = window.__rkChunks?.placement;
      if (!api?.startPlacementAR) {
        throw new Error('placement chunk did not register on window.__rkChunks.placement');
      }
      await api.startPlacementAR(product);
      break;
    }

    // FUTURE — Phase 3:
    // case 'tryon-face': {
    //   await loadChunk('face-tryon-engine-v1.js');
    //   const api = window.__rkChunks?.tryonFace;
    //   if (!api?.startFaceTryOn) throw new Error('face-tryon chunk did not register');
    //   await api.startFaceTryOn(product);
    //   break;
    // }

    default:
      throw new Error(`Unsupported arMode: ${product.arMode}`);
  }
}
