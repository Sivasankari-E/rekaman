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

export function launchIosQuickLook(product: ProductData): void {
  if (!product.glbUrl) {
    throw new Error('No GLB URL available for AR Quick Look');
  }

  const link = document.createElement('a');
  link.setAttribute('rel', 'ar');
  link.setAttribute('href', product.glbUrl);

  // QuickLook requires an <img> child to actually trigger
  const img = document.createElement('img');
  img.style.display = 'none';
  link.appendChild(img);

  document.body.appendChild(link);
  link.click();
  setTimeout(() => link.remove(), 100);
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
      // v3 — API base updated to api.rekaman.io (Week 5 custom domain).
      // Older versions (v1, v2) left in S3 as fallbacks for any SDK still
      // cached on a brand site that hasn't refreshed its sdk.js yet
      // (5-min browser cache, 24-hr edge cache).
      await loadChunk('placement-engine-v3.js');
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
