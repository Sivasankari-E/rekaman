import { fetchProduct, type ProductData } from './api-client.js';
import { initAnalytics, track } from './analytics.js';
import { detectPlatform, type Platform } from './platform-detect.js';
import { launchIosQuickLook, launchArExperience, launchProductViewer3D } from './ar-launcher.js';
import { injectButton } from './ui.js';

// __SDK_VERSION__ is declared globally in src/globals.d.ts.

interface MountedInstance {
  container: HTMLElement;
  apiKey: string;
  productSlug: string;
  product: ProductData | null;
  // v5.20: in-flight product fetch. Used by handleButtonClick when the
  // shopper taps the button before the fetch has resolved — instead of the
  // tap being a silent no-op (v5.19 behaviour), we await this and proceed.
  productPromise: Promise<ProductData> | null;
  platform: Platform | null;
  buttonHandle: ReturnType<typeof injectButton> | null;
}

const instances: MountedInstance[] = [];

async function mount(container: HTMLElement) {
  const apiKey = container.dataset.rkKey;
  const productSlug = container.dataset.rkProduct;

  if (!apiKey || !productSlug) {
    console.warn('[Rekaman] missing data-rk-key or data-rk-product on element', container);
    return;
  }

  // Avoid double-mount if scan() runs again (DOMContentLoaded + load + manual scan)
  if (container.hasAttribute('data-rk-mounted')) return;
  container.setAttribute('data-rk-mounted', 'true');

  const instance: MountedInstance = {
    container,
    apiKey,
    productSlug,
    product: null,
    productPromise: null,
    platform: null,
    buttonHandle: null,
  };
  instances.push(instance);

  initAnalytics(apiKey);

  // v5.20 (May 18 evening) — paint the button IMMEDIATELY after platform
  // detect (~50 ms), don't wait for the product fetch. The earlier "wait for
  // product to avoid flicker" approach was correct for the multi-arMode
  // future, but in Phase 1 reality: 100% of shipped products are 'placement'
  // mode, so the default "View in your room" label IS the correct final
  // label in 100% of cases — there's nothing to flicker INTO. Brand owners
  // on real-world 4G were seeing the button take 1-3 seconds to appear on
  // product pages, perceiving the integration as broken. The new flow:
  //
  //   1. platformPromise resolves (~50 ms) → inject button with default
  //      label, enabled, ready to tap
  //   2. productPromise resolves (200 ms - 3 s) in the background → if the
  //      product's arMode generates a different label (Phase 3 try-on
  //      modes — not shipped today), call setLabel() to update. For
  //      placement mode, no-op.
  //   3. If the shopper taps before productPromise resolves, handleButtonClick
  //      shows a loading spinner on the button (via setLoading) and awaits
  //      the still-pending fetch. From the shopper's POV: button appeared
  //      fast, they tapped, AR loaded normally. No "broken-looking" wait.
  //
  // Both promises still race in parallel so total time-to-AR is bounded by
  // the slower of the two, never their sum.
  const platformPromise = detectPlatform();
  const productPromise = fetchProduct(apiKey, productSlug).then(
    (p) => { instance.product = p; return p; },
    (err) => {
      track('ar_error', {
        productSlug,
        payload: { message: (err as Error).message, phase: 'init-fetch' },
      });
      throw err;
    },
  );
  // Surface the in-flight promise so handleButtonClick can await it if the
  // user taps before the fetch resolves.
  instance.productPromise = productPromise;

  try {
    const platform = await platformPromise;
    instance.platform = platform;

    if (platform === 'unsupported') {
      // Don't show button on devices that can't do AR. Still await the product
      // so we can fire ar_supported telemetry with arMode (helps us understand
      // which arModes get blocked by which platforms).
      try {
        const product = await productPromise;
        track('ar_supported', { productSlug, arMode: product.arMode, payload: { platform } });
      } catch {
        // ar_error already fired by the productPromise .then(reject) above.
      }
      return;
    }

    // Inject IMMEDIATELY. Default label = placement-mode label = correct for
    // 100% of today's products. setLabel below only fires if a future try-on
    // product is mounted (Phase 3) — for placement, it's a no-op.
    instance.buttonHandle = injectButton(container, {
      label: getButtonLabel('placement'),
      onClick: () => handleButtonClick(instance),
      // v5.21 — secondary "View in 3D" button. Available on all platforms
      // (iOS / Android / desktop) — anywhere WebGL works, which is everywhere
      // shoppers actually browse from. The 3D viewer chunk handles its own
      // overlay UI; this button just routes a tap into the chunk.
      secondary: {
        label: 'View in 3D',
        onClick: () => handle3DButtonClick(instance),
      },
    });

    // Continue resolving the product in the background. When it lands:
    //   • apply the brand theme (button colours + radius) — no-op for brands
    //     with no theme set (resolves to Rekaman defaults, already showing);
    //   • update the label if the brand set a custom one OR a non-placement
    //     mode needs a different default.
    // Errors are already tracked by the .then(reject) above; bail silently.
    productPromise
      .then((product) => {
        track('ar_supported', { productSlug, arMode: product.arMode, payload: { platform } });

        // Theme — brands with a custom palette get their colours; brands
        // without stay Rekaman-purple. Brief recolour on slow networks
        // (button paints before this resolves) is acceptable per v5.20.
        instance.buttonHandle?.setTheme(product.brand.theme ?? null);

        // Label precedence: brand's explicit buttonLabel override wins,
        // else the per-arMode default. Only call setLabel if it differs
        // from what's already painted ("View in your room").
        const desiredLabel =
          product.brand.theme?.buttonLabel ?? getButtonLabel(product.arMode);
        if (desiredLabel !== getButtonLabel('placement')) {
          instance.buttonHandle?.setLabel(desiredLabel);
        }
      })
      .catch(() => {
        // Already tracked. The button stays visible but tap will fail — that
        // failure will fire ar_error from handleButtonClick.
      });
  } catch (err) {
    track('ar_error', {
      productSlug,
      payload: { message: (err as Error).message, phase: 'init' },
    });
    console.warn('[Rekaman] failed to initialize', err);
  }
}

function getButtonLabel(arMode: string): string {
  switch (arMode) {
    case 'placement': return 'View in your room';
    case 'tryon-face': return 'Try on';
    case 'tryon-wrist': return 'Try on wrist';
    case 'tryon-hand': return 'Try on';
    case 'tryon-photo': return 'Try on yourself';
    default: return 'View in AR';
  }
}

async function handleButtonClick(instance: MountedInstance) {
  if (!instance.platform) return;

  // v5.20 — the button paints before the product fetch resolves (so it
  // appears instantly on slow networks). If the user taps before then, show
  // a loading spinner and await the in-flight promise. We delay the
  // `ar_button_tapped` event until the product is loaded so it carries the
  // correct arMode; an `earlyTap` flag in the payload tells the dashboard
  // the shopper out-paced our fetch.
  const earlyTap = !instance.product;
  if (earlyTap) {
    if (!instance.productPromise) return;
    instance.buttonHandle?.setLoading(true);
    try {
      await instance.productPromise;
    } catch {
      // ar_error already tracked by the initial .then(reject) wrapper. Reset
      // loading + bail; nothing else to do without product data.
      instance.buttonHandle?.setLoading(false);
      return;
    }
    if (!instance.product) {
      instance.buttonHandle?.setLoading(false);
      return;
    }
    // Fall through with `instance.product` now populated; setLoading(true)
    // below keeps the spinner visible through the AR launch.
  }

  // Capture into a local const so TS flow analysis sees `product` as
  // non-null through the rest of the function (we already returned above
  // if it would have been null after await).
  const product = instance.product!;

  track('ar_button_tapped', {
    productSlug: instance.productSlug,
    arMode: product.arMode,
    payload: earlyTap ? { earlyTap: true } : undefined,
  });
  instance.buttonHandle?.setLoading(true);

  try {
    if (instance.platform === 'ios-quicklook') {
      // launchIosQuickLook returns which format Apple actually got
      // (usdz vs glb-fallback). Capture it in telemetry so the dashboard
      // can flag brands whose products predate the v5.15 USDZ pipeline
      // and need regeneration — high `glb-fallback` rate = broken iOS UX.
      const iosFormat = launchIosQuickLook(product);
      track('ar_session_started', {
        productSlug: instance.productSlug,
        arMode: product.arMode,
        payload: { platform: 'ios-quicklook', format: iosFormat },
      });
    } else if (instance.platform === 'webxr') {
      track('ar_session_started', {
        productSlug: instance.productSlug,
        arMode: product.arMode,
        payload: { platform: 'webxr' },
      });
      await launchArExperience(product);
    }
  } catch (err) {
    track('ar_error', {
      productSlug: instance.productSlug,
      payload: { message: (err as Error).message, phase: 'launch' },
    });
    console.warn('[Rekaman] launch failed', err);
  } finally {
    instance.buttonHandle?.setLoading(false);
  }
}

/**
 * Secondary entry-point — "View in 3D". Same early-tap awaiting pattern as
 * handleButtonClick so the tap isn't a silent no-op if the user is faster
 * than the product fetch on slow 4G.
 *
 * Unlike the AR entry-point, the 3D viewer doesn't need platform detection
 * — WebGL is available everywhere shoppers actually browse. We still wait
 * for the product fetch so we have the GLB URL.
 */
async function handle3DButtonClick(instance: MountedInstance) {
  const earlyTap = !instance.product;
  if (earlyTap) {
    if (!instance.productPromise) return;
    instance.buttonHandle?.setSecondaryLoading(true);
    try {
      await instance.productPromise;
    } catch {
      instance.buttonHandle?.setSecondaryLoading(false);
      return;
    }
    if (!instance.product) {
      instance.buttonHandle?.setSecondaryLoading(false);
      return;
    }
  }

  const product = instance.product!;

  track('viewer_3d_button_tapped', {
    productSlug: instance.productSlug,
    arMode: product.arMode,
    payload: earlyTap ? { earlyTap: true } : undefined,
  });
  instance.buttonHandle?.setSecondaryLoading(true);

  try {
    await launchProductViewer3D(product);
  } catch (err) {
    track('viewer_3d_error', {
      productSlug: instance.productSlug,
      payload: { message: (err as Error).message, phase: 'launch' },
    });
    console.warn('[Rekaman] 3D viewer launch failed', err);
  } finally {
    instance.buttonHandle?.setSecondaryLoading(false);
  }
}

function scan() {
  const elements = document.querySelectorAll<HTMLElement>(
    '[data-rk-product][data-rk-key]:not([data-rk-mounted])',
  );
  elements.forEach((el) => mount(el));
}

const Rekaman = {
  version: __SDK_VERSION__,
  scan,
  __instances: instances,
} as const;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scan);
} else {
  scan();
}
window.addEventListener('load', scan);

// Public API — the SDK's IIFE format in build.config.ts has no `globalName`,
// so this manual assignment is the ONLY source of window.Rekaman.
(window as unknown as { Rekaman: typeof Rekaman }).Rekaman = Rekaman;
