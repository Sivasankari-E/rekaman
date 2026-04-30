import type { ProductData } from './api-client.js';

// __CDN_BASE__ is declared globally in src/globals.d.ts.

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

/**
 * Lazy-load the right engine chunk based on product.arMode.
 * Each chunk is a separate file at cdn.rekaman.io/v1/<chunk>-v1.js.
 *
 * This is the ONE place that knows the mapping from arMode → chunk URL.
 * Adding a new mode in Phase 3+ = adding one case here.
 */
export async function launchArExperience(product: ProductData): Promise<void> {
  switch (product.arMode) {
    case 'placement': {
      const chunkUrl = `${__CDN_BASE__}/v1/placement-engine-v1.js`;
      const mod = (await import(/* @vite-ignore */ chunkUrl)) as {
        startPlacementAR: (product: ProductData) => Promise<void>;
      };
      await mod.startPlacementAR(product);
      break;
    }

    // FUTURE — Phase 3:
    // case 'tryon-face': {
    //   const mod = await import(`${__CDN_BASE__}/v1/face-tryon-engine-v1.js`);
    //   await mod.startFaceTryOn(product);
    //   break;
    // }

    default:
      throw new Error(`Unsupported arMode: ${product.arMode}`);
  }
}
